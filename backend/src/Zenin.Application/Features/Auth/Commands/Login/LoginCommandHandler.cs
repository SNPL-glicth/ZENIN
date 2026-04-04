using MediatR;
using Microsoft.Extensions.Logging;
using Zenin.Application.Common.Interfaces;
using Zenin.Application.Common.Models;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<LoginResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IAuditService _auditService;
    private readonly ILogger<LoginCommandHandler> _logger;

    public LoginCommandHandler(IUnitOfWork unitOfWork, IJwtService jwtService, IAuditService auditService, ILogger<LoginCommandHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("[AUTH-HANDLER] Login iniciado: email={email}, ip={ip}", request.Email, request.IpAddress);
        
        // Aceptar username o email: si no tiene @, convertir a email
        var emailToSearch = request.Email.Contains('@') 
            ? request.Email.ToLowerInvariant() 
            : $"{request.Email.ToLowerInvariant()}@zenin.local";
        
        _logger.LogDebug("[AUTH-HANDLER] Buscando usuario: email={email}", emailToSearch);
        var user = await _unitOfWork.Users.GetByEmailAsync(emailToSearch, cancellationToken);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
    {
            _logger.LogWarning("[AUTH-HANDLER] Login falló: credenciales inválidas para email={email}", request.Email);
            await _auditService.LogActionAsync(
                Guid.Empty,
                "LOGIN_FAILED",
                "User",
                null,
                null,
                $"Email: {request.Email}",
                request.IpAddress,
                request.UserAgent,
                false,
                "Invalid credentials",
                cancellationToken
            );
            
            return Result<LoginResponse>.Failure("Invalid email or password");
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("[AUTH-HANDLER] Login falló: cuenta inactiva para email={email}, userId={userId}", request.Email, user.Id);
            return Result<LoginResponse>.Failure("Account is inactive");
        }

        _logger.LogInformation("[AUTH-HANDLER] Usuario autenticado: userId={userId}, email={email}", user.Id, user.Email);
        
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();

        // Note: RefreshToken, RefreshTokenExpiryTime, LastLoginAt, UpdatedAt are not stored in DB
        // These properties are ignored in EF Core mapping since they don't exist in zenin_core.users table
        
        // No need to update user or save changes since we're not modifying any DB fields

        await _auditService.LogActionAsync(
            user.Id,
            "LOGIN_SUCCESS",
            "User",
            user.Id.ToString(),
            null,
            null,
            request.IpAddress,
            request.UserAgent,
            cancellationToken: cancellationToken
        );
        
        _logger.LogInformation("[AUTH-HANDLER] Login completado: userId={userId}, role={role}", user.Id, user.Role);

        return Result<LoginResponse>.Success(new LoginResponse(
            accessToken,
            refreshToken,
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Role
        ));
    }
}
