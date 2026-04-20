using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Chats.Queries;

public class GetChatMessagesQueryHandler : IRequestHandler<GetChatMessagesQuery, List<ChatMessageDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetChatMessagesQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<ChatMessageDto>> Handle(GetChatMessagesQuery request, CancellationToken ct)
    {
        var session = await _unitOfWork.ChatSessions.GetWithMessagesAsync(request.ChatId, request.TenantId, ct);
        
        if (session == null)
            return new List<ChatMessageDto>();

        var messageDtos = session.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new ChatMessageDto
            {
                Id = m.Id,
                Role = m.Role,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                AnalysisResultId = m.AnalysisResultId
            })
            .ToList();

        return messageDtos;
    }
}
