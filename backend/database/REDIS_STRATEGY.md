# ZENIN - Redis Caching Strategy

## Overview

Redis actúa como capa de cache L1 para datos de alta frecuencia y eventos en tiempo real.

---

## 1. Cache Keys Structure

### Naming Convention
```
zenin:{tenant_id}:{entity}:{id}:{field}
```

### Examples
```
zenin:550e8400:series:latest:a1b2c3d4
zenin:550e8400:prediction:cache:a1b2c3d4
zenin:550e8400:anomaly:recent:a1b2c3d4
```

---

## 2. Cached Entities

### 2.1 Latest Series Values (Hot Path)
**Key Pattern:** `zenin:{tenant_id}:series:latest:{series_id}`

**Structure:**
```json
{
  "value": 23.45,
  "timestamp": "2026-03-03T15:00:00Z",
  "quality_score": 1.0
}
```

**TTL:** 300 seconds (5 min)  
**Invalidation:** On new data point insert  
**Use Case:** Dashboard real-time displays, API queries

---

### 2.2 Series Profiles (Warm Path)
**Key Pattern:** `zenin:{tenant_id}:profile:{series_id}`

**Structure:**
```json
{
  "mean": 22.5,
  "std_dev": 1.2,
  "volatility_level": "low",
  "regime": "stable",
  "last_computed_at": "2026-03-03T14:00:00Z"
}
```

**TTL:** 3600 seconds (1 hour)  
**Invalidation:** On profile recomputation  
**Use Case:** ML engine initialization, pattern detection

---

### 2.3 Recent Predictions (Hot Path)
**Key Pattern:** `zenin:{tenant_id}:predictions:recent:{series_id}`

**Structure:** Sorted Set (ZSET)
```
ZADD zenin:tenant:predictions:recent:series123 
  1709481600 "prediction_json_1"
  1709481660 "prediction_json_2"
```

**TTL:** 1800 seconds (30 min)  
**Max Members:** 100 (keep last 100 predictions)  
**Use Case:** Trend analysis, dashboard charts

---

### 2.4 Active Anomalies (Hot Path)
**Key Pattern:** `zenin:{tenant_id}:anomalies:active`

**Structure:** Hash
```
HSET zenin:tenant:anomalies:active
  series_a1b2 '{"score": 0.95, "severity": "critical", "detected_at": "..."}'
  series_c3d4 '{"score": 0.72, "severity": "medium", "detected_at": "..."}'
```

**TTL:** None (persist until acknowledged)  
**Invalidation:** On anomaly acknowledgment  
**Use Case:** Alert dashboard, notification system

---

### 2.5 Tenant Quotas (Warm Path)
**Key Pattern:** `zenin:{tenant_id}:quota`

**Structure:**
```json
{
  "max_series": 100,
  "current_series": 45,
  "max_storage_gb": 10,
  "current_storage_gb": 3.2,
  "tier": "pro"
}
```

**TTL:** 600 seconds (10 min)  
**Use Case:** Rate limiting, quota enforcement

---

## 3. Real-Time Pub/Sub

### 3.1 New Data Points
**Channel:** `zenin:events:data_points:{tenant_id}`

**Message:**
```json
{
  "series_id": "a1b2c3d4",
  "value": 23.45,
  "timestamp": "2026-03-03T15:00:00Z",
  "event": "new_data_point"
}
```

**Subscribers:** WebSocket servers, real-time dashboards

---

### 3.2 Anomaly Alerts
**Channel:** `zenin:events:anomalies:{tenant_id}`

**Message:**
```json
{
  "series_id": "a1b2c3d4",
  "severity": "critical",
  "score": 0.95,
  "event": "anomaly_detected"
}
```

**Subscribers:** Notification service, alert manager

---

### 3.3 Prediction Updates
**Channel:** `zenin:events:predictions:{tenant_id}`

**Message:**
```json
{
  "series_id": "a1b2c3d4",
  "predicted_value": 24.5,
  "confidence": 0.87,
  "event": "prediction_generated"
}
```

