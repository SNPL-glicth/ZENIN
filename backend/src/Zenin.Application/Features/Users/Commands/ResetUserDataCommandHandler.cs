using MediatR;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Users.Commands;

public class ResetUserDataCommandHandler : IRequestHandler<ResetUserDataCommand, ResetUserDataResult>
{
    private readonly IUnitOfWork _unitOfWork;

    public ResetUserDataCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ResetUserDataResult> Handle(ResetUserDataCommand request, CancellationToken ct)
    {
        var chatSessions = (await _unitOfWork.ChatSessions.GetByTenantAsync(request.TenantId, ct))
            .Where(s => s.UserId == request.UserId)
            .ToList();

        var analysisResults = (await _unitOfWork.AnalysisResults.GetByTenantAsync(request.TenantId, 1, 10000, ct))
            .Where(a => a.UserId == request.UserId)
            .ToList();

        int messagesDeleted = 0;
        foreach (var session in chatSessions)
        {
            messagesDeleted += session.Messages.Count;
            await _unitOfWork.ChatSessions.SoftDeleteByIdAsync(session.Id, request.TenantId, ct);
        }

        foreach (var analysis in analysisResults)
        {
            await _unitOfWork.AnalysisResults.SoftDeleteByIdAsync(analysis.Id, request.TenantId, ct);
        }

        await _unitOfWork.SaveChangesAsync(ct);

        return new ResetUserDataResult
        {
            ChatSessionsDeleted = chatSessions.Count,
            ChatMessagesDeleted = messagesDeleted,
            AnalysisResultsDeleted = analysisResults.Count
        };
    }
}
