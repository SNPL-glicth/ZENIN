using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Queries;

public class GetDocumentQueryHandler : IRequestHandler<GetDocumentQuery, DocumentDetailDto?>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetDocumentQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<DocumentDetailDto?> Handle(GetDocumentQuery request, CancellationToken ct)
    {
        var document = await _unitOfWork.Documents.GetByIdAsync(request.DocumentId, request.TenantId, ct);

        if (document == null)
            return null;

        return new DocumentDetailDto
        {
            Id = document.Id,
            OriginalFilename = document.OriginalFilename,
            FileExtension = document.FileExtension,
            FileSizeBytes = document.FileSizeBytes,
            MimeType = document.MimeType,
            ContentType = document.ContentType,
            Status = document.Status,
            ErrorMessage = document.ErrorMessage,
            NormalizedPayload = document.NormalizedPayload,
            MlResult = document.MlResult,
            Conclusion = document.Conclusion,
            UploadedAt = document.UploadedAt,
            AnalyzedAt = document.AnalyzedAt
        };
    }
}
