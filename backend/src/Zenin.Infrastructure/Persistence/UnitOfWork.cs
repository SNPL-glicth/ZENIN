using Microsoft.EntityFrameworkCore.Storage;
using Zenin.Domain.Interfaces;
using Zenin.Infrastructure.Persistence.Repositories;

namespace Zenin.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private IDbContextTransaction? _transaction;
    private IUserRepository? _userRepository;
    private IAuditLogRepository? _auditLogRepository;
    private ISeriesRepository? _seriesRepository;
    private IAnomalyRepository? _anomalyRepository;
    private IPatternRepository? _patternRepository;
    private IPredictionRepository? _predictionRepository;
    private IDocumentRepository? _documentRepository;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
    }

    public IUserRepository Users => _userRepository ??= new UserRepository(_context);
    public IAuditLogRepository AuditLogs => _auditLogRepository ??= new AuditLogRepository(_context);
    public ISeriesRepository Series => _seriesRepository ??= new SeriesRepository(_context);
    public IAnomalyRepository Anomalies => _anomalyRepository ??= new AnomalyRepository(_context);
    public IPatternRepository Patterns => _patternRepository ??= new PatternRepository(_context);
    public IDocumentRepository Documents => _documentRepository ??= new DocumentRepository(_context);
    public IPredictionRepository Predictions => _predictionRepository ??= new PredictionRepository(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        _transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
