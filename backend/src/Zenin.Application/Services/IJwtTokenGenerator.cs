using Zenin.Domain.Entities;

namespace Zenin.Application.Services;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
