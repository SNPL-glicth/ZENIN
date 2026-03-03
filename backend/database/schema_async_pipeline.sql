-- ============================================================================
-- ZENIN - PostgreSQL Schema for Async Pipeline
-- ============================================================================
-- Flujo: Ingesta → Batch → Broker → ML → Orchestrator → PostgreSQL
-- Backend .NET: Solo lee vistas optimizadas (NO escribe, NO procesa)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- SCHEMA ORGANIZATION
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS zenin_core;        -- Core entities (tenants, users)
CREATE SCHEMA IF NOT EXISTS zenin_write;       -- Write-intensive (raw data from pipeline)
CREATE SCHEMA IF NOT EXISTS zenin_read;        -- Read-optimized (snapshots, aggregates)
CREATE SCHEMA IF NOT EXISTS zenin_ml;          -- ML outputs (predictions, anomalies)
CREATE SCHEMA IF NOT EXISTS zenin_audit;       -- Audit logs

SET search_path TO zenin_core, zenin_write, zenin_read, zenin_ml, zenin_audit, public;

-- ============================================================================
-- CORE SCHEMA: Multi-Tenant Foundation
-- ============================================================================

CREATE TABLE zenin_core.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    tier VARCHAR(50) NOT NULL DEFAULT 'free',
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_tenants_slug ON zenin_core.tenants(slug) WHERE is_active = true;

CREATE TABLE zenin_core.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON zenin_core.users(tenant_id) WHERE is_active = true;

-- Series (Universal time-series entities)
CREATE TABLE zenin_core.series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    series_key VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    source_type VARCHAR(100) NOT NULL DEFAULT 'iot_sensor',
    source_id VARCHAR(255),  -- sensor_uuid, device_key, etc.
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_series_tenant_key UNIQUE (tenant_id, series_key)
);

CREATE INDEX idx_series_tenant ON zenin_core.series(tenant_id) WHERE is_active = true;
CREATE INDEX idx_series_source ON zenin_core.series(source_type, source_id);

