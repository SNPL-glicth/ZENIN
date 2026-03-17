using MediatR;
using Zenin.Application.Common.Interfaces;
using Zenin.Application.Common.Models;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Auth.Commands.Register;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<RegisterResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public RegisterCommandHandler(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<Result<RegisterResponse>> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var existingUser = await _unitOfWork.Users.GetByEmailAsync(request.Email, cancellationToken);
        if (existingUser != null)
        {
            return Result<RegisterResponse>.Failure("Email already registered");
        }

        // Default tenant seeded in DB via EF Core HasData
        var defaultTenantId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = defaultTenantId,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = "User",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogActionAsync(
            user.Id,
            "USER_REGISTERED",
            "User",
            user.Id.ToString(),
            null,
            $"Email: {user.Email}",
            cancellationToken: cancellationToken
        );

        return Result<RegisterResponse>.Success(new RegisterResponse(
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName
        ));
    }
}
