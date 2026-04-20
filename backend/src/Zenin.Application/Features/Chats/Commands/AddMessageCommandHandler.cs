using MediatR;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Chats.Commands;

public class AddMessageCommandHandler : IRequestHandler<AddMessageCommand, AddMessageResult>
{
    private readonly IUnitOfWork _unitOfWork;

    public AddMessageCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<AddMessageResult> Handle(AddMessageCommand request, CancellationToken ct)
    {
        var session = await _unitOfWork.ChatSessions.GetByIdAsync(request.SessionId, ct);
        if (session == null || session.TenantId != request.TenantId)
        {
            throw new UnauthorizedAccessException("Session not found or access denied");
        }

        var message = new ChatMessage
        {
            SessionId = request.SessionId,
            Role = request.Role,
            Content = request.Content,
            AnalysisResultId = request.AnalysisResultId
        };

        await _unitOfWork.ChatMessages.AddAsync(message, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        // Update session timestamp using raw SQL via repository (avoids EF Core OUTPUT clause conflict with triggers)
        await _unitOfWork.ChatSessions.UpdateTimestampAsync(request.SessionId, request.TenantId, ct);

        return new AddMessageResult
        {
            Id = message.Id,
            CreatedAt = message.CreatedAt
        };
    }
}
