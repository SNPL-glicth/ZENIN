using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Commands;

public class DeleteAnalysisCommandHandler : IRequestHandler<DeleteAnalysisCommand, bool>
{
    private readonly IAnalysisResultRepository _analysisRepository;

    public DeleteAnalysisCommandHandler(IAnalysisResultRepository analysisRepository)
    {
        _analysisRepository = analysisRepository;
    }

    public async Task<bool> Handle(DeleteAnalysisCommand request, CancellationToken ct)
    {
        // Soft delete: set IsDeleted = 1
        // Only delete if analysis belongs to the tenant
        var deleted = await _analysisRepository.SoftDeleteByIdAsync(
            request.AnalysisId,
            request.TenantId,
            ct);

        return deleted;
    }
}
