using MediatR;

namespace Zenin.Application.Features.Documents.Commands;

public record SaveMlResultCommand(
    Guid DocumentId,
    string ResultJson
) : IRequest<Unit>;
