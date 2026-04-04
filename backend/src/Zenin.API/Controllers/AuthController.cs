using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Zenin.Application.Features.Auth.Commands.Login;
using Zenin.Application.Features.Auth.Commands.Register;

namespace Zenin.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IMediator mediator, ILogger<AuthController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        _logger.LogInformation("[AUTH] Register iniciado: email={email}", request?.Email);
        
        var command = new RegisterCommand(
            request.Email,
            request.Password,
            request.FirstName,
            request.LastName
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            _logger.LogWarning("[AUTH] Register falló: email={email}, error={error}", request.Email, result.ErrorMessage);
            return BadRequest(new { error = result.ErrorMessage, errors = result.Errors });
        }

        _logger.LogInformation("[AUTH] Register exitoso: email={email}, userId={userId}", request.Email, result.Data?.UserId);
        return Ok(result.Data);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";
        var userAgent = HttpContext.Request.Headers.UserAgent.ToString();

        _logger.LogInformation("[AUTH] Login iniciado: email={email}, ip={ip}", request?.Email, ipAddress);

        var command = new LoginCommand(
            request.Email,
            request.Password,
            ipAddress,
            userAgent
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            _logger.LogWarning("[AUTH] Login falló: email={email}, ip={ip}, error={error}", request.Email, ipAddress, result.ErrorMessage);
            return Unauthorized(new { error = result.ErrorMessage });
        }

        _logger.LogInformation("[AUTH] Login exitoso: email={email}, userId={userId}, role={role}", 
            request.Email, result.Data?.UserId, result.Data?.Role);
        return Ok(result.Data);
    }
}

public record RegisterRequest(string Email, string Password, string FirstName, string LastName);
public record LoginRequest(string Email, string Password);
