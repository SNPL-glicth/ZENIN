using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Commands;

public class BulkDeleteAnalysesCommandHandler : IRequestHandler<BulkDeleteAnalysesCommand, int>
{
    private readonly IAnalysisResultRepository _analysisRepository;

    public BulkDeleteAnalysesCommandHandler(IAnalysisResultRepository analysisRepository)
    {
        _analysisRepository = analysisRepository;
    }

    public async Task<int> Handle(BulkDeleteAnalysesCommand request, CancellationToken ct)
    {
        // Soft delete multiple analyses
        // Only delete if they belong to the tenant
        var count = await _analysisRepository.BulkSoftDeleteAsync(
            request.AnalysisIds,
            request.TenantId,
            ct);

        return count;
    }
}
