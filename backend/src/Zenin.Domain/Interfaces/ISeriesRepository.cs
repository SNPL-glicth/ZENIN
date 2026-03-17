using System.Linq.Expressions;
using Zenin.Domain.Entities;

namespace Zenin.Domain.Interfaces;

public interface ISeriesRepository
{
    Task<int> CountAsync(Expression<Func<Series, bool>> predicate, CancellationToken cancellationToken = default);
    Task<List<Series>> GetTopByTenantAsync(Guid tenantId, int limit, CancellationToken cancellationToken = default);
}
