using MediatR;
using Microsoft.EntityFrameworkCore;
using Zenin.Application.Common.Models;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Ingest.Commands;

public class DeleteAnalysesCommandHandler : IRequestHandler<DeleteAnalysesCommand, Result<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteAnalysesCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<bool>> Handle(DeleteAnalysesCommand request, CancellationToken cancellationToken)
    {
        var analyses = await _unitOfWork.AnalysisResults
            .GetByTenantAsync(request.TenantId, 1, 10000, cancellationToken);

        foreach (var analysis in analyses)
        {
            await _unitOfWork.AnalysisResults.DeleteAsync(analysis.Id, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
