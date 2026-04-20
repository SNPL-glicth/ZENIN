using MediatR;

namespace Zenin.Application.Features.Chats.Commands;

public record DeleteChatCommand(Guid ChatId, Guid TenantId) : IRequest<bool>;
