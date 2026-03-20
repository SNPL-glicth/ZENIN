using MediatR;
using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Ingest.Queries;

public class GetAnalysesQueryHandler : IRequestHandler<GetAnalysesQuery, AnalysesListDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetAnalysesQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<AnalysesListDto> Handle(GetAnalysesQuery request, CancellationToken cancellationToken)
    {
        var analyses = await _unitOfWork.AnalysisResults
            .GetByTenantAsync(request.TenantId, request.Page, request.PageSize, cancellationToken);

        var items = analyses.Select(a => new AnalysisItemDto
        {
            Id = a.Id,
            Filename = a.OriginalFilename,
            SemanticName = a.SemanticName,
            Classification = a.Classification,
            Status = a.Status,
            Conclusion = a.Conclusion,
            CreatedAt = a.CreatedAt,
            AnalyzedAt = a.AnalyzedAt,
            FileSizeBytes = a.FileSizeBytes
        }).ToList();

        return new AnalysesListDto
        {
            Analyses = items,
            TotalCount = items.Count,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
