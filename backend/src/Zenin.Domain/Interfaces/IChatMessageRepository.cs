using Zenin.Domain.Entities;

namespace Zenin.Domain.Interfaces;

public interface IChatMessageRepository
{
    Task<ChatMessage> AddAsync(ChatMessage message, CancellationToken ct = default);
    Task<IEnumerable<ChatMessage>> GetBySessionAsync(Guid sessionId, CancellationToken ct = default);
}
