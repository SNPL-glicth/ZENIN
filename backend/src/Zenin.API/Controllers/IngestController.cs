using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Zenin.Application.Features.Ingest.Commands;
using Zenin.Application.Features.Ingest.Queries;
using Zenin.Domain.Interfaces;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/ingest")]
[Authorize]
public class IngestController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<IngestController> _logger;

    public IngestController(IMediator mediator, IUnitOfWork unitOfWork, ILogger<IngestController> logger)
    {
        _mediator = mediator;
        _unitOfWork = unitOfWork;
        _logger = logger;
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
        _logger.LogInformation("[INGEST-API] Upload iniciado: filename={filename}, size={size}", 
            file?.FileName, file?.Length);
        
        if (file == null || file.Length == 0)
        {
            _logger.LogWarning("[INGEST-API] Upload rechazado: archivo vacío o null");
            return BadRequest(new { message = "No file provided" });
        }

        var tenantId = GetTenantId();
        var userId = GetUserId();
        
        _logger.LogInformation("[INGEST-API] TenantId={tenantId}, UserId={userId}", tenantId, userId);
        
        if (tenantId == null || userId == null)
        {
            _logger.LogWarning("[INGEST-API] Upload rechazado: claims inválidos - TenantId={tenantId}, UserId={userId}", tenantId, userId);
            return Unauthorized(new { message = "Invalid token claims" });
        }

        _logger.LogInformation("[INGEST-API] Enviando command a MediatR...");
        var command = new IngestFileCommand(file, tenantId.Value, userId.Value);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            _logger.LogError("[INGEST-API] Command falló: {error}", result.ErrorMessage);
            return BadRequest(new { error = result.ErrorMessage });
        }

        _logger.LogInformation("[INGEST-API] Upload exitoso: analysisId={analysisId}, queueId={queueId}", 
            result.Data?.AnalysisId, result.Data?.QueueId);
        return Ok(result.Data);
    }

    /// <summary>
    /// Poll for analysis result. Frontend calls this until status != pending.
    /// ML Service poller fills in MlResult, Conclusion, and sets status=analyzed.
    /// </summary>
    [HttpGet("analysis/{id:guid}")]
    public async Task<IActionResult> GetAnalysisResult(Guid id)
    {
        _logger.LogInformation("[INGEST-API] GetAnalysisResult: id={id}", id);
        
        var tenantId = GetTenantId();
        if (tenantId == null) 
        {
            _logger.LogWarning("[INGEST-API] GetAnalysisResult rechazado: sin TenantId");
            return Unauthorized();
        }

        var result = await _unitOfWork.AnalysisResults.GetByIdAsync(id);
        if (result == null)
        {
            _logger.LogWarning("[INGEST-API] GetAnalysisResult: no encontrado id={id}", id);
            return NotFound(new { message = "Analysis result not found" });
        }

        if (result.TenantId != tenantId.Value)
        {
            _logger.LogWarning("[INGEST-API] GetAnalysisResult: acceso denegado id={id}, tenant={tenant}", id, tenantId);
            return Forbid();
        }

        _logger.LogInformation("[INGEST-API] GetAnalysisResult: encontrado id={id}, status={status}", id, result.Status);
        return Ok(new
        {
            analysisId = result.Id,
            filename = result.OriginalFilename,
            semanticName = result.SemanticName,
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

    /// <summary>
    /// Get all analyses for the tenant (paginated).
    /// </summary>
    [HttpGet("analyses")]
    public async Task<IActionResult> GetAnalyses([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var tenantId = GetTenantId();
        _logger.LogInformation("[INGEST-API] GetAnalyses: tenantId={tenantId}, page={page}, pageSize={pageSize}", tenantId, page, pageSize);
        
        if (tenantId == null) 
        {
            _logger.LogWarning("[INGEST-API] GetAnalyses rechazado: sin TenantId");
            return Unauthorized();
        }

        var query = new GetAnalysesQuery(tenantId.Value, page, pageSize);
        var result = await _mediator.Send(query);
        
        _logger.LogInformation("[INGEST-API] GetAnalyses: retornando {count} análisis", result?.Analyses?.Count ?? 0);
        return Ok(result);
    }

    /// <summary>
    /// Get dashboard stats for analyses.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var query = new GetAnalysesStatsQuery(tenantId.Value);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Delete all analyses for the tenant.
    /// </summary>
    [HttpDelete("analyses")]
    public async Task<IActionResult> DeleteAllAnalyses()
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var command = new DeleteAnalysesCommand(tenantId.Value);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.ErrorMessage });

        return Ok(new { message = "All analyses deleted successfully" });
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirst("sub")?.Value ?? User.FindFirst("user_id")?.Value, out var id) ? id : null;
}
