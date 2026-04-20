using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class ChatMessageRepository : IChatMessageRepository
{
    private readonly ApplicationDbContext _context;

    public ChatMessageRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ChatMessage> AddAsync(ChatMessage message, CancellationToken ct = default)
    {
        message.Id = Guid.NewGuid();
        message.CreatedAt = DateTime.UtcNow;
        
        await _context.Set<ChatMessage>().AddAsync(message, ct);
        await _context.SaveChangesAsync(ct);
        
        return message;
    }

    public async Task<IEnumerable<ChatMessage>> GetBySessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await _context.Set<ChatMessage>()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);
    }
}
