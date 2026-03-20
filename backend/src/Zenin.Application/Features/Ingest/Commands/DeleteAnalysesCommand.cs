using MediatR;
using Zenin.Application.Common.Models;

namespace Zenin.Application.Features.Ingest.Commands;

public record DeleteAnalysesCommand(Guid TenantId) : IRequest<Result<bool>>;
