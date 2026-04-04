using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Zenin.Application.Common.Interfaces;
using Zenin.Infrastructure.Persistence;

namespace Zenin.Infrastructure.Services;

/// <summary>
/// Writes items to zenin_docs.ingestion_queue via raw SQL.
/// ML Service polls this queue asynchronously.
/// </summary>
public class IngestionQueueService : IIngestionQueueService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<IngestionQueueService> _logger;

    public IngestionQueueService(
        ApplicationDbContext dbContext,
        ILogger<IngestionQueueService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task EnqueueAsync(
        Guid queueId,
        Guid tenantId,
        Guid userId,
        string contentType,
        string sourceType,
        string? originalFilename,
        string? fileExtension,
        string content,
        string? metadataJson,
        CancellationToken ct = default)
    {
        _logger.LogInformation("[QUEUE] Iniciando EnqueueAsync para queueId={queueId}", queueId);
        
        const string sql = @"
            INSERT INTO zenin_docs.ingestion_queue
                (Id, TenantId, UserId, ContentType, SourceType,
                 OriginalFilename, FileExtension, Content, Metadata,
                 Status, CreatedAt)
            VALUES
                ({0}, {1}, {2}, {3}, {4},
                 {5}, {6}, {7}, {8},
                 'pending', GETUTCDATE())";

        try
        {
            await _dbContext.Database.ExecuteSqlRawAsync(
                sql,
                new object[]
                {
                    queueId,
                    tenantId,
                    userId,
                    contentType,
                    sourceType,
                    (object?)originalFilename ?? DBNull.Value,
                    (object?)fileExtension ?? DBNull.Value,
                    content,
                    (object?)metadataJson ?? DBNull.Value,
                },
                ct);

            _logger.LogInformation(
                "Enqueued {QueueId} for ML processing (type={ContentType}, file={Filename})",
                queueId, contentType, originalFilename);
            _logger.LogInformation("[QUEUE] INSERT exitoso en zenin_docs.ingestion_queue: {queueId}", queueId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[QUEUE] Error al encolar queueId={queueId}: {Message}", queueId, ex.Message);
            throw;
        }
    }
}
