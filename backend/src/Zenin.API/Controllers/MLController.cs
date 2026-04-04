using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zenin.Infrastructure.Persistence.Repositories;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize]
public class MLController : ControllerBase
{
    private readonly MLHealthRepository _healthRepository;

    public MLController(MLHealthRepository healthRepository)
    {
        _healthRepository = healthRepository;
    }

    [HttpGet("health")]
    public async Task<IActionResult> GetHealth()
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var health = await _healthRepository.GetHealthAsync(tenantId.Value);
        return Ok(health);
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var health = await _healthRepository.GetHealthAsync(tenantId.Value);
        
        var metrics = new
        {
            predictionsLastHour = 0, // Would need time-series query
            predictionsLastDay = 0,
            anomaliesLastDay = health.AnomaliesTotal,
            averageLatencyMs = 0, // Not tracked in current schema
            engineDistribution = new Dictionary<string, double>()
        };

        return Ok(metrics);
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;
}
