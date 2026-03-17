using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zenin.Application.Features.Query.Commands;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/query")]
[Authorize]
public class QueryController : ControllerBase
{
    private readonly IMediator _mediator;

    public QueryController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Ask a question about processed data.
    /// Searches SQL Server analysis results and ML semantic search.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Query([FromBody] QueryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest(new { message = "Question is required" });

        var tenantId = GetTenantId();
        if (tenantId == null)
            return Unauthorized(new { message = "Invalid token claims" });

        var command = new QueryCommand(request.Question, tenantId.Value);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.ErrorMessage });

        return Ok(result.Data);
    }

    private Guid? GetTenantId() =>
        Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var id) ? id : null;
}

public record QueryRequest(string Question);
