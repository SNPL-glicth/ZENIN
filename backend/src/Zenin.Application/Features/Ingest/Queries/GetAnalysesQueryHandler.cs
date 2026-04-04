using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Ingest.Queries;

public class GetAnalysesQueryHandler : IRequestHandler<GetAnalysesQuery, AnalysesListDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<GetAnalysesQueryHandler> _logger;

    public GetAnalysesQueryHandler(IUnitOfWork unitOfWork, ILogger<GetAnalysesQueryHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<AnalysesListDto> Handle(GetAnalysesQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("[ANALYSIS-QUERY] GetAnalyses iniciado: tenantId={tenantId}, page={page}, pageSize={pageSize}", 
            request.TenantId, request.Page, request.PageSize);
        
        var analyses = await _unitOfWork.AnalysisResults
            .GetByTenantAsync(request.TenantId, request.Page, request.PageSize, cancellationToken);
        
        _logger.LogInformation("[ANALYSIS-QUERY] GetAnalyses: {count} registros encontrados en DB", analyses?.Count() ?? 0);

        var items = analyses.Select(a =>
        {
            // Parse MlResult JSON to extract decision_recommendation
            object? decisionRecommendation = null;
            if (!string.IsNullOrEmpty(a.MlResult))
            {
                try
                {
                    var mlResult = JsonSerializer.Deserialize<JsonElement>(a.MlResult);
                    if (mlResult.TryGetProperty("decision_recommendation", out var decisionProp))
                    {
                        decisionRecommendation = decisionProp;
                    }
                }
                catch { /* Ignore parse errors */ }
            }

            return new AnalysisItemDto
            {
                Id = a.Id,
                Filename = a.OriginalFilename,
                SemanticName = a.SemanticName,
                Classification = a.Classification,
                Status = a.Status,
                Conclusion = a.Conclusion,
                CreatedAt = a.CreatedAt,
                AnalyzedAt = a.AnalyzedAt,
                FileSizeBytes = a.FileSizeBytes,
                DecisionRecommendation = decisionRecommendation
            };
        }).ToList();

        _logger.LogInformation("[ANALYSIS-QUERY] GetAnalyses completado: retornando {count} items", items.Count);
        
        return new AnalysesListDto
        {
            Analyses = items,
            TotalCount = items.Count,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
