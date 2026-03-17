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
}
