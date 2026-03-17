namespace Zenin.Domain.Entities;

public class Document : BaseEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public Guid UploadedBy { get; set; }
    public User Uploader { get; set; } = null!;
    public string OriginalFilename { get; set; } = string.Empty;
    public string StoredFilename { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long? FileSizeBytes { get; set; }
    public string? MimeType { get; set; }
    public string ContentType { get; set; } = "binary";
    public byte[]? BinaryContent { get; set; }
    public string? RawText { get; set; }
    public string? NormalizedPayload { get; set; }
    public string Status { get; set; } = "pending";
    public string? ErrorMessage { get; set; }
    public string? MlResult { get; set; }
    public string? Conclusion { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
    public DateTimeOffset? AnalyzedAt { get; set; }
    public string? MlDocId { get; set; }
    public string? Metadata { get; set; }
}
