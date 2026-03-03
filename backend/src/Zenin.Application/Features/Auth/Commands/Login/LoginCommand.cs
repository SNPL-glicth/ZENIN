using MediatR;
using Zenin.Application.Common.Models;

namespace Zenin.Application.Features.Auth.Commands.Login;

public record LoginCommand(
    string Email,
    string Password,
    string IpAddress,
    string UserAgent
) : IRequest<Result<LoginResponse>>;

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    Guid UserId,
    string Email,
    string FirstName,
    string LastName,
    string Role
);
