using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class AnalysisResultRepository : Repository<AnalysisResult>, IAnalysisResultRepository
{
    public AnalysisResultRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<AnalysisResult>> GetByTenantAsync(Guid tenantId, int page, int pageSize, CancellationToken ct = default)
    {
        return await _dbSet
            .Where(a => a.TenantId == tenantId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<bool> SoftDeleteByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var entity = await _dbSet
            .Where(a => a.Id == id && a.TenantId == tenantId && !a.IsDeleted)
            .FirstOrDefaultAsync(ct);

        if (entity == null)
            return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> BulkSoftDeleteAsync(List<Guid> ids, Guid tenantId, CancellationToken ct = default)
    {
        var entities = await _dbSet
            .Where(a => ids.Contains(a.Id) && a.TenantId == tenantId && !a.IsDeleted)
            .ToListAsync(ct);

        if (!entities.Any())
            return 0;

        foreach (var entity in entities)
        {
            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);
        return entities.Count;
    }
}
