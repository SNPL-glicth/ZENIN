using MediatR;

namespace Zenin.Application.Features.Chats.Queries;

public record GetChatMessagesQuery(Guid ChatId, Guid TenantId) : IRequest<List<ChatMessageDto>>;

/// <summary>
/// DTO for chat messages - clean structure without AnalysisResult hardcodes
/// </summary>
public class ChatMessageDto
{
    public Guid Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Guid? AnalysisResultId { get; set; }
}
