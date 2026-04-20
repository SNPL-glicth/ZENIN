using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zenin.Application.Features.Documents.Commands;
using Zenin.Application.Features.Documents.Queries;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DocumentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

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
            return Unauthorized();

        var command = new UploadDocumentCommand(file, tenantId.Value, userId.Value);
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var query = new ListDocumentsQuery(tenantId.Value, page, pageSize, status);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var query = new GetDocumentQuery(id, tenantId.Value);
        var result = await _mediator.Send(query);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Get ML analysis history for documents (text/numeric/mixed).
    /// Separate from /api/predictions which is for IoT sensor predictions.
    /// </summary>
    [HttpGet("analyses")]
    public async Task<IActionResult> GetAnalyses(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var query = new ListDocumentAnalysesQuery(tenantId.Value, page, pageSize, status);
        var result = await _mediator.Send(query);
        return Ok(new { analyses = result, total = result.Count });
    }

    /// <summary>
    /// Delete document and its analysis (soft delete).
    /// Also removes from Weaviate if WeaviateDocId exists.
    /// Admin only, tenant-scoped.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var command = new DeleteDocumentCommand(id, tenantId.Value);
        var deleted = await _mediator.Send(command);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>
    /// Delete analysis only (soft delete).
    /// Admin only, tenant-scoped.
    /// </summary>
    [HttpDelete("analyses/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteAnalysis(Guid id)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var command = new DeleteAnalysisCommand(id, tenantId.Value);
        var deleted = await _mediator.Send(command);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>
    /// Bulk delete analyses (soft delete).
    /// Admin only, tenant-scoped.
    /// </summary>
    [HttpDelete("analyses/bulk")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> BulkDeleteAnalyses([FromBody] BulkDeleteRequest request)
    {
        var tenantId = GetTenantId();
        if (tenantId == null) return Unauthorized();

        var command = new BulkDeleteAnalysesCommand(request.Ids, tenantId.Value);
        var count = await _mediator.Send(command);
        return Ok(new { deletedCount = count });
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirst("sub")?.Value ?? User.FindFirst("user_id")?.Value, out var id) ? id : null;
}
