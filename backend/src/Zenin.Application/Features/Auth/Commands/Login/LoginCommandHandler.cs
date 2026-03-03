using MediatR;
using Zenin.Application.Common.Interfaces;
using Zenin.Application.Common.Models;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<LoginResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IAuditService _auditService;

    public LoginCommandHandler(IUnitOfWork unitOfWork, IJwtService jwtService, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _auditService = auditService;
    }

    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(request.Email.ToLowerInvariant(), cancellationToken);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
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
            return Result<LoginResponse>.Failure("Account is inactive");
        }

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
