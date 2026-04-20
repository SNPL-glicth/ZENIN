using MediatR;

namespace Zenin.Application.Features.Documents.Commands;

public record DeleteDocumentCommand(Guid DocumentId, Guid TenantId) : IRequest<bool>;
