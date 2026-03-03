-- ============================================================================
-- PostgreSQL Performance Tuning for ZENIN IoT System
-- ============================================================================
-- Optimizado para:
-- - Time-series data (millones de filas particionadas)
-- - Read-heavy workload (backend .NET solo lee)
-- - Write-intensive ingestion (Python pipeline)
-- - Cache con Redis
-- ============================================================================

-- ============================================================================
-- 1. MEMORY CONFIGURATION
-- ============================================================================

-- Shared Buffers (25% de RAM disponible)
-- Railway típicamente tiene 512MB-1GB RAM, usar 128MB-256MB
ALTER SYSTEM SET shared_buffers = '256MB';

-- Effective Cache Size (50-75% de RAM total)
-- Indica a PostgreSQL cuánta memoria hay disponible para cache (incluye OS cache)
ALTER SYSTEM SET effective_cache_size = '512MB';

-- Work Memory (para sorts, hash joins)
-- Fórmula: (RAM - shared_buffers) / max_connections / 2
-- Ejemplo: (1GB - 256MB) / 100 / 2 = ~4MB
ALTER SYSTEM SET work_mem = '4MB';

-- Maintenance Work Memory (para VACUUM, CREATE INDEX, etc.)
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- ============================================================================
-- 2. WRITE PERFORMANCE (Para Python Ingestion Pipeline)
-- ============================================================================

-- WAL (Write-Ahead Log) Configuration
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET wal_writer_delay = '200ms';
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET max_wal_size = '1GB';
ALTER SYSTEM SET min_wal_size = '256MB';

-- Checkpoint Completion Target (spread checkpoints over time)
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Commit Delay (batch commits para mejor throughput)
-- Solo si tienes múltiples transacciones concurrentes
ALTER SYSTEM SET commit_delay = 10;  -- microseconds
ALTER SYSTEM SET commit_siblings = 5;

-- ============================================================================
-- 3. QUERY PERFORMANCE
-- ============================================================================

-- Random Page Cost (SSD = 1.1, HDD = 4.0)
-- Railway usa SSD, bajar este valor
ALTER SYSTEM SET random_page_cost = 1.1;

-- Effective IO Concurrency (número de operaciones I/O simultáneas)
-- SSD puede manejar más operaciones concurrentes
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Parallel Query Settings
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
ALTER SYSTEM SET max_parallel_workers = 4;
ALTER SYSTEM SET max_worker_processes = 4;

-- ============================================================================
-- 4. CONNECTION POOLING
-- ============================================================================

-- Max Connections (Railway limita esto, típicamente 100)
ALTER SYSTEM SET max_connections = 100;

-- Statement Timeout (evitar queries colgadas)
ALTER SYSTEM SET statement_timeout = '30s';

-- Idle in Transaction Timeout
ALTER SYSTEM SET idle_in_transaction_session_timeout = '10min';

-- ============================================================================
-- 5. AUTOVACUUM TUNING (Crítico para time-series)
-- ============================================================================

-- Autovacuum habilitado (siempre debe estar ON)
ALTER SYSTEM SET autovacuum = on;

-- Autovacuum más agresivo para tablas con muchos writes
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '30s';  -- check cada 30 segundos

-- Thresholds para autovacuum
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;  -- 10% de la tabla
ALTER SYSTEM SET autovacuum_analyze_threshold = 50;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;  -- 5% de la tabla

-- Vacuum Cost Delay (no throttle tanto el autovacuum)
ALTER SYSTEM SET autovacuum_vacuum_cost_delay = '10ms';
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 1000;

-- ============================================================================
-- 6. LOGGING (Para debugging y monitoring)
-- ============================================================================

-- Log Slow Queries (queries > 1 segundo)
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- milliseconds

-- Log Connections/Disconnections
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Log Checkpoints (útil para tuning)
ALTER SYSTEM SET log_checkpoints = on;

-- Log Lock Waits (detectar contention)
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET deadlock_timeout = '1s';

-- ============================================================================
-- 7. STATISTICS (Para query planner)
-- ============================================================================

-- Default Statistics Target (más samples = mejores query plans)
ALTER SYSTEM SET default_statistics_target = 100;

-- Track Activity
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET track_functions = 'all';

-- ============================================================================
-- 8. TIME-SERIES SPECIFIC OPTIMIZATIONS
-- ============================================================================

-- Para tablas particionadas (data_points, predictions, anomalies)
-- Habilitar partition pruning
ALTER SYSTEM SET enable_partition_pruning = on;

-- Constraint Exclusion (para particiones)
ALTER SYSTEM SET constraint_exclusion = 'partition';

-- ============================================================================
-- 9. RELOAD CONFIGURATION
-- ============================================================================

