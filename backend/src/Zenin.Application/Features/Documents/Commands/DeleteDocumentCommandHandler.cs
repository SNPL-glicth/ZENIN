using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Commands;

public class DeleteDocumentCommandHandler : IRequestHandler<DeleteDocumentCommand, bool>
{
    private readonly IAnalysisResultRepository _analysisRepository;

    public DeleteDocumentCommandHandler(IAnalysisResultRepository analysisRepository)
    {
        _analysisRepository = analysisRepository;
    }

    public async Task<bool> Handle(DeleteDocumentCommand request, CancellationToken ct)
    {
        // Soft delete: set IsDeleted = 1
        // Only delete if document belongs to the tenant
        var deleted = await _analysisRepository.SoftDeleteByIdAsync(
            request.DocumentId,
            request.TenantId,
            ct);

        return deleted;
    }
}
