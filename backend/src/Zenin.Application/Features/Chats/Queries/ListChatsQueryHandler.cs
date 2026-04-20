using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Chats.Queries;

public class ListChatsQueryHandler : IRequestHandler<ListChatsQuery, List<ChatSessionDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public ListChatsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<ChatSessionDto>> Handle(ListChatsQuery request, CancellationToken ct)
    {
        var sessions = await _unitOfWork.ChatSessions.GetByTenantAsync(request.TenantId, ct);

        var sessionDtos = sessions
            .Select(s => new ChatSessionDto
            {
                Id = s.Id,
                Title = s.Title ?? $"Chat {s.CreatedAt:yyyy-MM-dd HH:mm}",
                CreatedAt = s.CreatedAt,
                MessageCount = s.Messages.Count,
                LastMessage = s.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()?.Content ?? "",
                Severity = "info"
            })
            .ToList();

        return sessionDtos;
    }
}
