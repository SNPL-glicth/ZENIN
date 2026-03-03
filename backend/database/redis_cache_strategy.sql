-- ============================================================================
-- Redis Cache Strategy for ZENIN Backend
-- ============================================================================
-- Estrategia de cache para minimizar queries a PostgreSQL
-- Backend .NET usa Redis como cache L1, PostgreSQL como source of truth
-- ============================================================================

-- ============================================================================
-- CACHE KEYS STRUCTURE
-- ============================================================================

/*
Estructura de keys en Redis:

zenin:{tenant_id}:series:latest:{series_id}          → SeriesLatest
zenin:{tenant_id}:series:profile:{series_id}         → SeriesProfile
zenin:{tenant_id}:dashboard:summary                  → DashboardSummary
zenin:{tenant_id}:anomalies:active                   → List<ActiveAnomaly>
zenin:{tenant_id}:predictions:latest:{series_id}     → LatestPrediction
zenin:{tenant_id}:health:latest                      → SystemHealth

Ejemplo:
zenin:00000000-0000-0000-0000-000000000001:series:latest:abc123
*/

-- ============================================================================
-- CACHE TTL (Time To Live) STRATEGY
-- ============================================================================

/*
┌─────────────────────────────────┬─────────┬──────────────────────────┐
│ Cache Key                        │ TTL     │ Invalidación             │
├─────────────────────────────────┼─────────┼──────────────────────────┤
│ series:latest:{series_id}        │ 5s      │ On new data point        │
│ series:profile:{series_id}       │ 1h      │ On profile recomputation │
│ dashboard:summary                │ 5min    │ On materialized view     │
│                                  │         │ refresh                  │
│ anomalies:active                 │ 10s     │ On new anomaly           │
│ predictions:latest:{series_id}   │ 30s     │ On new prediction        │
│ health:latest                    │ 30s     │ On health update         │
└─────────────────────────────────┴─────────┴──────────────────────────┘

Rationale:
- series:latest: 5s TTL porque se actualiza frecuentemente (cada data point)
- series:profile: 1h TTL porque se recomputa cada hora
- dashboard:summary: 5min TTL porque materialized view se refresca cada 5min
- anomalies:active: 10s TTL porque son críticas pero no ultra-frecuentes
- predictions:latest: 30s TTL porque se generan cada ~1min
- health:latest: 30s TTL porque se actualiza cada ciclo del orchestrator
*/

-- ============================================================================
-- CACHE INVALIDATION TRIGGERS (PostgreSQL)
-- ============================================================================

-- Función para invalidar cache en Redis (llamada desde triggers)
CREATE OR REPLACE FUNCTION zenin_core.invalidate_redis_cache(
    cache_key TEXT
) RETURNS void AS $$
BEGIN
    -- Esta función será llamada por triggers
    -- En producción, usar pg_notify para notificar al backend
    PERFORM pg_notify('cache_invalidation', cache_key);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Invalidar cache cuando se actualiza series_latest
