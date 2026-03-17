namespace Zenin.Domain.Entities;

public class AnalysisResult : BaseEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string OriginalFilename { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }

    /// <summary>numeric | text | mixed</summary>
    public string Classification { get; set; } = "unknown";

    /// <summary>JSON: extracted numeric statistics, column info, row counts</summary>
    public string? NumericSummary { get; set; }

    /// <summary>JSON: text extraction summary, chunk count, language</summary>
    public string? TextSummary { get; set; }

    /// <summary>JSON: ML analysis results (predictions, anomalies, patterns)</summary>
    public string? MlResult { get; set; }

    /// <summary>Human-readable conclusion from analysis</summary>
    public string? Conclusion { get; set; }

    /// <summary>ML Service document ID for semantic search</summary>
    public string? MlDocId { get; set; }

    /// <summary>pending | processing | analyzed | error</summary>
    public string Status { get; set; } = "pending";
    public string? ErrorMessage { get; set; }

    public DateTime? AnalyzedAt { get; set; }
}
