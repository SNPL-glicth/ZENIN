using MediatR;

namespace Zenin.Application.Features.Dashboard.Queries;

public record GetOverviewQuery(Guid TenantId) : IRequest<OverviewDto>;

public class OverviewDto
{
    public int TotalSeries { get; set; }
    public int ActiveSeries { get; set; }
    public int TotalAnomalies { get; set; }
    public int UnacknowledgedAnomalies { get; set; }
    public int TotalPatterns { get; set; }
    public int TotalPredictions { get; set; }
    public List<RecentAnomalyDto> RecentAnomalies { get; set; } = new();
    public List<SeriesSummaryDto> TopSeries { get; set; } = new();
}

public class RecentAnomalyDto
{
    public Guid Id { get; set; }
    public Guid SeriesId { get; set; }
    public string SeriesName { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public decimal AnomalyScore { get; set; }
    public DateTimeOffset DetectedAt { get; set; }
    public bool IsAcknowledged { get; set; }
}

public class SeriesSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SeriesKey { get; set; } = string.Empty;
    public decimal? LatestValue { get; set; }
    public DateTimeOffset? LatestTimestamp { get; set; }
    public string? Regime { get; set; }
}
