using MediatR;

namespace Zenin.Application.Features.Chats.Commands;

public record CreateChatCommand(Guid TenantId, Guid UserId) : IRequest<CreateChatResult>;

public class CreateChatResult
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
}
