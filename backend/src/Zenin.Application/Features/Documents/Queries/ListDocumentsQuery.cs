using MediatR;

namespace Zenin.Application.Features.Documents.Queries;

public record ListDocumentsQuery(
    Guid TenantId,
    int Page,
    int PageSize,
    string? Status
) : IRequest<List<DocumentDto>>;

public class DocumentDto
{
    public Guid Id { get; set; }
    public string OriginalFilename { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long? FileSizeBytes { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Conclusion { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
    public DateTimeOffset? AnalyzedAt { get; set; }
}
