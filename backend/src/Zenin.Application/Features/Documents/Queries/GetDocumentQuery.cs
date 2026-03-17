using MediatR;

namespace Zenin.Application.Features.Documents.Queries;

public record GetDocumentQuery(
    Guid DocumentId,
    Guid TenantId
) : IRequest<DocumentDetailDto?>;

public class DocumentDetailDto
{
    public Guid Id { get; set; }
    public string OriginalFilename { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long? FileSizeBytes { get; set; }
    public string? MimeType { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public string? NormalizedPayload { get; set; }
    public string? MlResult { get; set; }
    public string? Conclusion { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
    public DateTimeOffset? AnalyzedAt { get; set; }
}
