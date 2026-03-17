namespace Zenin.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IAuditLogRepository AuditLogs { get; }
    ISeriesRepository Series { get; }
    IAnomalyRepository Anomalies { get; }
    IPatternRepository Patterns { get; }
    IPredictionRepository Predictions { get; }
    IDocumentRepository Documents { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
