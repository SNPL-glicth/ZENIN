using MediatR;

namespace Zenin.Application.Features.Users.Commands;

public record ResetUserDataCommand(Guid TenantId, Guid UserId) : IRequest<ResetUserDataResult>;

public class ResetUserDataResult
{
    public int ChatSessionsDeleted { get; set; }
    public int ChatMessagesDeleted { get; set; }
    public int AnalysisResultsDeleted { get; set; }
}
