using MediatR;

namespace Zenin.Application.Features.Documents.Queries;

public record ListDocumentAnalysesQuery(
    Guid TenantId,
    int Page = 1,
    int PageSize = 20,
    string? Status = null
) : IRequest<List<DocumentAnalysisDto>>;

public class DocumentAnalysisDto
{
    public Guid Id { get; set; }
    public string OriginalFilename { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string Classification { get; set; } = string.Empty;  // text | numeric | mixed
    public string Status { get; set; } = string.Empty;  // pending | processing | analyzed | error
    public string? Conclusion { get; set; }  // Human-readable conclusion
    public string? MlResult { get; set; }  // JSON: confidence, domain, entities, etc.
    public string? SemanticName { get; set; }  // AI-generated name
    public string? MlDocId { get; set; }  // Weaviate document ID
    public DateTime? AnalyzedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Extracted from MlResult JSON for frontend convenience
    public decimal? Confidence { get; set; }  // Extracted from MlResult.confidence
    public string? Domain { get; set; }  // Extracted from MlResult.domain
    public string RiskLevel { get; set; } = "NONE";  // Extracted from MlResult.severity.risk_level
    public string Severity { get; set; } = "info";  // Extracted from MlResult.severity.severity
    public decimal UrgencyScore { get; set; }  // Extracted from MlResult.urgency_score
    public string SentimentLabel { get; set; } = "neutral";  // Extracted from MlResult.sentiment_label
    public string Pattern { get; set; } = "unknown";  // Extracted from MlResult.pattern
    public bool ActionRequired { get; set; }  // Extracted from MlResult.severity.action_required
    public List<string> Actions { get; set; } = new();  // Extracted from MlResult.actions
    public List<string> Entities { get; set; } = new();  // Extracted from MlResult.entities
}
