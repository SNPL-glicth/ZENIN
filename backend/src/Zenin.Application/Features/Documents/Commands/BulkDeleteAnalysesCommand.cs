using MediatR;

namespace Zenin.Application.Features.Documents.Commands;

public record BulkDeleteAnalysesCommand(List<Guid> AnalysisIds, Guid TenantId) : IRequest<int>;
