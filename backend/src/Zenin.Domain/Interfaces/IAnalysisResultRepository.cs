using Zenin.Domain.Entities;

namespace Zenin.Domain.Interfaces;

public interface IAnalysisResultRepository : IRepository<AnalysisResult>
{
    Task<IEnumerable<AnalysisResult>> GetByTenantAsync(Guid tenantId, int page, int pageSize, CancellationToken ct = default);
    Task<bool> SoftDeleteByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<int> BulkSoftDeleteAsync(List<Guid> ids, Guid tenantId, CancellationToken ct = default);
}
