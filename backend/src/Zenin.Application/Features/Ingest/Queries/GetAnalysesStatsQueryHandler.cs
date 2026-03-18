using MediatR;
using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Ingest.Queries;

public class GetAnalysesStatsQueryHandler : IRequestHandler<GetAnalysesStatsQuery, AnalysesStatsDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetAnalysesStatsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<AnalysesStatsDto> Handle(GetAnalysesStatsQuery request, CancellationToken cancellationToken)
    {
        var allAnalyses = await _unitOfWork.AnalysisResults
            .GetByTenantAsync(request.TenantId, 1, 10000, cancellationToken);

        var analysesList = allAnalyses.ToList();

        var stats = new AnalysesStatsDto
        {
            TotalAnalyses = analysesList.Count(a => a.Status == "analyzed"),
            TotalFiles = analysesList.Count,
            LastActivity = analysesList.Any() ? analysesList.Max(a => a.CreatedAt) : null
        };

        // Analyses per day (last 7 days)
        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var recentAnalyses = analysesList.Where(a => a.CreatedAt >= sevenDaysAgo).ToList();
        
        stats.AnalysesPerDay = recentAnalyses
            .GroupBy(a => a.CreatedAt.Date.ToString("yyyy-MM-dd"))
            .ToDictionary(g => g.Key, g => g.Count());

        // Severity distribution - parse from conclusion text
        stats.SeverityDistribution = new Dictionary<string, int>
        {
            { "critical", analysesList.Count(a => a.Conclusion?.ToLower().Contains("crítico") == true || a.Conclusion?.ToLower().Contains("critical") == true) },
            { "moderate", analysesList.Count(a => a.Conclusion?.ToLower().Contains("moderado") == true || a.Conclusion?.ToLower().Contains("moderate") == true) },
            { "low", analysesList.Count(a => a.Conclusion?.ToLower().Contains("bajo") == true || a.Conclusion?.ToLower().Contains("low") == true) }
        };

        // Recent analyses (last 5)
        stats.RecentAnalyses = analysesList
            .OrderByDescending(a => a.CreatedAt)
            .Take(5)
            .Select(a => new RecentAnalysisDto
            {
                Id = a.Id,
                Filename = a.OriginalFilename,
                Classification = a.Classification,
                Status = a.Status,
                Conclusion = a.Conclusion,
                CreatedAt = a.CreatedAt
            })
            .ToList();

        return stats;
    }
}
