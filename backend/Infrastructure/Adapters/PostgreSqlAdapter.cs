using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Extensions.Logging;
using Npgsql;
using Zenin.Domain.Entities;
using Zenin.Infrastructure.Services;

namespace Zenin.Infrastructure.Adapters
{
    /// <summary>
    /// Adapter para PostgreSQL multi-tenant.
    /// Mapea entidades legacy (sensor_id) a nuevas entidades (series_id).
    /// </summary>
    public class PostgreSqlAdapter : IStorageAdapter
    {
        private readonly string _connectionString;
        private readonly ITenantResolver _tenantResolver;
        private readonly ILogger<PostgreSqlAdapter> _logger;

        public PostgreSqlAdapter(
            string connectionString,
            ITenantResolver tenantResolver,
            ILogger<PostgreSqlAdapter> logger)
        {
            _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
            _tenantResolver = tenantResolver ?? throw new ArgumentNullException(nameof(tenantResolver));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task SaveReadingAsync(SensorReading reading)
        {
            var tenantId = await _tenantResolver.GetCurrentTenantIdAsync();
            var seriesId = await ResolveSeriesIdAsync(reading.SensorId);

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                INSERT INTO zenin_ts.data_points 
                (tenant_id, series_id, timestamp, value, quality_score, metadata)
                VALUES (@TenantId, @SeriesId, @Timestamp, @Value, @QualityScore, @Metadata::jsonb)
            ";

            await connection.ExecuteAsync(sql, new
            {
                TenantId = tenantId,
                SeriesId = seriesId,
                Timestamp = reading.Timestamp,
                Value = reading.Value,
                QualityScore = 1.0,
                Metadata = System.Text.Json.JsonSerializer.Serialize(new
                {
                    sensor_id = reading.SensorId,
                    device_id = reading.DeviceId,
                    original_timestamp = reading.Timestamp
                })
            });

            _logger.LogDebug("Saved reading to PostgreSQL: series_id={SeriesId}, value={Value}", 
                seriesId, reading.Value);
        }

        public async Task SavePredictionAsync(Prediction prediction)
        {
            var tenantId = await _tenantResolver.GetCurrentTenantIdAsync();
            var seriesId = await ResolveSeriesIdAsync(prediction.SeriesId);
            var modelId = await ResolveModelIdAsync(prediction.SeriesId, prediction.EngineName);

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                INSERT INTO zenin_ml.predictions 
                (tenant_id, model_id, series_id, predicted_value, confidence_score, 
                 confidence_level, trend, horizon_steps, predicted_at, target_timestamp,
                 is_anomaly, anomaly_score, risk_level, explanation, explanation_json, 
                 engine_name, metadata, audit_trace_id)
                VALUES (@TenantId, @ModelId, @SeriesId, @PredictedValue, @ConfidenceScore,
                        @ConfidenceLevel, @Trend, @HorizonSteps, @PredictedAt, @TargetTimestamp,
                        @IsAnomaly, @AnomalyScore, @RiskLevel, @Explanation, @ExplanationJson::jsonb,
                        @EngineName, @Metadata::jsonb, @AuditTraceId)
            ";

            await connection.ExecuteAsync(sql, new
            {
                TenantId = tenantId,
                ModelId = modelId,
                SeriesId = seriesId,
                PredictedValue = prediction.PredictedValue,
                ConfidenceScore = prediction.ConfidenceScore,
                ConfidenceLevel = prediction.ConfidenceLevel.ToString().ToLower(),
                Trend = prediction.Trend,
                HorizonSteps = prediction.HorizonSteps,
                PredictedAt = DateTime.UtcNow,
                TargetTimestamp = DateTime.UtcNow.AddMinutes(prediction.HorizonSteps),
                IsAnomaly = false,
                AnomalyScore = (decimal?)null,
                RiskLevel = "NONE",
                Explanation = "",
                ExplanationJson = prediction.Metadata.ContainsKey("explanation") 
                    ? System.Text.Json.JsonSerializer.Serialize(prediction.Metadata["explanation"]) 
                    : "{}",
                EngineName = prediction.EngineName,
                Metadata = System.Text.Json.JsonSerializer.Serialize(prediction.Metadata),
                AuditTraceId = prediction.AuditTraceId
            });

            _logger.LogDebug("Saved prediction to PostgreSQL: series_id={SeriesId}, value={Value}", 
                seriesId, prediction.PredictedValue);
        }

        public async Task SaveAnomalyAsync(AnomalyResult anomaly)
        {
            var tenantId = await _tenantResolver.GetCurrentTenantIdAsync();
            var seriesId = await ResolveSeriesIdAsync(anomaly.SeriesId);

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                INSERT INTO zenin_ml.anomalies 
                (tenant_id, series_id, detected_at, anomaly_score, severity, 
                 confidence, method_votes, explanation, context, audit_trace_id)
                VALUES (@TenantId, @SeriesId, @DetectedAt, @AnomalyScore, @Severity,
                        @Confidence, @MethodVotes::jsonb, @Explanation, @Context::jsonb, @AuditTraceId)
            ";

            await connection.ExecuteAsync(sql, new
            {
                TenantId = tenantId,
                SeriesId = seriesId,
                DetectedAt = DateTime.UtcNow,
                AnomalyScore = anomaly.Score,
                Severity = anomaly.Severity.ToString().ToLower(),
                Confidence = anomaly.Confidence,
                MethodVotes = System.Text.Json.JsonSerializer.Serialize(anomaly.MethodVotes),
                Explanation = anomaly.Explanation,
                Context = System.Text.Json.JsonSerializer.Serialize(anomaly.Context),
                AuditTraceId = anomaly.AuditTraceId
            });

            _logger.LogDebug("Saved anomaly to PostgreSQL: series_id={SeriesId}, severity={Severity}", 
                seriesId, anomaly.Severity);
        }

        public async Task<List<SensorReading>> GetLatestReadingsAsync(string seriesId, int limit = 100)
        {
            var tenantId = await _tenantResolver.GetCurrentTenantIdAsync();
            var resolvedSeriesId = await ResolveSeriesIdAsync(seriesId);

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    dp.timestamp,
                    dp.value,
                    dp.metadata->>'sensor_id' as sensor_id,
                    dp.metadata->>'device_id' as device_id
                FROM zenin_ts.data_points dp
                WHERE dp.tenant_id = @TenantId
                  AND dp.series_id = @SeriesId
                ORDER BY dp.timestamp DESC
                LIMIT @Limit
            ";

            var results = await connection.QueryAsync<dynamic>(sql, new
            {
                TenantId = tenantId,
                SeriesId = resolvedSeriesId,
                Limit = limit
            });

            return results.Select(r => new SensorReading
            {
                SensorId = r.sensor_id,
                DeviceId = r.device_id,
                Value = (decimal)r.value,
                Timestamp = (DateTime)r.timestamp
            }).ToList();
        }

        public async Task<SeriesProfile> GetSeriesProfileAsync(string seriesId)
        {
            var tenantId = await _tenantResolver.GetCurrentTenantIdAsync();
            var resolvedSeriesId = await ResolveSeriesIdAsync(seriesId);

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT 
                    mean,
                    std_dev,
                    min_value,
                    max_value,
                    volatility_level,
                    stationarity_hint,
                    regime
                FROM zenin_ts.series_profiles
                WHERE series_id = @SeriesId
            ";

            var result = await connection.QueryFirstOrDefaultAsync<dynamic>(sql, new
            {
                SeriesId = resolvedSeriesId
            });

            if (result == null)
            {
                return null;
            }

            return new SeriesProfile
            {
                Mean = result.mean,
                StdDev = result.std_dev,
                MinValue = result.min_value,
                MaxValue = result.max_value,
                VolatilityLevel = result.volatility_level,
                StationarityHint = result.stationarity_hint,
                Regime = result.regime
            };
        }

        /// <summary>
        /// Mapea sensor_id (SQL Server) → series_id (PostgreSQL).
        /// Usa tabla zenin_core.legacy_sensor_mapping.
        /// </summary>
        private async Task<Guid> ResolveSeriesIdAsync(string sensorId)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT series_id 
                FROM zenin_core.legacy_sensor_mapping 
                WHERE sensor_id = @SensorId::bigint
                  AND is_active = true
            ";

            var seriesId = await connection.QueryFirstOrDefaultAsync<Guid?>(sql, new { SensorId = sensorId });

            if (seriesId.HasValue)
            {
                return seriesId.Value;
            }

            // Auto-crear serie si no existe (migración on-the-fly)
            return await CreateSeriesFromSensorAsync(sensorId);
        }

