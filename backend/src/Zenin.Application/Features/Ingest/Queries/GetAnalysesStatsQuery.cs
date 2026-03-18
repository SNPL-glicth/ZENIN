using MediatR;

namespace Zenin.Application.Features.Ingest.Queries;

public record GetAnalysesStatsQuery(Guid TenantId) : IRequest<AnalysesStatsDto>;

public class AnalysesStatsDto
{
    public int TotalAnalyses { get; set; }
    public int TotalFiles { get; set; }
    public DateTime? LastActivity { get; set; }
    public Dictionary<string, int> AnalysesPerDay { get; set; } = new();
    public Dictionary<string, int> SeverityDistribution { get; set; } = new();
    public List<RecentAnalysisDto> RecentAnalyses { get; set; } = new();
}

public class RecentAnalysisDto
{
    public Guid Id { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Conclusion { get; set; }
    public DateTime CreatedAt { get; set; }
}
