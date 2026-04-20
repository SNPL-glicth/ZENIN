using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Queries;

public class ListDocumentsQueryHandler : IRequestHandler<ListDocumentsQuery, List<DocumentDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public ListDocumentsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<DocumentDto>> Handle(ListDocumentsQuery request, CancellationToken ct)
    {
        var documents = await _unitOfWork.Documents.ListByTenantAsync(
            request.TenantId,
            request.Page,
            request.PageSize,
            request.Status,
            ct);

        return documents.Select(d => new DocumentDto
        {
            Id = d.Id,
            OriginalFilename = d.OriginalFilename,
            FileExtension = d.FileExtension,
            FileSizeBytes = d.FileSizeBytes,
            ContentType = d.ContentType,
            Status = d.Status,
            Conclusion = d.Conclusion,
            MlResult = d.MlResult,  // Exponer JSON del análisis ML al frontend
            UploadedAt = d.UploadedAt,
            AnalyzedAt = d.AnalyzedAt
        }).ToList();
    }
}