-- Legacy mapping (SQL Server sensor_id → PostgreSQL series_id)
CREATE TABLE zenin_core.legacy_sensor_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id),
    sensor_id BIGINT NOT NULL UNIQUE,
    device_id BIGINT,
    series_id UUID NOT NULL REFERENCES zenin_core.series(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_legacy_mapping_sensor ON zenin_core.legacy_sensor_mapping(sensor_id);
CREATE INDEX idx_legacy_mapping_series ON zenin_core.legacy_sensor_mapping(series_id);

-- ============================================================================
-- WRITE SCHEMA: High-Volume Raw Data (Written by Python Pipeline)
-- ============================================================================

-- Raw data points (partitioned by month)
-- Written by: Ingesta API → Batch Inserter
CREATE TABLE zenin_write.data_points (
    id UUID DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    series_id UUID NOT NULL REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    value NUMERIC(20,6) NOT NULL,
    quality_score NUMERIC(3,2) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, series_id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for current and next 12 months
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..12 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'data_points_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS zenin_write.%I PARTITION OF zenin_write.data_points
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        -- Índice optimizado para queries time-series
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_series_time ON zenin_write.%I (series_id, timestamp DESC)',
            partition_name, partition_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant ON zenin_write.%I (tenant_id)',
            partition_name, partition_name);
    END LOOP;
END $$;

COMMENT ON TABLE zenin_write.data_points IS 
'Raw time-series data points. Written by Ingesta API batch inserter. 
Partitioned by month. Backend .NET should NOT query this directly - use zenin_read views instead.';

-- ============================================================================
-- READ SCHEMA: Optimized Snapshots (Written by Orchestrator, Read by Backend)
-- ============================================================================

-- Latest values snapshot (1 row per series)
-- Written by: Orchestrator (on every new data point)
-- Read by: Backend .NET (dashboard, real-time displays)
CREATE TABLE zenin_read.series_latest (
    series_id UUID PRIMARY KEY REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    latest_value NUMERIC(20,6) NOT NULL,
    latest_timestamp TIMESTAMPTZ NOT NULL,
    previous_value NUMERIC(20,6),
    previous_timestamp TIMESTAMPTZ,
    delta NUMERIC(20,6),
    delta_percentage NUMERIC(10,4),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_series_latest_tenant ON zenin_read.series_latest(tenant_id);
CREATE INDEX idx_series_latest_time ON zenin_read.series_latest(latest_timestamp DESC);

COMMENT ON TABLE zenin_read.series_latest IS 
'Latest value snapshot per series. Updated by Orchestrator. 
Backend queries this for real-time displays (ultra-fast, no partition scans).';

-- Statistical profiles (1 row per series)
-- Written by: Orchestrator (periodic recomputation, e.g., hourly)
-- Read by: Backend .NET (analytics, charts)
CREATE TABLE zenin_read.series_profiles (
    series_id UUID PRIMARY KEY REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    
    -- Statistical metrics
    mean NUMERIC(20,6),
    std_dev NUMERIC(20,6),
    min_value NUMERIC(20,6),
    max_value NUMERIC(20,6),
    median NUMERIC(20,6),
    
    -- Structural analysis (from UTSAE)
    volatility_level VARCHAR(20),  -- low, medium, high
    stationarity_hint VARCHAR(20), -- stationary, trending, seasonal
    regime VARCHAR(50),             -- stable, drifting, oscillating
    trend_strength NUMERIC(5,4),
    
    -- Metadata
    sample_size INT,
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ,
    last_computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_series_profiles_tenant ON zenin_read.series_profiles(tenant_id);

COMMENT ON TABLE zenin_read.series_profiles IS 
'Statistical profiles computed by Orchestrator from UTSAE StructuralAnalysis.
Backend queries this for analytics (no heavy computation).';

-- Aggregated metrics (time-bucketed)
-- Written by: Orchestrator (periodic aggregation job)
-- Read by: Backend .NET (charts, trends)
CREATE TABLE zenin_read.series_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    series_id UUID NOT NULL REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    bucket_start TIMESTAMPTZ NOT NULL,
    bucket_end TIMESTAMPTZ NOT NULL,
    bucket_size INTERVAL NOT NULL,  -- 1 minute, 5 minutes, 1 hour, 1 day
    
    -- Aggregated values
    count INT NOT NULL,
    min_value NUMERIC(20,6),
    max_value NUMERIC(20,6),
    avg_value NUMERIC(20,6),
    sum_value NUMERIC(20,6),
    stddev_value NUMERIC(20,6),
    
    -- Metadata
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_series_bucket UNIQUE (series_id, bucket_start, bucket_size)
);

CREATE INDEX idx_series_agg_series_time ON zenin_read.series_aggregates(series_id, bucket_start DESC);
CREATE INDEX idx_series_agg_tenant ON zenin_read.series_aggregates(tenant_id);

COMMENT ON TABLE zenin_read.series_aggregates IS 
'Pre-computed aggregates for fast chart rendering. 
Backend queries this instead of scanning raw data_points.';

-- System health snapshot
-- Written by: Orchestrator (every processing cycle)
-- Read by: Backend .NET (health dashboard)
CREATE TABLE zenin_read.system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    
    -- Pipeline health
    ingesta_status VARCHAR(20) NOT NULL,  -- healthy, degraded, down
    broker_status VARCHAR(20) NOT NULL,
    ml_status VARCHAR(20) NOT NULL,
    orchestrator_status VARCHAR(20) NOT NULL,
    
    -- Metrics
    total_series INT,
    active_series INT,
    data_points_last_hour BIGINT,
    predictions_last_hour INT,
    anomalies_last_hour INT,
    
    -- Latency metrics (from PipelineTimer)
    avg_ingesta_latency_ms NUMERIC(10,2),
    avg_ml_latency_ms NUMERIC(10,2),
    avg_orchestrator_latency_ms NUMERIC(10,2),
    
    -- Timestamp
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_health_tenant_time ON zenin_read.system_health(tenant_id, snapshot_at DESC);

COMMENT ON TABLE zenin_read.system_health IS 
'System health snapshot updated by Orchestrator. 
Backend queries latest row for health dashboard.';

-- ============================================================================
-- ML SCHEMA: Predictions, Anomalies, Patterns (Written by UTSAE/Orchestrator)
-- ============================================================================

-- ML Models
-- Written by: Orchestrator (when training new models)
CREATE TABLE zenin_ml.models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    engine_name VARCHAR(100) NOT NULL,  -- taylor, cognitive, baseline
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    trained_at TIMESTAMPTZ,
    accuracy NUMERIC(5,4),
    hyperparameters JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_models_tenant ON zenin_ml.models(tenant_id);
CREATE INDEX idx_models_series_active ON zenin_ml.models(series_id) WHERE is_active = true;

-- Predictions (partitioned by month)
-- Written by: Orchestrator (after UTSAE inference)
CREATE TABLE zenin_ml.predictions (
    id UUID DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    model_id UUID NOT NULL REFERENCES zenin_ml.models(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    
    -- Prediction output
    predicted_value NUMERIC(20,6) NOT NULL,
    confidence_score NUMERIC(5,4) NOT NULL,
    confidence_level VARCHAR(20) NOT NULL,  -- very_low, low, medium, high, very_high
    trend VARCHAR(10) NOT NULL,             -- up, down, stable
    horizon_steps INT NOT NULL DEFAULT 1,
    
    -- Confidence interval (if available)
    confidence_interval_lower NUMERIC(20,6),
    confidence_interval_upper NUMERIC(20,6),
    
    -- Timestamps
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_timestamp TIMESTAMPTZ NOT NULL,
    
    -- Anomaly detection (embedded)
    is_anomaly BOOLEAN NOT NULL DEFAULT false,
    anomaly_score NUMERIC(5,4),
    risk_level VARCHAR(20) DEFAULT 'NONE',
    
    -- Explanation (from UTSAE Explanation object)
    explanation_text TEXT,
    explanation_json JSONB,  -- Full Explanation.to_dict()
    
    -- Metadata
    engine_name VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    audit_trace_id UUID,
    
    PRIMARY KEY (tenant_id, series_id, predicted_at)
) PARTITION BY RANGE (predicted_at);

-- Create prediction partitions
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..12 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'predictions_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS zenin_ml.%I PARTITION OF zenin_ml.predictions
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_series_time ON zenin_ml.%I (series_id, predicted_at DESC)',
            partition_name, partition_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_model ON zenin_ml.%I (model_id)',
            partition_name, partition_name);
    END LOOP;
END $$;

COMMENT ON TABLE zenin_ml.predictions IS 
'ML predictions from UTSAE. Written by Orchestrator after inference. 
Backend queries recent predictions for charts.';

-- Latest prediction snapshot (1 row per series)
-- Written by: Orchestrator (on every new prediction)
-- Read by: Backend .NET (dashboard)
CREATE TABLE zenin_read.series_latest_prediction (
    series_id UUID PRIMARY KEY REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    model_id UUID REFERENCES zenin_ml.models(id),
    
    predicted_value NUMERIC(20,6) NOT NULL,
    confidence_score NUMERIC(5,4) NOT NULL,
    confidence_level VARCHAR(20) NOT NULL,
    trend VARCHAR(10) NOT NULL,
    
    is_anomaly BOOLEAN NOT NULL DEFAULT false,
    anomaly_score NUMERIC(5,4),
    risk_level VARCHAR(20),
    
    predicted_at TIMESTAMPTZ NOT NULL,
    target_timestamp TIMESTAMPTZ NOT NULL,
    
    explanation_text TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_latest_pred_tenant ON zenin_read.series_latest_prediction(tenant_id);

COMMENT ON TABLE zenin_read.series_latest_prediction IS 
'Latest prediction per series. Backend queries this for real-time prediction display.';

-- Anomalies (partitioned by month)
-- Written by: Orchestrator (from UTSAE AnomalyResult)
CREATE TABLE zenin_ml.anomalies (
    id UUID DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    series_id UUID NOT NULL REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anomaly_score NUMERIC(5,4) NOT NULL,
    severity VARCHAR(20) NOT NULL,  -- none, low, medium, high, critical
    confidence NUMERIC(5,4) NOT NULL,
    
    -- Method votes (from AnomalyResult.method_votes)
    method_votes JSONB DEFAULT '{}',
    
    -- Explanation
    explanation TEXT,
    context JSONB DEFAULT '{}',
    
    -- Acknowledgment
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES zenin_core.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    
    audit_trace_id UUID,
    
    PRIMARY KEY (tenant_id, series_id, detected_at)
) PARTITION BY RANGE (detected_at);

-- Create anomaly partitions
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..12 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'anomalies_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS zenin_ml.%I PARTITION OF zenin_ml.anomalies
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_series_time ON zenin_ml.%I (series_id, detected_at DESC)',
            partition_name, partition_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_severity ON zenin_ml.%I (tenant_id, severity) WHERE severity IN (''high'', ''critical'')',
            partition_name, partition_name);
    END LOOP;
END $$;

-- Active anomalies snapshot
-- Written by: Orchestrator (on anomaly detection)
-- Read by: Backend .NET (alerts dashboard)
CREATE TABLE zenin_read.active_anomalies (
    series_id UUID PRIMARY KEY REFERENCES zenin_core.series(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    
    anomaly_score NUMERIC(5,4) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    confidence NUMERIC(5,4) NOT NULL,
    explanation TEXT,
    
    detected_at TIMESTAMPTZ NOT NULL,
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_active_anom_tenant_severity ON zenin_read.active_anomalies(tenant_id, severity);

COMMENT ON TABLE zenin_read.active_anomalies IS 
'Active (unacknowledged) anomalies. Backend queries this for alert dashboard.';

-- ============================================================================
-- AUDIT SCHEMA: ISO 27001 Compliance
-- ============================================================================

CREATE TABLE zenin_audit.logs (
    id UUID DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES zenin_core.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    is_success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, timestamp, id)
) PARTITION BY RANGE (timestamp);

-- Create audit log partitions
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..12 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'logs_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS zenin_audit.%I PARTITION OF zenin_audit.logs
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_time ON zenin_audit.%I (tenant_id, timestamp DESC)',
            partition_name, partition_name);
    END LOOP;
END $$;

-- ============================================================================
-- MATERIALIZED VIEWS (Refreshed by Orchestrator)
-- ============================================================================

-- Dashboard summary (refreshed every 5 minutes by Orchestrator)
CREATE MATERIALIZED VIEW zenin_read.mv_dashboard_summary AS
SELECT 
    s.tenant_id,
    COUNT(DISTINCT s.id) AS total_series,
    COUNT(DISTINCT CASE WHEN sl.latest_timestamp > NOW() - INTERVAL '5 minutes' THEN s.id END) AS active_series,
    COUNT(DISTINCT CASE WHEN aa.series_id IS NOT NULL THEN s.id END) AS series_with_anomalies,
    AVG(sp.mean) AS avg_series_mean,
    MAX(sl.latest_timestamp) AS last_data_point_at
FROM zenin_core.series s
LEFT JOIN zenin_read.series_latest sl ON s.id = sl.series_id
LEFT JOIN zenin_read.series_profiles sp ON s.id = sp.series_id
LEFT JOIN zenin_read.active_anomalies aa ON s.id = aa.series_id
WHERE s.is_active = true
GROUP BY s.tenant_id;

CREATE UNIQUE INDEX idx_mv_dashboard_tenant ON zenin_read.mv_dashboard_summary(tenant_id);

COMMENT ON MATERIALIZED VIEW zenin_read.mv_dashboard_summary IS 
'Dashboard summary refreshed by Orchestrator every 5 minutes. 
Backend queries this for ultra-fast dashboard load.';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION zenin_core.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON zenin_core.tenants
    FOR EACH ROW EXECUTE FUNCTION zenin_core.update_updated_at();

CREATE TRIGGER trg_series_latest_updated_at BEFORE UPDATE ON zenin_read.series_latest
    FOR EACH ROW EXECUTE FUNCTION zenin_core.update_updated_at();

-- Partition maintenance (called by Orchestrator monthly)
CREATE OR REPLACE FUNCTION zenin_core.create_next_month_partitions()
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    tables TEXT[] := ARRAY['data_points', 'predictions', 'anomalies', 'logs'];
    schemas TEXT[] := ARRAY['zenin_write', 'zenin_ml', 'zenin_ml', 'zenin_audit'];
    i INT;
BEGIN
    start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '13 months');
    end_date := start_date + INTERVAL '1 month';
    
    FOR i IN 1..array_length(tables, 1) LOOP
        partition_name := tables[i] || '_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I
            FOR VALUES FROM (%L) TO (%L)',
            schemas[i], partition_name, schemas[i], tables[i], start_date, end_date
        );
        
        RAISE NOTICE 'Created partition: %.%', schemas[i], partition_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS (Backend .NET = Read-Only)
