using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using Zenin.Application.Common.Interfaces;
using Zenin.Application.Common.Models;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Ingest.Commands;

/// <summary>
/// Handles file upload: parses content, creates analysis_results (pending),
/// writes to ingestion_queue, and returns immediately.
/// ML Service poller picks up the queue item and fills in the analysis.
/// </summary>
public class IngestFileCommandHandler : IRequestHandler<IngestFileCommand, Result<IngestFileResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IIngestionService _ingestionService;
    private readonly IIngestionQueueService _queue;
    private readonly ILogger<IngestFileCommandHandler> _logger;

    public IngestFileCommandHandler(
        IUnitOfWork unitOfWork,
        IIngestionService ingestionService,
        IIngestionQueueService queue,
        ILogger<IngestFileCommandHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _ingestionService = ingestionService;
        _queue = queue;
        _logger = logger;
    }

    public async Task<Result<IngestFileResponse>> Handle(IngestFileCommand request, CancellationToken ct)
    {
        var analysisId = Guid.NewGuid();
        var queueId = Guid.NewGuid();
        var extension = Path.GetExtension(request.File.FileName);

        // 1. Create analysis_results record (status=pending, ML will UPDATE it)
        var analysisResult = new AnalysisResult
        {
            Id = analysisId,
            TenantId = request.TenantId,
            UserId = request.UserId,
            OriginalFilename = request.File.FileName,
            FileExtension = extension,
            FileSizeBytes = request.File.Length,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            // 2. Parse file in memory (classification + text extraction)
            using var memoryStream = new MemoryStream();
            await request.File.CopyToAsync(memoryStream, ct);
            memoryStream.Position = 0;

            var ingestionResult = await _ingestionService.ProcessAsync(memoryStream, request.File.FileName, ct);

            analysisResult.Classification = ingestionResult.Classification;
            analysisResult.NumericSummary = ingestionResult.NumericSummary != null
                ? JsonSerializer.Serialize(ingestionResult.NumericSummary)
                : null;

            // 3. Save analysis_results (pending) — ML will UPDATE this row
            await _unitOfWork.AnalysisResults.AddAsync(analysisResult, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            // 4. Determine content for queue: text or serialized numeric data
            var content = !string.IsNullOrWhiteSpace(ingestionResult.ExtractedText)
                ? ingestionResult.ExtractedText
                : ingestionResult.NumericSeries != null
                    ? JsonSerializer.Serialize(ingestionResult.NumericSeries)
                    : "";

            var metadataJson = JsonSerializer.Serialize(new
            {
                file_size_bytes = request.File.Length,
                record_count = ingestionResult.RecordCount,
                word_count = content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length,
                columns = ingestionResult.Columns,
                analysis_result_id = analysisId
            });

            // 5. Write to ingestion_queue — ML poller picks this up
            await _queue.EnqueueAsync(
                queueId: queueId,
                tenantId: request.TenantId,
                userId: request.UserId,
                contentType: ingestionResult.Classification,
                sourceType: "upload",
                originalFilename: request.File.FileName,
                fileExtension: extension,
                content: content,
                metadataJson: metadataJson,
                ct: ct);

            _logger.LogInformation(
                "Enqueued {File}: classification={Class}, queueId={QueueId}, analysisId={AnalysisId}",
                request.File.FileName, ingestionResult.Classification, queueId, analysisId);

            // 6. Return immediately — frontend polls for result
            return Result<IngestFileResponse>.Success(new IngestFileResponse
            {
                AnalysisId = analysisId,
                QueueId = queueId,
                Filename = request.File.FileName,
                Classification = ingestionResult.Classification,
                Status = "pending",
                NumericSummary = ingestionResult.NumericSummary,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ingestion failed for {File}", request.File.FileName);

            analysisResult.Status = "error";
            analysisResult.ErrorMessage = ex.Message;

            try
            {
                await _unitOfWork.AnalysisResults.AddAsync(analysisResult, ct);
                await _unitOfWork.SaveChangesAsync(ct);
            }
            catch { /* best effort */ }

            var innerMsg = ex.InnerException?.Message ?? ex.Message;
            return Result<IngestFileResponse>.Failure($"Ingestion failed: {innerMsg}");
        }
    }
}