-- Aplicar cambios sin reiniciar (algunos requieren restart)
SELECT pg_reload_conf();

-- Ver configuración actual
SELECT name, setting, unit, context 
FROM pg_settings 
WHERE name IN (
    'shared_buffers',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem',
    'wal_buffers',
    'checkpoint_timeout',
    'max_wal_size',
    'random_page_cost',
    'effective_io_concurrency',
    'max_connections',
    'autovacuum',
    'log_min_duration_statement'
)
ORDER BY name;

-- ============================================================================
-- 10. TABLE-SPECIFIC TUNING
-- ============================================================================

-- Autovacuum agresivo para tablas write-intensive
ALTER TABLE zenin_write.data_points SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 5
);

-- Fillfactor para tablas con muchos UPDATEs (series_latest, system_health)
ALTER TABLE zenin_read.series_latest SET (fillfactor = 80);
ALTER TABLE zenin_read.system_health SET (fillfactor = 80);

-- ============================================================================
-- 11. INDEX MAINTENANCE
-- ============================================================================

-- Reindex particiones antiguas (ejecutar mensualmente)
-- Ejemplo para partición de enero 2024:
-- REINDEX TABLE CONCURRENTLY zenin_write.data_points_2024_01;

-- Analyze tables después de cargas masivas
ANALYZE zenin_write.data_points;
ANALYZE zenin_read.series_latest;
ANALYZE zenin_read.series_profiles;
ANALYZE zenin_ml.predictions;
ANALYZE zenin_ml.anomalies;

-- ============================================================================
-- 12. MONITORING QUERIES
-- ============================================================================

-- Ver queries lentas activas
CREATE OR REPLACE VIEW zenin_audit.slow_queries AS
SELECT 
    pid,
    now() - query_start AS duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start IS NOT NULL
  AND now() - query_start > interval '1 second'
ORDER BY duration DESC;

-- Ver tamaño de tablas
CREATE OR REPLACE VIEW zenin_audit.table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname IN ('zenin_core', 'zenin_write', 'zenin_read', 'zenin_ml', 'zenin_audit')
ORDER BY size_bytes DESC;

-- Ver índices no utilizados
CREATE OR REPLACE VIEW zenin_audit.unused_indexes AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname IN ('zenin_core', 'zenin_write', 'zenin_read', 'zenin_ml')
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Ver cache hit ratio (debe ser > 95%)
CREATE OR REPLACE VIEW zenin_audit.cache_hit_ratio AS
SELECT 
    'index hit rate' AS name,
    (sum(idx_blks_hit)) / nullif(sum(idx_blks_hit + idx_blks_read),0) AS ratio
FROM pg_statio_user_indexes
UNION ALL
SELECT 
    'table hit rate' AS name,
    sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read),0) AS ratio
FROM pg_statio_user_tables;

-- ============================================================================
-- 13. VACUUM FULL (Solo ejecutar en mantenimiento programado)
-- ============================================================================

-- VACUUM FULL recupera espacio pero bloquea la tabla
-- Ejecutar solo en ventanas de mantenimiento
-- VACUUM FULL ANALYZE zenin_write.data_points_2023_12;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
1. RESTART REQUERIDO para algunos parámetros:
   - shared_buffers
   - max_connections
   - max_worker_processes
   
   Ejecutar en Railway:
   railway restart

2. MONITOREO:
   - Revisar zenin_audit.slow_queries diariamente
   - Revisar zenin_audit.cache_hit_ratio (debe ser > 0.95)
   - Revisar zenin_audit.table_sizes mensualmente
   
3. MANTENIMIENTO:
   - ANALYZE después de cargas masivas
   - REINDEX particiones antiguas mensualmente
   - VACUUM FULL solo en ventanas de mantenimiento
   
4. REDIS CACHE:
   - Usar Redis para:
     * zenin_read.series_latest (TTL: 5 segundos)
     * zenin_read.mv_dashboard_summary (TTL: 5 minutos)
     * zenin_read.active_anomalies (TTL: 10 segundos)
   - Invalidar cache cuando Orchestrator escribe
   
5. PARTICIONES:
   - Crear particiones futuras automáticamente (ver schema_async_pipeline.sql)
   - Eliminar particiones antiguas (> 12 meses) para liberar espacio
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

COMMENT ON VIEW zenin_audit.slow_queries IS 'Queries activas que tardan más de 1 segundo';
COMMENT ON VIEW zenin_audit.table_sizes IS 'Tamaño de todas las tablas ZENIN';
COMMENT ON VIEW zenin_audit.unused_indexes IS 'Índices que nunca se han usado (candidatos para eliminar)';
COMMENT ON VIEW zenin_audit.cache_hit_ratio IS 'Ratio de cache hits (debe ser > 0.95)';