CREATE OR REPLACE FUNCTION zenin_read.trigger_invalidate_series_latest()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM zenin_core.invalidate_redis_cache(
        'zenin:' || NEW.tenant_id::text || ':series:latest:' || NEW.series_id::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_series_latest
AFTER INSERT OR UPDATE ON zenin_read.series_latest
FOR EACH ROW
EXECUTE FUNCTION zenin_read.trigger_invalidate_series_latest();

-- Trigger: Invalidar cache cuando se actualiza series_profiles
CREATE OR REPLACE FUNCTION zenin_read.trigger_invalidate_series_profile()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM zenin_core.invalidate_redis_cache(
        'zenin:' || NEW.tenant_id::text || ':series:profile:' || NEW.series_id::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_series_profile
AFTER INSERT OR UPDATE ON zenin_read.series_profiles
FOR EACH ROW
EXECUTE FUNCTION zenin_read.trigger_invalidate_series_profile();

-- Trigger: Invalidar cache cuando se actualiza active_anomalies
CREATE OR REPLACE FUNCTION zenin_read.trigger_invalidate_active_anomalies()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM zenin_core.invalidate_redis_cache(
        'zenin:' || NEW.tenant_id::text || ':anomalies:active'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_active_anomalies
AFTER INSERT OR UPDATE OR DELETE ON zenin_read.active_anomalies
FOR EACH ROW
EXECUTE FUNCTION zenin_read.trigger_invalidate_active_anomalies();

-- ============================================================================
-- CACHE WARMING QUERIES (Para pre-cargar cache)
-- ============================================================================

-- Query para pre-cargar series_latest en cache (ejecutar al inicio)
CREATE OR REPLACE FUNCTION zenin_read.warm_cache_series_latest(
    p_tenant_id UUID
) RETURNS TABLE (
    series_id UUID,
    cache_key TEXT,
    data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.series_id,
        'zenin:' || p_tenant_id::text || ':series:latest:' || sl.series_id::text AS cache_key,
        jsonb_build_object(
            'seriesId', sl.series_id,
            'tenantId', sl.tenant_id,
            'latestValue', sl.latest_value,
            'latestTimestamp', sl.latest_timestamp,
            'previousValue', sl.previous_value,
            'previousTimestamp', sl.previous_timestamp,
            'delta', sl.delta,
            'deltaPercentage', sl.delta_percentage,
            'updatedAt', sl.updated_at
        ) AS data
    FROM zenin_read.series_latest sl
    WHERE sl.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Query para pre-cargar dashboard summary en cache
CREATE OR REPLACE FUNCTION zenin_read.warm_cache_dashboard_summary(
    p_tenant_id UUID
) RETURNS TABLE (
    cache_key TEXT,
    data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'zenin:' || p_tenant_id::text || ':dashboard:summary' AS cache_key,
        jsonb_build_object(
            'tenantId', ds.tenant_id,
            'totalSeries', ds.total_series,
            'activeSeries', ds.active_series,
            'seriesWithAnomalies', ds.series_with_anomalies,
            'avgSeriesMean', ds.avg_series_mean,
            'lastDataPointAt', ds.last_data_point_at
        ) AS data
    FROM zenin_read.mv_dashboard_summary ds
    WHERE ds.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MONITORING: Cache Hit Ratio
-- ============================================================================

-- View para monitorear cache hit ratio (requiere Redis MONITOR)
-- Esta query se ejecuta desde el backend .NET
CREATE OR REPLACE VIEW zenin_audit.cache_statistics AS
SELECT 
    'PostgreSQL Table Cache' AS cache_type,
    sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) AS hit_ratio,
    sum(heap_blks_hit) AS hits,
    sum(heap_blks_read) AS misses
FROM pg_statio_user_tables
WHERE schemaname IN ('zenin_read', 'zenin_ml')
UNION ALL
SELECT 
    'PostgreSQL Index Cache' AS cache_type,
    sum(idx_blks_hit) / nullif(sum(idx_blks_hit) + sum(idx_blks_read), 0) AS hit_ratio,
    sum(idx_blks_hit) AS hits,
    sum(idx_blks_read) AS misses
FROM pg_statio_user_indexes
WHERE schemaname IN ('zenin_read', 'zenin_ml');

-- ============================================================================
-- CACHE EVICTION POLICY
-- ============================================================================

/*
Redis Configuration (redis.conf):

maxmemory 256mb
maxmemory-policy allkeys-lru

Rationale:
- allkeys-lru: Evict least recently used keys when memory limit reached
- 256MB: Suficiente para ~100K series con cache de 5 segundos

Alternativas:
- volatile-lru: Solo evict keys con TTL (más seguro)
- allkeys-lfu: Evict least frequently used (mejor para patrones estables)
*/

-- ============================================================================
-- CACHE PATTERNS (Para implementar en Backend .NET)
-- ============================================================================

/*
Pattern 1: Cache-Aside (Lazy Loading)
--------------------------------------
1. Check Redis cache
2. If HIT → return cached data
3. If MISS → query PostgreSQL
4. Store in Redis with TTL
5. Return data

Ejemplo C#:
```csharp
public async Task<SeriesLatest> GetSeriesLatestAsync(Guid seriesId)
{
    var cacheKey = $"zenin:{_tenantId}:series:latest:{seriesId}";
    
    // 1. Try cache
    var cached = await _cache.GetStringAsync(cacheKey);
    if (cached != null)
    {
        return JsonSerializer.Deserialize<SeriesLatest>(cached);
    }
    
    // 2. Query database
    var data = await _context.SeriesLatest
        .FirstOrDefaultAsync(sl => sl.SeriesId == seriesId);
    
    // 3. Store in cache
    await _cache.SetStringAsync(cacheKey, 
        JsonSerializer.Serialize(data),
        new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(5) }
    );
    
    return data;
}
```

Pattern 2: Write-Through (Para Orchestrator Python)
----------------------------------------------------
1. Write to PostgreSQL
2. Immediately update Redis cache
3. Return success

Ejemplo Python:
```python
def update_series_latest(series_id, latest_value, timestamp):
    # 1. Write to PostgreSQL
    conn.execute("""
        INSERT INTO zenin_read.series_latest (series_id, latest_value, latest_timestamp)
        VALUES (%s, %s, %s)
        ON CONFLICT (series_id) DO UPDATE ...
    """, (series_id, latest_value, timestamp))
    
    # 2. Update Redis cache
    cache_key = f"zenin:{tenant_id}:series:latest:{series_id}"
    redis_client.setex(
        cache_key,
        5,  # TTL 5 seconds
        json.dumps({
            'seriesId': series_id,
            'latestValue': latest_value,
            'latestTimestamp': timestamp.isoformat()
        })
    )
```

Pattern 3: Cache Invalidation (Via PostgreSQL NOTIFY)
------------------------------------------------------
1. PostgreSQL trigger fires on UPDATE
2. pg_notify sends message to channel 'cache_invalidation'
3. Backend .NET listens to channel
4. Backend deletes cache key from Redis

Ejemplo C# (Listener):
```csharp
await using var conn = new NpgsqlConnection(_connectionString);
await conn.OpenAsync();
conn.Notification += (sender, args) =>
{
    if (args.Channel == "cache_invalidation")
    {
        var cacheKey = args.Payload;
        _cache.RemoveAsync(cacheKey);
    }
};
await using var cmd = new NpgsqlCommand("LISTEN cache_invalidation", conn);
await cmd.ExecuteNonQueryAsync();
```
*/

-- ============================================================================
-- CACHE PRELOADING (Ejecutar al inicio del backend)
-- ============================================================================

-- Script para pre-cargar cache al iniciar backend
-- Ejecutar desde backend .NET al startup

/*
C# Startup Code:
```csharp
public async Task PreloadCacheAsync(Guid tenantId)
{
    // 1. Preload series_latest
    var seriesLatest = await _context.Database
        .SqlQueryRaw<CacheWarmupResult>($@"
            SELECT * FROM zenin_read.warm_cache_series_latest({tenantId})
        ")
        .ToListAsync();
    
    foreach (var item in seriesLatest)
    {
        await _cache.SetStringAsync(
            item.CacheKey,
            item.Data,
            new DistributedCacheEntryOptions { 
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(5) 
            }
        );
    }
    
    // 2. Preload dashboard summary
    var dashboardSummary = await _context.Database
        .SqlQueryRaw<CacheWarmupResult>($@"
            SELECT * FROM zenin_read.warm_cache_dashboard_summary({tenantId})
        ")
        .FirstOrDefaultAsync();
    
    if (dashboardSummary != null)
    {
        await _cache.SetStringAsync(
            dashboardSummary.CacheKey,
            dashboardSummary.Data,
            new DistributedCacheEntryOptions { 
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) 
            }
        );
    }
}
```
*/

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
1. REDIS CONFIGURATION:
   - maxmemory: 256MB (ajustar según disponibilidad)
   - maxmemory-policy: allkeys-lru
   - appendonly: yes (persistencia)
   
2. MONITORING:
   - Revisar cache hit ratio diariamente (debe ser > 95%)
   - Monitorear Redis memory usage
   - Alertar si cache hit ratio < 90%
   
3. INVALIDATION:
   - Usar PostgreSQL NOTIFY para invalidación en tiempo real
   - Fallback: TTL automático si NOTIFY falla
   
4. PERFORMANCE:
   - Cache-aside para reads (lazy loading)
   - Write-through para writes críticos (Orchestrator)
   - Preload cache al startup del backend
   
5. SCALING:
   - Si Redis se queda sin memoria, aumentar maxmemory
   - Si cache hit ratio < 90%, aumentar TTLs
   - Si latencia alta, considerar Redis Cluster
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
