using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Zenin.Application.DTOs;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class MLHealthRepository
{
    private readonly string _connectionString;

    public MLHealthRepository(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
    }

    public async Task<MLHealthDto> GetHealthAsync(Guid tenantId)
    {
        // Temporarily return static health data to avoid querying IoT tables
        // that don't exist in zenin_db. Re-enable queries once ML tables
        // are migrated or use zenin_ml schema.
        return await Task.FromResult(new MLHealthDto
        {
            Status = "healthy",
            PredictionsTotal = 0,
            AnomaliesTotal = 0,
            LastPredictionAt = null
        });
        
        /* Original implementation - disabled for zenin_db compatibility
        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        var dto = new MLHealthDto { Status = "healthy" };

        // Count predictions
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT COUNT(*), MAX(p.predicted_at)
                FROM dbo.predictions p
                JOIN dbo.sensors s ON p.sensor_id = s.id
                WHERE s.tenant_id = @tenantId";
            cmd.Parameters.AddWithValue("@tenantId", tenantId);

            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                dto.PredictionsTotal = reader.GetInt32(0);
                dto.LastPredictionAt = reader.IsDBNull(1) ? null : reader.GetDateTime(1);
            }
        }

        // Count anomalies
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT COUNT(*)
                FROM dbo.ml_events m
                JOIN dbo.sensors s ON m.sensor_id = s.id
                WHERE s.tenant_id = @tenantId
                  AND m.event_code = 'ANOMALY_DETECTED'";
            cmd.Parameters.AddWithValue("@tenantId", tenantId);

            var result = await cmd.ExecuteScalarAsync();
            dto.AnomaliesTotal = Convert.ToInt32(result);
        }

        // Determine status
        if (dto.PredictionsTotal == 0 && dto.AnomaliesTotal == 0)
        {
            dto.Status = "no_data";
        }
        else if (dto.LastPredictionAt.HasValue && 
                 (DateTime.UtcNow - dto.LastPredictionAt.Value).TotalHours > 24)
        {
            dto.Status = "stale";
        }

        return dto;
        */
    }
}