**Subscribers:** Dashboard, ML monitoring

---

## 4. Session Management

### 4.1 User Sessions
**Key Pattern:** `zenin:session:{session_id}`

**Structure:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
  "role": "admin",
  "created_at": "2026-03-03T14:00:00Z"
}
```

**TTL:** 3600 seconds (1 hour, refresh on activity)

---

### 4.2 API Rate Limiting
**Key Pattern:** `zenin:ratelimit:{tenant_id}:{endpoint}:{window}`

**Structure:** Counter
```
INCR zenin:ratelimit:tenant123:/api/series:1709481600
EXPIRE zenin:ratelimit:tenant123:/api/series:1709481600 60
```

**TTL:** 60 seconds (sliding window)  
**Limit:** Configurable per tier (free: 100/min, pro: 1000/min, enterprise: unlimited)

---

## 5. ML Pipeline Cache

### 5.1 Model Metadata
**Key Pattern:** `zenin:{tenant_id}:model:{model_id}`

**Structure:**
```json
{
  "engine_name": "cognitive",
  "version": "2.0",
  "hyperparameters": {...},
  "is_active": true
}
```

**TTL:** 1800 seconds (30 min)

---

### 5.2 Sliding Windows (UTSAE)
**Key Pattern:** `zenin:{tenant_id}:window:{series_id}`

**Structure:** List (LPUSH/LTRIM)
```
LPUSH zenin:tenant:window:series123 '{"value": 23.45, "timestamp": "..."}'
LTRIM zenin:tenant:window:series123 0 99  # Keep last 100 points
```

**TTL:** 600 seconds (10 min)  
**Max Size:** 100 points  
**Use Case:** Real-time ML inference without DB queries

---

### 5.3 Cognitive Memory Index
**Key Pattern:** `zenin:{tenant_id}:cognitive:index:{series_id}`

**Structure:** Set
```
SADD zenin:tenant:cognitive:index:series123 
  "weaviate_id_1"
  "weaviate_id_2"
```

**TTL:** None (persist)  
**Use Case:** Fast lookup of Weaviate object IDs for memory recall

---

## 6. Cache Invalidation Strategy

### Write-Through Pattern
1. Write to PostgreSQL (source of truth)
2. Update Redis cache
3. Publish event to Pub/Sub

### Cache-Aside Pattern (Read)
1. Check Redis
2. If miss → Query PostgreSQL
3. Populate Redis with TTL
4. Return data

### Invalidation Triggers
- **Data Points:** On INSERT → Update `series:latest`, publish event
- **Predictions:** On INSERT → Add to `predictions:recent` ZSET
- **Anomalies:** On INSERT → Update `anomalies:active` hash
- **Profiles:** On UPDATE → Invalidate `profile:{series_id}`

---

## 7. Memory Management

### Eviction Policy
```
maxmemory-policy allkeys-lru
```

### Memory Allocation by Use Case
- **Latest Values:** 30% (hot path, high frequency)
- **Predictions/Anomalies:** 25% (medium frequency)
- **Sessions/Auth:** 20% (security critical)
- **Sliding Windows:** 15% (ML pipeline)
- **Metadata/Profiles:** 10% (warm path)

### Monitoring
```bash
# Check memory usage
INFO memory

# Monitor hit rate
INFO stats | grep keyspace_hits
INFO stats | grep keyspace_misses

# Calculate hit rate
hit_rate = hits / (hits + misses)
```

**Target Hit Rate:** > 85%

---

## 8. High Availability

### Redis Sentinel (Production)
```yaml
sentinel:
  master: zenin-master
  replicas: 2
  quorum: 2
  down-after-milliseconds: 5000
  failover-timeout: 60000
