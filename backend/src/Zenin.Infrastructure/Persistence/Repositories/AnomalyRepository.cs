using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using Zenin.Application.DTOs;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class AnomalyRepository
{
    private readonly string _connectionString;

    public AnomalyRepository(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
    }

    public async Task<List<AnomalyDto>> GetRecentByTenantAsync(Guid tenantId, int limit = 20)
    {
        var anomalies = new List<AnomalyDto>();

        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT TOP (@limit)
                a.Id,
                a.SeriesId,
                a.DetectedAt,
                a.Severity,
                a.AnomalyScore,
                a.Confidence,
                a.MethodVotes,
                a.Explanation,
                a.AuditTraceId
            FROM zenin_ml.anomalies a
            WHERE a.TenantId = @tenantId
            ORDER BY a.DetectedAt DESC";

        cmd.Parameters.AddWithValue("@tenantId", tenantId);
        cmd.Parameters.AddWithValue("@limit", limit);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            anomalies.Add(MapReaderToDto(reader));
        }

        return anomalies;
    }

    public async Task<List<AnomalyDto>> GetBySeriesAsync(Guid tenantId, string seriesId, int limit = 50)
    {
        var anomalies = new List<AnomalyDto>();

        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT TOP (@limit)
                a.Id,
                a.SeriesId,
                a.DetectedAt,
                a.Severity,
                a.AnomalyScore,
                a.Confidence,
                a.MethodVotes,
                a.Explanation,
                a.AuditTraceId
            FROM zenin_ml.anomalies a
            WHERE a.TenantId = @tenantId
              AND a.SeriesId = @seriesId
            ORDER BY a.DetectedAt DESC";

        cmd.Parameters.AddWithValue("@tenantId", tenantId);
        cmd.Parameters.AddWithValue("@seriesId", seriesId);
        cmd.Parameters.AddWithValue("@limit", limit);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            anomalies.Add(MapReaderToDto(reader));
        }

        return anomalies;
    }

    public async Task<int> CountAsync(Guid tenantId, string? severity = null)
    {
        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        var sql = @"
            SELECT COUNT(*)
            FROM zenin_ml.anomalies
            WHERE TenantId = @tenantId";

        if (!string.IsNullOrEmpty(severity))
        {
            sql += " AND Severity = @severity";
            cmd.Parameters.AddWithValue("@severity", severity);
        }

        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("@tenantId", tenantId);

        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    private static AnomalyDto MapReaderToDto(SqlDataReader reader)
    {
        var methodVotesJson = reader.IsDBNull(6) ? null : reader.GetString(6);
        Dictionary<string, decimal>? methodVotes = null;
        if (!string.IsNullOrEmpty(methodVotesJson))
        {
            try
            {
                methodVotes = JsonSerializer.Deserialize<Dictionary<string, decimal>>(methodVotesJson);
            }
            catch { }
        }

        var auditTraceId = reader.IsDBNull(8) ? (Guid?)null : reader.GetGuid(8);

        return new AnomalyDto
        {
            Id = reader.GetGuid(0).GetHashCode(),
            SeriesId = reader.GetGuid(1).ToString(),
            DetectedAt = reader.GetDateTime(2),
            Severity = reader.GetString(3).ToUpper(),
            AnomalyScore = reader.GetDecimal(4),
            AnomalyConfidence = reader.IsDBNull(5) ? 0 : reader.GetDecimal(5),
            MethodVotes = methodVotes,
            Explanation = reader.IsDBNull(7) ? "" : reader.GetString(7),
            AuditTraceId = auditTraceId
        };
    }
}
