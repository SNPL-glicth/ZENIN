using Zenin.Application.Common.Interfaces;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly IUnitOfWork _unitOfWork;

    public AuditService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task LogActionAsync(
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
        CancellationToken cancellationToken = default)
    {
        // TODO: Audit logging temporarily disabled due to schema mismatch
        // zenin_audit.logs table has different structure than AuditLog entity
        // Required: tenant_id, timestamp column, entity_id as uuid, old_values/new_values as jsonb
        await Task.CompletedTask;
    }
}
