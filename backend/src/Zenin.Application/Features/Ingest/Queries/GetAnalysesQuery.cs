using MediatR;

namespace Zenin.Application.Features.Ingest.Queries;

public record GetAnalysesQuery(Guid TenantId, int Page, int PageSize) : IRequest<AnalysesListDto>;

public class AnalysesListDto
{
    public List<AnalysisItemDto> Analyses { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class AnalysisItemDto
{
    public Guid Id { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string? SemanticName { get; set; }
    public string Classification { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Conclusion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? AnalyzedAt { get; set; }
    public long FileSizeBytes { get; set; }
}
