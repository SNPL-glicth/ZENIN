using MediatR;
using Microsoft.Extensions.Logging;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Chats.Commands;

public class DeleteChatCommandHandler : IRequestHandler<DeleteChatCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteChatCommandHandler> _logger;

    public DeleteChatCommandHandler(IUnitOfWork unitOfWork, ILogger<DeleteChatCommandHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<bool> Handle(DeleteChatCommand request, CancellationToken ct)
    {
        _logger.LogInformation("Attempting to delete chat {ChatId} for tenant {TenantId}", 
            request.ChatId, request.TenantId);
        
        // SoftDeleteByIdAsync uses raw SQL - no SaveChanges needed
        var result = await _unitOfWork.ChatSessions.SoftDeleteByIdAsync(request.ChatId, request.TenantId, ct);
        
        if (result)
        {
            _logger.LogInformation("Successfully deleted chat {ChatId}", request.ChatId);
        }
        else
        {
            _logger.LogWarning("Failed to delete chat {ChatId} - session not found or already deleted", 
                request.ChatId);
        }
        
        return result;
    }
}
