using Zenin.Domain.Entities;

namespace Zenin.Domain.Interfaces;

public interface IChatSessionRepository : IRepository<ChatSession>
{
    Task<IEnumerable<ChatSession>> GetByTenantAsync(Guid tenantId, CancellationToken ct = default);
    Task<ChatSession?> GetWithMessagesAsync(Guid sessionId, Guid tenantId, CancellationToken ct = default);
    Task<bool> SoftDeleteByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<int> UpdateTimestampAsync(Guid sessionId, Guid tenantId, CancellationToken ct = default);
}
