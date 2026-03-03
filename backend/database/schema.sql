-- ============================================================================
-- ZENIN - PostgreSQL Production Schema
-- Universal Time Series Analysis Engine (UTSAE) + Multi-Tenant SaaS
-- ============================================================================
-- Version: 1.0.0
-- Target: PostgreSQL 16+
-- Features: Multi-tenant, Time-series partitioning, UUID PKs, ISO 27001
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- SCHEMA ORGANIZATION
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS zenin_core;      -- Core entities (tenants, users, auth)
CREATE SCHEMA IF NOT EXISTS zenin_ts;        -- Time-series data (readings, events)
CREATE SCHEMA IF NOT EXISTS zenin_ml;        -- ML models, predictions, anomalies
CREATE SCHEMA IF NOT EXISTS zenin_audit;     -- Audit logs, compliance
CREATE SCHEMA IF NOT EXISTS zenin_iot;       -- IoT devices (future integration)

SET search_path TO zenin_core, zenin_ts, zenin_ml, zenin_audit, public;

-- ============================================================================
-- CORE SCHEMA: Multi-Tenant Foundation
-- ============================================================================

-- Tenants (Organizations)
CREATE TABLE zenin_core.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    tier VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    max_series INT NOT NULL DEFAULT 100,
    max_storage_gb INT NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenants_slug ON zenin_core.tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_tier ON zenin_core.tenants(tier) WHERE is_active = true;

-- Users (Multi-tenant aware)
CREATE TABLE zenin_core.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'operator', 'user', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    refresh_token VARCHAR(500),
    refresh_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON zenin_core.users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON zenin_core.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON zenin_core.users(tenant_id, role) WHERE is_active = true;

-- API Keys (for programmatic access)
CREATE TABLE zenin_core.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES zenin_core.users(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_tenant ON zenin_core.api_keys(tenant_id) WHERE is_active = true;
CREATE INDEX idx_api_keys_hash ON zenin_core.api_keys(key_hash) WHERE is_active = true;

-- ============================================================================
-- TIME-SERIES SCHEMA: Universal Series Management
-- ============================================================================

-- Series (Universal time-series entities)
CREATE TABLE zenin_ts.series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    series_key VARCHAR(255) NOT NULL,  -- User-defined identifier
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    data_type VARCHAR(50) NOT NULL DEFAULT 'numeric' CHECK (data_type IN ('numeric', 'categorical', 'boolean')),
    source_type VARCHAR(100) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'iot_sensor', 'api', 'integration')),
    source_id UUID,  -- Reference to IoT device/sensor if applicable
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_series_tenant_key UNIQUE (tenant_id, series_key)
);

