using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Zenin.Domain.Entities;
using Zenin.Infrastructure.FeatureFlags;

namespace Zenin.Infrastructure.Adapters
{
    /// <summary>
    /// Adapter que escribe en ambos backends (SQL Server + PostgreSQL).
    /// 
    /// Estrategia:
    /// 1. Escribe primero en SQL Server (legacy, source of truth)
    /// 2. Escribe en PostgreSQL (nuevo, async, best effort)
    /// 3. Si PostgreSQL falla, solo loguea (no bloquea)
    /// 
    /// Permite migración incremental sin downtime.
    /// </summary>
    public class DualWriteAdapter : IStorageAdapter
    {
        private readonly IStorageAdapter _sqlServerAdapter;
        private readonly IStorageAdapter _postgreSqlAdapter;
        private readonly IFeatureFlagService _featureFlags;
        private readonly ILogger<DualWriteAdapter> _logger;

        public DualWriteAdapter(
            IStorageAdapter sqlServerAdapter,
            IStorageAdapter postgreSqlAdapter,
            IFeatureFlagService featureFlags,
            ILogger<DualWriteAdapter> logger)
        {
            _sqlServerAdapter = sqlServerAdapter ?? throw new ArgumentNullException(nameof(sqlServerAdapter));
            _postgreSqlAdapter = postgreSqlAdapter ?? throw new ArgumentNullException(nameof(postgreSqlAdapter));
            _featureFlags = featureFlags ?? throw new ArgumentNullException(nameof(featureFlags));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task SaveReadingAsync(SensorReading reading)
        {
            // 1. SQL Server (blocking, critical path)
            await _sqlServerAdapter.SaveReadingAsync(reading);

            // 2. PostgreSQL (non-blocking, best effort)
            if (await _featureFlags.IsEnabledAsync("postgresql_dual_write"))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _postgreSqlAdapter.SaveReadingAsync(reading);
                        _logger.LogDebug("PostgreSQL write successful for reading {ReadingId}", reading.Id);
                    }
                    catch (Exception ex)
                    {
                        // Log pero NO falla
                        _logger.LogWarning(ex, 
                            "PostgreSQL write failed for reading {ReadingId}. SQL Server write succeeded.", 
                            reading.Id);
                    }
                });
            }
        }

        public async Task SavePredictionAsync(Prediction prediction)
        {
            // Mismo patrón: SQL Server primero, PostgreSQL async
            await _sqlServerAdapter.SavePredictionAsync(prediction);

            if (await _featureFlags.IsEnabledAsync("postgresql_dual_write"))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _postgreSqlAdapter.SavePredictionAsync(prediction);
                        _logger.LogDebug("PostgreSQL write successful for prediction {PredictionId}", prediction.Id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, 
                            "PostgreSQL write failed for prediction {PredictionId}. SQL Server write succeeded.", 
                            prediction.Id);
                    }
                });
            }
        }

        public async Task SaveAnomalyAsync(AnomalyResult anomaly)
        {
            await _sqlServerAdapter.SaveAnomalyAsync(anomaly);

            if (await _featureFlags.IsEnabledAsync("postgresql_dual_write"))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _postgreSqlAdapter.SaveAnomalyAsync(anomaly);
                        _logger.LogDebug("PostgreSQL write successful for anomaly {AnomalyId}", anomaly.SeriesId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, 
                            "PostgreSQL write failed for anomaly {SeriesId}. SQL Server write succeeded.", 
                            anomaly.SeriesId);
                    }
                });
            }
        }

        public async Task<List<SensorReading>> GetLatestReadingsAsync(string seriesId, int limit = 100)
        {
            // Leer desde backend activo según feature flag
            var readPercentage = await _featureFlags.GetValueAsync<int>("postgresql_read_percentage", 0);

            if (readPercentage >= 100)
            {
                // 100% PostgreSQL
                return await _postgreSqlAdapter.GetLatestReadingsAsync(seriesId, limit);
            }
            else if (readPercentage > 0)
            {
                // Canary: X% PostgreSQL, resto SQL Server
                var random = new Random().Next(100);
                if (random < readPercentage)
                {
                    _logger.LogDebug("Reading from PostgreSQL (canary {Percentage}%)", readPercentage);
                    return await _postgreSqlAdapter.GetLatestReadingsAsync(seriesId, limit);
                }
            }

            // Default: SQL Server
            return await _sqlServerAdapter.GetLatestReadingsAsync(seriesId, limit);
        }

        public async Task<SeriesProfile> GetSeriesProfileAsync(string seriesId)
        {
            var readPercentage = await _featureFlags.GetValueAsync<int>("postgresql_read_percentage", 0);

            if (readPercentage >= 100)
            {
                return await _postgreSqlAdapter.GetSeriesProfileAsync(seriesId);
            }
            else if (readPercentage > 0)
            {
                var random = new Random().Next(100);
                if (random < readPercentage)
                {
                    return await _postgreSqlAdapter.GetSeriesProfileAsync(seriesId);
                }
            }

            return await _sqlServerAdapter.GetSeriesProfileAsync(seriesId);
        }
    }
}
