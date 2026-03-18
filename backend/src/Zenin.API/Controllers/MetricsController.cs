using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Text.Json;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/metrics")]
[Authorize]
public class MetricsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public MetricsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Get summary metrics for dashboard cards
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            await using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT 
                    total_analyses,
                    total_files,
                    total_size_bytes,
                    analyses_this_week,
                    analyses_today,
                    completion_rate_percent,
                    error_rate_percent,
                    avg_processing_seconds,
                    last_activity,
                    classification_breakdown,
                    status_breakdown
                FROM zenin_metrics.summary_cache
                WHERE tenant_id = @tenantId;
            ";
            command.Parameters.AddWithValue("@tenantId", tenantId.Value);

            await using var reader = await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return Ok(new
                {
                    totalAnalyses = 0,
                    totalFiles = 0,
                    totalSizeBytes = 0,
                    analysesThisWeek = 0,
                    analysesToday = 0,
                    completionRatePercent = (decimal?)null,
                    errorRatePercent = (decimal?)null,
                    avgProcessingSeconds = (decimal?)null,
                    lastActivity = (DateTime?)null,
                    classificationBreakdown = new { },
                    statusBreakdown = new { }
                });
            }

            var classificationJson = reader.IsDBNull(9) ? "{}" : reader.GetString(9);
            var statusJson = reader.IsDBNull(10) ? "{}" : reader.GetString(10);

            return Ok(new
            {
                totalAnalyses = reader.GetInt32(0),
                totalFiles = reader.GetInt32(1),
                totalSizeBytes = reader.GetInt64(2),
                analysesThisWeek = reader.GetInt32(3),
                analysesToday = reader.GetInt32(4),
                completionRatePercent = reader.IsDBNull(5) ? (decimal?)null : reader.GetDecimal(5),
                errorRatePercent = reader.IsDBNull(6) ? (decimal?)null : reader.GetDecimal(6),
                avgProcessingSeconds = reader.IsDBNull(7) ? (decimal?)null : reader.GetDecimal(7),
                lastActivity = reader.IsDBNull(8) ? (DateTime?)null : reader.GetDateTime(8),
                classificationBreakdown = JsonSerializer.Deserialize<object>(classificationJson),
                statusBreakdown = JsonSerializer.Deserialize<object>(statusJson)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Error fetching summary: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get LTTB-processed chart data for specific metric type
    /// </summary>
    [HttpGet("chart-data")]
    public async Task<IActionResult> GetChartData(
        [FromQuery] string type,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(type))
            return BadRequest(new { error = "type parameter is required" });

        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            await using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT TOP 1
                    metric_type,
                    series_key,
                    data_points,
                    period_start,
                    period_end,
                    computed_at,
                    original_point_count,
                    lttb_applied
                FROM zenin_metrics.chart_data
                WHERE tenant_id = @tenantId
                  AND metric_type = @type
                ORDER BY computed_at DESC;
            ";
            command.Parameters.AddWithValue("@tenantId", tenantId.Value);
            command.Parameters.AddWithValue("@type", type);

            await using var reader = await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return Ok(new
                {
                    metricType = type,
                    seriesKey = tenantId.Value.ToString(),
                    dataPoints = new object[] { },
                    periodStart = from ?? DateTime.UtcNow.AddDays(-30),
                    periodEnd = to ?? DateTime.UtcNow,
                    computedAt = DateTime.UtcNow,
                    originalPointCount = 0,
                    lttbApplied = false
                });
            }

            var dataPointsJson = reader.GetString(2);
            var dataPoints = JsonSerializer.Deserialize<object>(dataPointsJson);

            return Ok(new
            {
                metricType = reader.GetString(0),
                seriesKey = reader.GetString(1),
                dataPoints = dataPoints,
                periodStart = reader.GetDateTime(3),
                periodEnd = reader.GetDateTime(4),
                computedAt = reader.GetDateTime(5),
                originalPointCount = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                lttbApplied = reader.GetBoolean(7)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Error fetching chart data: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get recent analyses for dashboard activity section
    /// </summary>
    [HttpGet("recent-activity")]
    public async Task<IActionResult> GetRecentActivity([FromQuery] int limit = 10)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        if (limit < 1 || limit > 50) limit = 10;

        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            await using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT TOP (@limit)
                    Id,
                    OriginalFilename,
                    Classification,
                    Status,
                    CreatedAt,
                    AnalyzedAt
                FROM zenin_docs.analysis_results
                WHERE TenantId = @tenantId
                  AND IsDeleted = 0
                ORDER BY CreatedAt DESC;
            ";
            command.Parameters.AddWithValue("@tenantId", tenantId.Value);
            command.Parameters.AddWithValue("@limit", limit);

            await using var reader = await command.ExecuteReaderAsync();

            var activities = new List<object>();
            while (await reader.ReadAsync())
            {
                var createdAt = reader.GetDateTime(4);
                var analyzedAt = reader.IsDBNull(5) ? (DateTime?)null : reader.GetDateTime(5);
                var processingTimeSeconds = analyzedAt.HasValue
                    ? (analyzedAt.Value - createdAt).TotalSeconds
                    : (double?)null;

                activities.Add(new
                {
                    id = reader.GetGuid(0),
                    filename = reader.GetString(1),
                    classification = reader.GetString(2),
                    status = reader.GetString(3),
                    createdAt = createdAt,
                    analyzedAt = analyzedAt,
                    processingTimeSeconds = processingTimeSeconds
                });
            }

            return Ok(new { recentAnalyses = activities });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Error fetching recent activity: {ex.Message}" });
        }
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;
}