CREATE INDEX idx_series_tenant ON zenin_ts.series(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_series_source ON zenin_ts.series(source_type, source_id) WHERE is_active = true;
CREATE INDEX idx_series_metadata ON zenin_ts.series USING gin(metadata);

-- Time-series Data Points (Partitioned by month)
CREATE TABLE zenin_ts.data_points (
    id UUID DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    value NUMERIC(20,6) NOT NULL,
    quality_score NUMERIC(3,2) DEFAULT 1.0 CHECK (quality_score >= 0 AND quality_score <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
            CREATE TABLE IF NOT EXISTS zenin_ts.%I PARTITION OF zenin_ts.data_points
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_series_time ON zenin_ts.%I (series_id, timestamp DESC)',
            partition_name, partition_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant ON zenin_ts.%I (tenant_id)',
            partition_name, partition_name);
    END LOOP;
END $$;

-- Latest values cache (1 row per series)
CREATE TABLE zenin_ts.series_latest (
    series_id UUID PRIMARY KEY REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    latest_value NUMERIC(20,6) NOT NULL,
    latest_timestamp TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_series_latest_tenant ON zenin_ts.series_latest(tenant_id);
CREATE INDEX idx_series_latest_time ON zenin_ts.series_latest(latest_timestamp DESC);

-- Series Profiles (Statistical metadata)
CREATE TABLE zenin_ts.series_profiles (
    series_id UUID PRIMARY KEY REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    mean NUMERIC(20,6),
    std_dev NUMERIC(20,6),
    min_value NUMERIC(20,6),
    max_value NUMERIC(20,6),
    volatility_level VARCHAR(20) CHECK (volatility_level IN ('low', 'medium', 'high')),
    stationarity_hint VARCHAR(20) CHECK (stationarity_hint IN ('stationary', 'trending', 'seasonal', 'unknown')),
    regime VARCHAR(50),
    last_computed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_series_profiles_tenant ON zenin_ts.series_profiles(tenant_id);

-- ============================================================================
-- ML SCHEMA: Predictions, Anomalies, Patterns
-- ============================================================================

-- ML Models
CREATE TABLE zenin_ml.models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    engine_name VARCHAR(100) NOT NULL,  -- 'taylor', 'cognitive', 'baseline', etc.
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    trained_at TIMESTAMPTZ,
    accuracy NUMERIC(5,4),
    hyperparameters JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_models_tenant ON zenin_ml.models(tenant_id);
CREATE INDEX idx_models_series ON zenin_ml.models(series_id) WHERE is_active = true;
CREATE INDEX idx_models_engine ON zenin_ml.models(engine_name);

-- Predictions (Partitioned by month)
CREATE TABLE zenin_ml.predictions (
    id UUID DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    model_id UUID NOT NULL REFERENCES zenin_ml.models(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    predicted_value NUMERIC(20,6) NOT NULL,
    confidence_score NUMERIC(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    trend VARCHAR(10) NOT NULL CHECK (trend IN ('up', 'down', 'stable')),
    horizon_steps INT NOT NULL DEFAULT 1,
    confidence_interval_lower NUMERIC(20,6),
    confidence_interval_upper NUMERIC(20,6),
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_timestamp TIMESTAMPTZ NOT NULL,
    is_anomaly BOOLEAN NOT NULL DEFAULT false,
    anomaly_score NUMERIC(5,4),
    risk_level VARCHAR(20) DEFAULT 'NONE' CHECK (risk_level IN ('NONE', 'LOW', 'MEDIUM', 'HIGH')),
    explanation TEXT,
    explanation_json JSONB,  -- Structured Explanation object
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
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_anomaly ON zenin_ml.%I (tenant_id, is_anomaly) WHERE is_anomaly = true',
            partition_name, partition_name);
    END LOOP;
END $$;

-- Anomalies (Partitioned by month)
CREATE TABLE zenin_ml.anomalies (
    id UUID DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anomaly_score NUMERIC(5,4) NOT NULL CHECK (anomaly_score >= 0 AND anomaly_score <= 1),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('none', 'low', 'medium', 'high', 'critical')),
    confidence NUMERIC(5,4) NOT NULL,
    method_votes JSONB DEFAULT '{}',
    explanation TEXT,
    context JSONB DEFAULT '{}',
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

-- Patterns
CREATE TABLE zenin_ml.patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('stable', 'drifting', 'oscillating', 'spike', 'micro_variation', 'curve_anomaly', 'regime_transition')),
    confidence NUMERIC(5,4) NOT NULL,
    description TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_timestamp TIMESTAMPTZ,
    end_timestamp TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patterns_tenant ON zenin_ml.patterns(tenant_id);
CREATE INDEX idx_patterns_series ON zenin_ml.patterns(series_id, detected_at DESC);
CREATE INDEX idx_patterns_type ON zenin_ml.patterns(pattern_type);

-- Change Points
CREATE TABLE zenin_ml.change_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('mean_shift', 'variance_shift', 'trend_change', 'regime_change')),
    detected_at TIMESTAMPTZ NOT NULL,
    confidence NUMERIC(5,4) NOT NULL,
    magnitude NUMERIC(20,6),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_change_points_series ON zenin_ml.change_points(series_id, detected_at DESC);

-- Cognitive Memory (Weaviate integration metadata)
CREATE TABLE zenin_ml.cognitive_memory_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    weaviate_id UUID NOT NULL,
    object_type VARCHAR(50) NOT NULL CHECK (object_type IN ('explanation', 'anomaly', 'pattern')),
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_cognitive_memory_tenant ON zenin_ml.cognitive_memory_index(tenant_id);
CREATE INDEX idx_cognitive_memory_series ON zenin_ml.cognitive_memory_index(series_id);
CREATE INDEX idx_cognitive_memory_weaviate ON zenin_ml.cognitive_memory_index(weaviate_id);

-- ============================================================================
-- AUDIT SCHEMA: ISO 27001 Compliance
-- ============================================================================

-- Audit Logs (Partitioned by month)
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
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_user ON zenin_audit.%I (user_id)',
            partition_name, partition_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_entity ON zenin_audit.%I (entity_type, entity_id)',
            partition_name, partition_name);
    END LOOP;
END $$;

-- Security Events
CREATE TABLE zenin_audit.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_events_tenant ON zenin_audit.security_events(tenant_id, timestamp DESC);
CREATE INDEX idx_security_events_severity ON zenin_audit.security_events(severity, timestamp DESC) WHERE severity IN ('warning', 'critical');

-- ============================================================================
-- IOT SCHEMA: Future Device Integration
-- ============================================================================

-- Devices (for IoT sensor integration)
CREATE TABLE zenin_iot.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id) ON DELETE CASCADE,
    device_key VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance', 'error')),
    last_connection TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_devices_tenant_key UNIQUE (tenant_id, device_key)
);

CREATE INDEX idx_devices_tenant ON zenin_iot.devices(tenant_id) WHERE is_active = true;
CREATE INDEX idx_devices_status ON zenin_iot.devices(status);

-- Sensors (linked to series)
CREATE TABLE zenin_iot.sensors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    device_id UUID NOT NULL REFERENCES zenin_iot.devices(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id) ON DELETE CASCADE,
    sensor_key VARCHAR(255) NOT NULL,
    sensor_type VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sensors_device_key UNIQUE (device_id, sensor_key)
);

