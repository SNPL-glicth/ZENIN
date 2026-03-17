using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class AnomalyRepository : IAnomalyRepository
{
    private readonly ApplicationDbContext _context;

    public AnomalyRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> CountAsync(Expression<Func<Anomaly, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _context.Anomalies.CountAsync(predicate, cancellationToken);
    }

    public async Task<List<Anomaly>> GetRecentByTenantAsync(Guid tenantId, int limit, CancellationToken cancellationToken = default)
    {
        return await _context.Anomalies
            .Where(a => a.TenantId == tenantId)
            .Include(a => a.Series)
            .OrderByDescending(a => a.DetectedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }
}
