using MediatR;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Chats.Commands;

public class CreateChatCommandHandler : IRequestHandler<CreateChatCommand, CreateChatResult>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateChatCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<CreateChatResult> Handle(CreateChatCommand request, CancellationToken ct)
    {
        var session = new ChatSession
        {
            Id = Guid.NewGuid(),
            TenantId = request.TenantId,
            UserId = request.UserId,
            Title = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _unitOfWork.ChatSessions.AddAsync(session, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return new CreateChatResult
        {
            Id = session.Id,
            CreatedAt = session.CreatedAt
        };
    }
}
