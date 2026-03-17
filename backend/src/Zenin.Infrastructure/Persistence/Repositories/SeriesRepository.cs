using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Infrastructure.Persistence.Repositories;

public class SeriesRepository : ISeriesRepository
{
    private readonly ApplicationDbContext _context;

    public SeriesRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> CountAsync(Expression<Func<Series, bool>> predicate, CancellationToken cancellationToken = default)
    {
        return await _context.Series.CountAsync(predicate, cancellationToken);
    }

    public async Task<List<Series>> GetTopByTenantAsync(Guid tenantId, int limit, CancellationToken cancellationToken = default)
    {
        return await _context.Series
            .Where(s => s.TenantId == tenantId && s.IsActive && s.DeletedAt == null)
            .Include(s => s.Latest)
            .Include(s => s.Profile)
            .OrderByDescending(s => s.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }
}
