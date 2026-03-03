namespace Zenin.Application.Common.Interfaces;

public interface IAuditService
{
    Task LogActionAsync(
        Guid userId,
        string action,
        string entityType,
        string? entityId = null,
        string? oldValues = null,
        string? newValues = null,
        string ipAddress = "",
        string userAgent = "",
        bool isSuccess = true,
        string? errorMessage = null,
        CancellationToken cancellationToken = default);
}
