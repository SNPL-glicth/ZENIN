using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Zenin.Application.DTOs;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class PredictionRepository
{
    private readonly string _connectionString;

    public PredictionRepository(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
    }

    public async Task<List<PredictionDto>> GetRecentByTenantAsync(Guid tenantId, int limit = 20)
    {
        var predictions = new List<PredictionDto>();

        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT TOP (@limit)
                p.Id,
                p.SeriesId,
                p.PredictedValue,
                p.ConfidenceScore,
                p.Trend,
                p.EngineName,
                p.RiskLevel,
                p.Explanation,
                p.IsAnomaly,
                p.AnomalyScore,
                p.PredictedAt,
                p.TargetTimestamp
            FROM zenin_ml.predictions p
            WHERE p.TenantId = @tenantId
            ORDER BY p.PredictedAt DESC";

        cmd.Parameters.AddWithValue("@tenantId", tenantId);
        cmd.Parameters.AddWithValue("@limit", limit);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            predictions.Add(MapReaderToDto(reader));
        }

        return predictions;
    }

    public async Task<List<PredictionDto>> GetBySeriesAsync(Guid tenantId, string seriesId, int limit = 50)
    {
        var predictions = new List<PredictionDto>();

        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT TOP (@limit)
                p.Id,
                p.SeriesId,
                p.PredictedValue,
                p.ConfidenceScore,
                p.Trend,
                p.EngineName,
                p.RiskLevel,
                p.Explanation,
                p.IsAnomaly,
                p.AnomalyScore,
                p.PredictedAt,
                p.TargetTimestamp
            FROM zenin_ml.predictions p
            WHERE p.TenantId = @tenantId AND p.SeriesId = @seriesId
            ORDER BY p.PredictedAt DESC";

        cmd.Parameters.AddWithValue("@tenantId", tenantId);
        cmd.Parameters.AddWithValue("@seriesId", seriesId);
        cmd.Parameters.AddWithValue("@limit", limit);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            predictions.Add(MapReaderToDto(reader));
        }

        return predictions;
    }

    public async Task<int> CountAsync(Guid tenantId)
    {
        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT COUNT(*)
            FROM zenin_ml.predictions
            WHERE TenantId = @tenantId";

        cmd.Parameters.AddWithValue("@tenantId", tenantId);

        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    private static PredictionDto MapReaderToDto(SqlDataReader reader)
    {
        return new PredictionDto
        {
            Id = reader.GetGuid(0).GetHashCode(),
            SeriesId = reader.GetGuid(1).ToString(),
            PredictedValue = reader.GetDecimal(2),
            Confidence = reader.GetDecimal(3),
            Trend = reader.IsDBNull(4) ? "stable" : reader.GetString(4),
            SelectedEngine = reader.IsDBNull(5) ? "" : reader.GetString(5),
            RiskLevel = reader.IsDBNull(6) ? "NONE" : reader.GetString(6),
            Explanation = reader.IsDBNull(7) ? null : reader.GetString(7),
            IsAnomaly = reader.GetBoolean(8),
            AnomalyScore = reader.IsDBNull(9) ? 0 : reader.GetDecimal(9),
            PredictedAt = reader.GetDateTime(10),
            TargetTimestamp = reader.IsDBNull(11) ? null : reader.GetDateTime(11)
        };
    }
}
