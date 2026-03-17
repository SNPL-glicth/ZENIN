using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zenin.Application.Features.Ingest.Commands;
using Zenin.Domain.Interfaces;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/ingest")]
[Authorize]
public class IngestController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IUnitOfWork _unitOfWork;

    public IngestController(IMediator mediator, IUnitOfWork unitOfWork)
    {
        _mediator = mediator;
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Upload and process a file in memory. No raw file is stored.
    /// Returns immediately with status=pending; frontend polls analysis/{id}.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(524_288_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 524_288_000)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided" });

        var tenantId = GetTenantId();
        var userId = GetUserId();
        if (tenantId == null || userId == null)
            return Unauthorized(new { message = "Invalid token claims" });

        var command = new IngestFileCommand(file, tenantId.Value, userId.Value);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.ErrorMessage });

        return Ok(result.Data);
    }

    /// <summary>
    /// Poll for analysis result. Frontend calls this until status != pending.
    /// ML Service poller fills in MlResult, Conclusion, and sets status=analyzed.
    /// </summary>
    [HttpGet("analysis/{id:guid}")]
    public async Task<IActionResult> GetAnalysisResult(Guid id)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var result = await _unitOfWork.AnalysisResults.GetByIdAsync(id);
        if (result == null)
            return NotFound(new { message = "Analysis result not found" });

        if (result.TenantId != tenantId.Value)
            return Forbid();

        return Ok(new
        {
            analysisId = result.Id,
            filename = result.OriginalFilename,
            classification = result.Classification,
            status = result.Status,
            numericSummary = result.NumericSummary != null
                ? JsonSerializer.Deserialize<object>(result.NumericSummary)
                : null,
            textSummary = result.TextSummary != null
                ? JsonSerializer.Deserialize<object>(result.TextSummary)
                : null,
            mlResult = result.MlResult != null
                ? JsonSerializer.Deserialize<object>(result.MlResult)
                : null,
            conclusion = result.Conclusion,
            analyzedAt = result.AnalyzedAt,
        });
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirst("sub")?.Value ?? User.FindFirst("user_id")?.Value, out var id) ? id : null;
}
