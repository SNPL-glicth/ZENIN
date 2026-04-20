using MediatR;

namespace Zenin.Application.Features.Chats.Queries;

public record ListChatsQuery(Guid TenantId) : IRequest<List<ChatSessionDto>>;

public class ChatSessionDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int MessageCount { get; set; }
    public string LastMessage { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
}
