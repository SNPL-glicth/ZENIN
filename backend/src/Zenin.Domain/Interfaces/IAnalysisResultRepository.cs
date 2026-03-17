using Zenin.Domain.Entities;

namespace Zenin.Domain.Interfaces;

public interface IAnalysisResultRepository : IRepository<AnalysisResult>
{
    Task<IEnumerable<AnalysisResult>> GetByTenantAsync(Guid tenantId, int page, int pageSize, CancellationToken ct = default);
}
