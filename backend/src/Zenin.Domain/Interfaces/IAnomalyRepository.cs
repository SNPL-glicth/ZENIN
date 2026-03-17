using System.Linq.Expressions;
using Zenin.Domain.Entities;

namespace Zenin.Domain.Interfaces;

public interface IAnomalyRepository
{
    Task<int> CountAsync(Expression<Func<Anomaly, bool>> predicate, CancellationToken cancellationToken = default);
    Task<List<Anomaly>> GetRecentByTenantAsync(Guid tenantId, int limit, CancellationToken cancellationToken = default);
}
