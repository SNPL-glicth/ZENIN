using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zenin.Infrastructure.Persistence.Repositories;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/anomalies")]
[Authorize]
public class AnomaliesController : ControllerBase
{
    private readonly AnomalyRepository _anomalyRepository;

    public AnomaliesController(AnomalyRepository anomalyRepository)
    {
        _anomalyRepository = anomalyRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAnomalies(
        [FromQuery] string? seriesId = null,
        [FromQuery] string? severity = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        if (!string.IsNullOrEmpty(seriesId))
        {
            var anomalies = await _anomalyRepository.GetBySeriesAsync(tenantId.Value, seriesId, pageSize);
            return Ok(new { anomalies, total = anomalies.Count });
        }

        if (!string.IsNullOrEmpty(severity))
        {
            var all = await _anomalyRepository.GetRecentByTenantAsync(tenantId.Value, 100);
            var filtered = all.Where(a => a.Severity.Equals(severity, StringComparison.OrdinalIgnoreCase)).ToList();
            return Ok(new { anomalies = filtered.Take(pageSize), total = filtered.Count });
        }

        var recent = await _anomalyRepository.GetRecentByTenantAsync(tenantId.Value, pageSize);
        return Ok(new { anomalies = recent, total = recent.Count });
    }

    [HttpGet("series/{seriesId}")]
    public async Task<IActionResult> GetBySeries(string seriesId, [FromQuery] int limit = 50)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var anomalies = await _anomalyRepository.GetBySeriesAsync(tenantId.Value, seriesId, limit);
        return Ok(new { seriesId, anomalies, count = anomalies.Count });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var total = await _anomalyRepository.CountAsync(tenantId.Value);
        var critical = await _anomalyRepository.CountAsync(tenantId.Value, "critical");
        var warning = await _anomalyRepository.CountAsync(tenantId.Value, "warning");

        return Ok(new { total, critical, warning });
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;
}