```

### Redis Cluster (Enterprise)
- 3 master nodes (sharding)
- 3 replica nodes (HA)
- Hash slot distribution: 16384 slots
- Sharding key: `{tenant_id}` (tenant isolation)

---

## 9. Connection Pooling

### ASP.NET Core Configuration
```csharp
services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = "localhost:6379";
    options.InstanceName = "Zenin_";
    options.ConfigurationOptions = new ConfigurationOptions
    {
        ConnectTimeout = 5000,
        SyncTimeout = 5000,
        AbortOnConnectFail = false,
        ConnectRetry = 3,
        KeepAlive = 60,
        DefaultDatabase = 0
    };
});
```

### Pool Size
- **Development:** 10 connections
- **Production:** 50-100 connections (scale with load)

---

## 10. Monitoring & Alerts

### Key Metrics
```
# Latency
redis.command.latency.p99 < 5ms

# Memory
redis.memory.used < 80% of maxmemory

# Hit Rate
redis.cache.hit_rate > 85%

# Connections
redis.connections.active < 90% of maxclients

# Evictions
redis.evicted_keys.rate < 100/sec
```

### Alerts
- **Critical:** Memory > 90%, Hit Rate < 70%, Latency p99 > 10ms
- **Warning:** Memory > 80%, Hit Rate < 80%, Evictions > 50/sec

---

## 11. Backup & Persistence

### RDB Snapshots
```
save 900 1      # After 900 sec if 1 key changed
save 300 10     # After 300 sec if 10 keys changed
save 60 10000   # After 60 sec if 10000 keys changed
```

### AOF (Append-Only File)
```
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**Note:** Cache data is ephemeral. PostgreSQL is source of truth.

---

## 12. Security

### Authentication
```
requirepass <strong_password>
```

### Network Isolation
- Bind to private network only
- No public internet exposure
- TLS encryption in transit (production)

### ACL (Redis 6+)
```
user zenin_app on >password ~zenin:* +@all -@dangerous
user zenin_readonly on >password ~zenin:* +@read
```

---

## 13. Performance Tuning

### Pipelining
Batch multiple commands to reduce round trips:
```csharp
var batch = redis.CreateBatch();
var task1 = batch.StringGetAsync("key1");
var task2 = batch.StringGetAsync("key2");
batch.Execute();
await Task.WhenAll(task1, task2);
```

### Lua Scripts (Atomic Operations)
```lua
-- Atomic increment with max limit
local current = redis.call('GET', KEYS[1])
if current and tonumber(current) >= tonumber(ARGV[1]) then
    return 0
end
return redis.call('INCR', KEYS[1])
```

---

## 14. Migration from SQL Server

### Phase 1: Dual Write
- Write to both SQL Server and Redis
- Read from Redis (cache-aside)
- Validate consistency

### Phase 2: Redis Primary
- Redis becomes primary for hot data
- PostgreSQL for cold storage
- Async sync to PostgreSQL

### Phase 3: Full Migration
- All real-time data in Redis
- PostgreSQL for analytics/reporting
- Scheduled aggregation jobs

---

## 15. Cost Optimization

### Compression
Enable compression for large values (>1KB):
```csharp
var compressed = Compress(jsonString);
await redis.StringSetAsync(key, compressed);
```

### TTL Optimization
- Short TTL for high-churn data (latest values: 5 min)
- Long TTL for stable data (profiles: 1 hour)
- No TTL for critical data (active anomalies)

### Memory Estimation
```
Series (100k): 100k × 200 bytes = 20 MB
Predictions (1M/day): 1M × 500 bytes = 500 MB
Sessions (10k): 10k × 1 KB = 10 MB
Total: ~600 MB (with overhead: 1 GB recommended)
```

---

## Implementation Checklist

- [ ] Configure Redis Sentinel/Cluster
- [ ] Implement cache-aside pattern in API
- [ ] Set up Pub/Sub channels
- [ ] Configure rate limiting
- [ ] Implement sliding window cache for ML
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure backup strategy
- [ ] Test failover scenarios
- [ ] Load test cache hit rates
- [ ] Document cache invalidation flows