        private async Task<Guid> CreateSeriesFromSensorAsync(string sensorId)
        {
            var tenantId = await _tenantResolver.GetCurrentTenantIdAsync();

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            // 1. Crear serie
            var createSeriesSql = @"
                INSERT INTO zenin_ts.series 
                (tenant_id, series_key, name, data_type, source_type, source_id)
                VALUES (@TenantId, @SeriesKey, @Name, 'numeric', 'iot_sensor', @SourceId)
                RETURNING id
            ";

            var seriesId = await connection.QuerySingleAsync<Guid>(createSeriesSql, new
            {
                TenantId = tenantId,
                SeriesKey = $"sensor_{sensorId}",
                Name = $"Sensor {sensorId}",
                SourceId = sensorId
            });

            // 2. Crear mapeo
            var createMappingSql = @"
                INSERT INTO zenin_core.legacy_sensor_mapping 
                (tenant_id, sensor_id, series_id)
                VALUES (@TenantId, @SensorId::bigint, @SeriesId)
            ";

            await connection.ExecuteAsync(createMappingSql, new
            {
                TenantId = tenantId,
                SensorId = sensorId,
                SeriesId = seriesId
            });

            _logger.LogInformation("Auto-created series {SeriesId} for sensor {SensorId}", 
                seriesId, sensorId);

            return seriesId;
        }

        private async Task<Guid> ResolveModelIdAsync(string seriesId, string engineName)
        {
            var tenantId = await _tenantResolver.GetCurrentTenantIdAsync();
            var resolvedSeriesId = await ResolveSeriesIdAsync(seriesId);

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT id 
                FROM zenin_ml.models 
                WHERE tenant_id = @TenantId
                  AND series_id = @SeriesId
                  AND engine_name = @EngineName
                  AND is_active = true
                LIMIT 1
            ";

            var modelId = await connection.QueryFirstOrDefaultAsync<Guid?>(sql, new
            {
                TenantId = tenantId,
                SeriesId = resolvedSeriesId,
                EngineName = engineName
            });

            if (modelId.HasValue)
            {
                return modelId.Value;
            }

            // Auto-crear modelo si no existe
            var createModelSql = @"
                INSERT INTO zenin_ml.models 
                (tenant_id, series_id, name, engine_name, version, is_active)
                VALUES (@TenantId, @SeriesId, @Name, @EngineName, '1.0', true)
                RETURNING id
            ";

            return await connection.QuerySingleAsync<Guid>(createModelSql, new
            {
                TenantId = tenantId,
                SeriesId = resolvedSeriesId,
                Name = $"{engineName} Model",
                EngineName = engineName
            });
        }
    }
}
