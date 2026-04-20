using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zenin.Application.Features.Documents.Commands;
using Zenin.Infrastructure.Persistence.Repositories;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/predictions")]
[Authorize]
public class PredictionsController : ControllerBase
{
    private readonly PredictionRepository _predictionRepository;

    public PredictionsController(PredictionRepository predictionRepository)
    {
        _predictionRepository = predictionRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetPredictions(
        [FromQuery] string? seriesId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        if (!string.IsNullOrEmpty(seriesId))
        {
            var predictions = await _predictionRepository.GetBySeriesAsync(tenantId.Value, seriesId, pageSize);
            return Ok(new { predictions, total = predictions.Count });
        }

        var allPredictions = await _predictionRepository.GetRecentByTenantAsync(tenantId.Value, pageSize);
        return Ok(new { predictions = allPredictions, total = allPredictions.Count });
    }

    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent([FromQuery] int limit = 20)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var predictions = await _predictionRepository.GetRecentByTenantAsync(tenantId.Value, limit);
        return Ok(predictions);
    }

    [HttpGet("{id}/trace")]
    public async Task<IActionResult> GetTrace(int id)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        // Get prediction and return explanation as trace
        var predictions = await _predictionRepository.GetRecentByTenantAsync(tenantId.Value, 100);
        var prediction = predictions.FirstOrDefault(p => p.Id == id);

        if (prediction == null)
            return NotFound(new { message = "Prediction not found" });

        var trace = new
        {
            prediction.Id,
            prediction.SeriesId,
            prediction.SelectedEngine,
            prediction.PredictedAt,
            explanation = prediction.Explanation ?? "No explanation available",
            phases = new[]
            {
                new { kind = "PREDICT", summary = $"Prediction by {prediction.SelectedEngine}", durationMs = 0 }
            },
            raw = new
            {
                prediction.Trend,
                prediction.RiskLevel,
                prediction.Severity,
                prediction.Confidence
            }
        };

        return Ok(trace);
    }

    /// <summary>
    /// Delete prediction (soft delete).
    /// Admin only, tenant-scoped.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeletePrediction(int id)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var deleted = await _predictionRepository.SoftDeleteByIdAsync(id, tenantId.Value);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>
    /// Bulk delete predictions (soft delete).
    /// Admin only, tenant-scoped.
    /// </summary>
    [HttpDelete("bulk")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> BulkDeletePredictions([FromBody] BulkDeletePredictionsRequest request)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var count = await _predictionRepository.BulkSoftDeleteAsync(request.Ids, tenantId.Value);
        return Ok(new { deletedCount = count });
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;
}

public class BulkDeletePredictionsRequest
{
    public List<int> Ids { get; set; } = new();
}
