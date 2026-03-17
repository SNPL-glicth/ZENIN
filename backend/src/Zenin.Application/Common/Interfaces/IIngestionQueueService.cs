namespace Zenin.Application.Common.Interfaces;

/// <summary>
/// Writes items to zenin_docs.ingestion_queue for async ML processing.
/// ML Service polls this queue and writes results to analysis_results.
/// </summary>
public interface IIngestionQueueService
{
    /// <summary>
    /// Enqueue a parsed document for ML analysis.
    /// </summary>
    /// <param name="queueId">Pre-generated queue item ID</param>
    /// <param name="tenantId">Tenant that owns the document</param>
    /// <param name="userId">User who uploaded the document</param>
    /// <param name="contentType">Classification: text, tabular, mixed</param>
    /// <param name="sourceType">Origin: upload, api</param>
    /// <param name="originalFilename">Original filename</param>
    /// <param name="fileExtension">File extension (.txt, .csv, etc.)</param>
    /// <param name="content">Parsed text content</param>
    /// <param name="metadataJson">JSON metadata (file_size, word_count, etc.)</param>
    /// <param name="ct">Cancellation token</param>
    Task EnqueueAsync(
        Guid queueId,
        Guid tenantId,
        Guid userId,
        string contentType,
        string sourceType,
        string? originalFilename,
        string? fileExtension,
        string content,
        string? metadataJson,
        CancellationToken ct = default);
}
