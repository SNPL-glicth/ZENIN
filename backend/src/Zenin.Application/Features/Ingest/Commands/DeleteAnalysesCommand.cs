using MediatR;
using Zenin.Application.Common;

namespace Zenin.Application.Features.Ingest.Commands;

public record DeleteAnalysesCommand(Guid TenantId) : IRequest<Result<bool>>;