CREATE INDEX idx_sensors_device ON zenin_iot.sensors(device_id) WHERE is_active = true;
CREATE INDEX idx_sensors_series ON zenin_iot.sensors(series_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION zenin_core.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON zenin_core.tenants
    FOR EACH ROW EXECUTE FUNCTION zenin_core.update_updated_at();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON zenin_core.users
    FOR EACH ROW EXECUTE FUNCTION zenin_core.update_updated_at();

CREATE TRIGGER trg_series_updated_at BEFORE UPDATE ON zenin_ts.series
    FOR EACH ROW EXECUTE FUNCTION zenin_core.update_updated_at();

CREATE TRIGGER trg_models_updated_at BEFORE UPDATE ON zenin_ml.models
    FOR EACH ROW EXECUTE FUNCTION zenin_core.update_updated_at();

-- Update series_latest on data_points insert
CREATE OR REPLACE FUNCTION zenin_ts.update_series_latest()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO zenin_ts.series_latest (series_id, tenant_id, latest_value, latest_timestamp, updated_at)
    VALUES (NEW.series_id, NEW.tenant_id, NEW.value, NEW.timestamp, NOW())
    ON CONFLICT (series_id) DO UPDATE
    SET latest_value = EXCLUDED.latest_value,
        latest_timestamp = EXCLUDED.latest_timestamp,
        updated_at = NOW()
    WHERE zenin_ts.series_latest.latest_timestamp < EXCLUDED.latest_timestamp;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_data_points_update_latest
    AFTER INSERT ON zenin_ts.data_points
    FOR EACH ROW EXECUTE FUNCTION zenin_ts.update_series_latest();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active series with latest values
CREATE OR REPLACE VIEW zenin_ts.v_series_overview AS
SELECT 
    s.id,
    s.tenant_id,
    s.series_key,
    s.name,
    s.unit,
    s.source_type,
    sl.latest_value,
    sl.latest_timestamp,
    sp.mean,
    sp.std_dev,
    sp.volatility_level,
    sp.regime,
    s.is_active,
    s.created_at
FROM zenin_ts.series s
LEFT JOIN zenin_ts.series_latest sl ON s.id = sl.series_id
LEFT JOIN zenin_ts.series_profiles sp ON s.id = sp.series_id
WHERE s.deleted_at IS NULL;

-- Recent anomalies summary
CREATE OR REPLACE VIEW zenin_ml.v_recent_anomalies AS
SELECT 
    a.id,
    a.tenant_id,
    a.series_id,
    s.name AS series_name,
    a.detected_at,
    a.anomaly_score,
    a.severity,
    a.is_acknowledged,
    a.acknowledged_by,
    a.acknowledged_at
FROM zenin_ml.anomalies a
JOIN zenin_ts.series s ON a.series_id = s.id
WHERE a.detected_at > NOW() - INTERVAL '7 days'
ORDER BY a.detected_at DESC;

-- ============================================================================
-- GRANTS & SECURITY
-- ============================================================================

-- Create application role
CREATE ROLE zenin_app WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';

-- Grant schema usage
GRANT USAGE ON SCHEMA zenin_core, zenin_ts, zenin_ml, zenin_audit, zenin_iot TO zenin_app;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zenin_core TO zenin_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zenin_ts TO zenin_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zenin_ml TO zenin_app;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA zenin_audit TO zenin_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zenin_iot TO zenin_app;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA zenin_core TO zenin_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA zenin_ts TO zenin_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA zenin_ml TO zenin_app;

-- Row Level Security (RLS) - Multi-tenant isolation
ALTER TABLE zenin_ts.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenin_ts.data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenin_ml.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenin_ml.anomalies ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example - customize per application needs)
CREATE POLICY tenant_isolation_series ON zenin_ts.series
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_data_points ON zenin_ts.data_points
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- MAINTENANCE & MONITORING
-- ============================================================================

