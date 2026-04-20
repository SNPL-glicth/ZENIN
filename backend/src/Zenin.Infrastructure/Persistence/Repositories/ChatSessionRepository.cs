using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class ChatSessionRepository : Repository<ChatSession>, IChatSessionRepository
{
    public ChatSessionRepository(ApplicationDbContext context) : base(context)
    {
    }

    // Override to use AsNoTracking and filter by IsDeleted
    // This ensures we never return cached soft-deleted entities
    public override async Task<ChatSession?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Set<ChatSession>()
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, ct);
    }

    public async Task<IEnumerable<ChatSession>> GetByTenantAsync(Guid tenantId, CancellationToken ct = default)
    {
        // Use AsNoTracking to ensure fresh data from database
        // This prevents EF Core from returning cached entities that were soft-deleted
        return await _context.Set<ChatSession>()
            .AsNoTracking()
            .Include(s => s.Messages)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync(ct);
    }

    public async Task<ChatSession?> GetWithMessagesAsync(Guid sessionId, Guid tenantId, CancellationToken ct = default)
    {
        // Use AsNoTracking to ensure fresh data from database
        return await _context.Set<ChatSession>()
            .AsNoTracking()
            .Include(s => s.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.TenantId == tenantId && !s.IsDeleted, ct);
    }

    public async Task<bool> SoftDeleteByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        // Use raw SQL to avoid EF Core OUTPUT clause conflict with triggers
        var sql = @"
            UPDATE zenin_chat.chat_sessions 
            SET is_deleted = 1 
            WHERE id = @id 
            AND tenant_id = @tenantId
            AND is_deleted = 0";

        var parameters = new[]
        {
            new SqlParameter("@id", id),
            new SqlParameter("@tenantId", tenantId)
        };

        var rowsAffected = await _context.Database.ExecuteSqlRawAsync(sql, parameters, ct);
        return rowsAffected > 0;
    }

    public async Task<int> UpdateTimestampAsync(Guid sessionId, Guid tenantId, CancellationToken ct = default)
    {
        // Use raw SQL to avoid EF Core OUTPUT clause conflict with triggers
        var sql = @"
            UPDATE zenin_chat.chat_sessions 
            SET updated_at = GETUTCDATE()
            WHERE id = @sessionId
            AND tenant_id = @tenantId";

        var parameters = new[]
        {
            new SqlParameter("@sessionId", sessionId),
            new SqlParameter("@tenantId", tenantId)
        };

        return await _context.Database.ExecuteSqlRawAsync(sql, parameters, ct);
    }
}