-- ============================================================================

CREATE ROLE zenin_backend WITH LOGIN PASSWORD 'CHANGE_ME';
CREATE ROLE zenin_orchestrator WITH LOGIN PASSWORD 'CHANGE_ME';

-- Backend: Read-only access to optimized tables
GRANT USAGE ON SCHEMA zenin_core, zenin_read, zenin_ml, zenin_audit TO zenin_backend;
GRANT SELECT ON ALL TABLES IN SCHEMA zenin_core TO zenin_backend;
GRANT SELECT ON ALL TABLES IN SCHEMA zenin_read TO zenin_backend;
GRANT SELECT ON ALL TABLES IN SCHEMA zenin_ml TO zenin_backend;
GRANT SELECT ON ALL TABLES IN SCHEMA zenin_audit TO zenin_backend;

-- Orchestrator: Full access to write and read schemas
GRANT USAGE ON SCHEMA zenin_core, zenin_write, zenin_read, zenin_ml, zenin_audit TO zenin_orchestrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zenin_core TO zenin_orchestrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zenin_write TO zenin_orchestrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zenin_read TO zenin_orchestrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zenin_ml TO zenin_orchestrator;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA zenin_audit TO zenin_orchestrator;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON SCHEMA zenin_core IS 'Core entities (tenants, users, series definitions)';
COMMENT ON SCHEMA zenin_write IS 'Write-intensive raw data (written by Ingesta/Orchestrator)';
COMMENT ON SCHEMA zenin_read IS 'Read-optimized snapshots and aggregates (written by Orchestrator, read by Backend)';
COMMENT ON SCHEMA zenin_ml IS 'ML outputs (predictions, anomalies, patterns)';
COMMENT ON SCHEMA zenin_audit IS 'Audit logs (ISO 27001)';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
