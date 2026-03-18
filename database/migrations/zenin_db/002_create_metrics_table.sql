-- =============================================
-- ZENIN Metrics Table Migration
-- Version: 002
-- Purpose: Store LTTB-processed time series data for frontend charts
-- =============================================

USE zenin_db;
GO

-- Create schema if not exists
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'zenin_metrics')
BEGIN
    EXEC('CREATE SCHEMA zenin_metrics');
END
GO

-- Drop table if exists (for dev/testing)
IF OBJECT_ID('zenin_metrics.chart_data', 'U') IS NOT NULL
    DROP TABLE zenin_metrics.chart_data;
GO

-- Main metrics table
CREATE TABLE zenin_metrics.chart_data
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Metric identification
    metric_type NVARCHAR(50) NOT NULL,  -- 'analysis_count', 'upload_volume', 'completion_rate', etc.
    series_key NVARCHAR(100) NOT NULL,  -- Usually tenant_id or 'tenant_id:classification'
    
    -- Time series data (LTTB-processed, max 200 points)
    data_points NVARCHAR(MAX) NOT NULL,  -- JSON array: [{"timestamp":"2026-03-17T00:00:00Z","value":12.5}]
    
    -- Time range
    period_start DATETIME2 NOT NULL,
    period_end DATETIME2 NOT NULL,
    
    -- Metadata
    computed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    source NVARCHAR(50) NOT NULL DEFAULT 'metrics_server',  -- 'metrics_server', 'manual', etc.
    original_point_count INT NULL,  -- How many points before LTTB
    lttb_applied BIT NOT NULL DEFAULT 0,
    
    -- Indexes
    INDEX IX_metrics_tenant_type NONCLUSTERED (tenant_id, metric_type),
    INDEX IX_metrics_computed NONCLUSTERED (computed_at DESC),
    INDEX IX_metrics_period NONCLUSTERED (period_start, period_end)
);
GO

-- Summary table for fast dashboard queries
IF OBJECT_ID('zenin_metrics.summary_cache', 'U') IS NOT NULL
    DROP TABLE zenin_metrics.summary_cache;
GO

CREATE TABLE zenin_metrics.summary_cache
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Totals
    total_analyses INT NOT NULL DEFAULT 0,
    total_files INT NOT NULL DEFAULT 0,
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    
    -- Rates
    analyses_this_week INT NOT NULL DEFAULT 0,
    analyses_today INT NOT NULL DEFAULT 0,
    completion_rate_percent DECIMAL(5,2) NULL,
    error_rate_percent DECIMAL(5,2) NULL,
    avg_processing_seconds DECIMAL(10,2) NULL,
    
    -- Last activity
    last_activity DATETIME2 NULL,
    
    -- Classification breakdown (JSON)
    classification_breakdown NVARCHAR(MAX) NULL,  -- {"numeric":123,"text":456,"mixed":78}
    
    -- Status breakdown (JSON)
    status_breakdown NVARCHAR(MAX) NULL,  -- {"analyzed":1100,"pending":34,"processing":12,"error":88}
    
    -- Metadata
    computed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Indexes
    INDEX IX_summary_tenant UNIQUE NONCLUSTERED (tenant_id),
    INDEX IX_summary_computed NONCLUSTERED (computed_at DESC)
);
GO

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON zenin_metrics.chart_data TO metrics_server_user;
-- GRANT SELECT, INSERT, UPDATE ON zenin_metrics.summary_cache TO metrics_server_user;

PRINT 'Migration 002 completed: zenin_metrics schema created';
GO
