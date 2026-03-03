using MediatR;
using Zenin.Application.Common.Models;

namespace Zenin.Application.Features.Auth.Commands.Register;

public record RegisterCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName
) : IRequest<Result<RegisterResponse>>;

public record RegisterResponse(
    Guid UserId,
    string Email,
    string FirstName,
    string LastName
);
