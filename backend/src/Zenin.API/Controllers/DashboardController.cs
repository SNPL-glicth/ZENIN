using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Zenin.Application.Features.Dashboard.Queries;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public DashboardController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (tenantIdClaim == null || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "tenant_id claim missing or invalid" });
        }

        var result = await _mediator.Send(new GetOverviewQuery(tenantId));
        return Ok(result);
    }
}
