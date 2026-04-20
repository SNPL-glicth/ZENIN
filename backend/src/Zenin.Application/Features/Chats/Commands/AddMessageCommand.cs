using MediatR;

namespace Zenin.Application.Features.Chats.Commands;

public record AddMessageCommand(
    Guid SessionId,
    Guid TenantId,
    string Role,
    string Content,
    Guid? AnalysisResultId = null
) : IRequest<AddMessageResult>;

public class AddMessageResult
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
}
