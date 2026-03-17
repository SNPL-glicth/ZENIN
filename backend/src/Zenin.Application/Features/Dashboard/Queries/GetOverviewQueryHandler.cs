using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Dashboard.Queries;

public class GetOverviewQueryHandler : IRequestHandler<GetOverviewQuery, OverviewDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetOverviewQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<OverviewDto> Handle(GetOverviewQuery request, CancellationToken ct)
    {
        var tenantId = request.TenantId;

        var totalSeries = await _unitOfWork.Series.CountAsync(s => s.TenantId == tenantId && s.IsActive && s.DeletedAt == null, ct);
        var totalAnomalies = await _unitOfWork.Anomalies.CountAsync(a => a.TenantId == tenantId, ct);
        var unacknowledged = await _unitOfWork.Anomalies.CountAsync(a => a.TenantId == tenantId && !a.IsAcknowledged, ct);
        var totalPatterns = await _unitOfWork.Patterns.CountAsync(p => p.TenantId == tenantId, ct);
        var totalPredictions = await _unitOfWork.Predictions.CountAsync(p => p.TenantId == tenantId, ct);

        var recentAnomalies = await _unitOfWork.Anomalies.GetRecentByTenantAsync(tenantId, 5, ct);
        var topSeries = await _unitOfWork.Series.GetTopByTenantAsync(tenantId, 6, ct);

        return new OverviewDto
        {
            TotalSeries = totalSeries,
            ActiveSeries = totalSeries,
            TotalAnomalies = totalAnomalies,
            UnacknowledgedAnomalies = unacknowledged,
            TotalPatterns = totalPatterns,
            TotalPredictions = totalPredictions,
            RecentAnomalies = recentAnomalies.Select(a => new RecentAnomalyDto
            {
                Id = a.Id,
                SeriesId = a.SeriesId,
                SeriesName = a.Series?.Name ?? "Unknown",
                Severity = a.Severity,
                AnomalyScore = a.AnomalyScore,
                DetectedAt = a.DetectedAt,
                IsAcknowledged = a.IsAcknowledged
            }).ToList(),
            TopSeries = topSeries.Select(s => new SeriesSummaryDto
            {
                Id = s.Id,
                Name = s.Name,
                SeriesKey = s.SeriesKey,
                LatestValue = s.Latest?.LatestValue,
                LatestTimestamp = s.Latest?.LatestTimestamp,
                Regime = s.Profile?.Regime
            }).ToList()
        };
    }
}