-- Partition maintenance function (call monthly via cron)
CREATE OR REPLACE FUNCTION zenin_core.create_next_month_partitions()
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    tables TEXT[] := ARRAY['data_points', 'predictions', 'anomalies', 'logs'];
    schemas TEXT[] := ARRAY['zenin_ts', 'zenin_ml', 'zenin_ml', 'zenin_audit'];
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

-- Drop old partitions (call monthly, keep 13 months)
CREATE OR REPLACE FUNCTION zenin_core.drop_old_partitions()
RETURNS void AS $$
DECLARE
    cutoff_date DATE;
    partition_name TEXT;
    tables TEXT[] := ARRAY['data_points', 'predictions', 'anomalies', 'logs'];
    schemas TEXT[] := ARRAY['zenin_ts', 'zenin_ml', 'zenin_ml', 'zenin_audit'];
    i INT;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '13 months');
    
    FOR i IN 1..array_length(tables, 1) LOOP
        partition_name := tables[i] || '_' || TO_CHAR(cutoff_date, 'YYYY_MM');
        
        EXECUTE format('DROP TABLE IF EXISTS %I.%I', schemas[i], partition_name);
        
        RAISE NOTICE 'Dropped partition: %.%', schemas[i], partition_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON SCHEMA zenin_core IS 'Core multi-tenant entities (tenants, users, auth)';
COMMENT ON SCHEMA zenin_ts IS 'Time-series data storage with monthly partitioning';
COMMENT ON SCHEMA zenin_ml IS 'ML models, predictions, anomalies, patterns';
COMMENT ON SCHEMA zenin_audit IS 'Audit logs and security events (ISO 27001)';
COMMENT ON SCHEMA zenin_iot IS 'IoT device integration (future)';

COMMENT ON TABLE zenin_ts.data_points IS 'Time-series data points - partitioned by month for performance';
COMMENT ON TABLE zenin_ml.predictions IS 'ML predictions - partitioned by month, includes UTSAE cognitive output';
COMMENT ON TABLE zenin_ml.anomalies IS 'Anomaly detection results - partitioned by month';
COMMENT ON TABLE zenin_audit.logs IS 'Audit trail for ISO 27001 compliance - partitioned by month';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
