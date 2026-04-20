using MediatR;

namespace Zenin.Application.Features.Documents.Commands;

public record DeleteAnalysisCommand(Guid AnalysisId, Guid TenantId) : IRequest<bool>;
