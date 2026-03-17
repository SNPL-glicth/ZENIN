using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using Zenin.Application.Common.Interfaces;
using Zenin.Application.Services;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Commands;

/// <summary>
/// Handles document upload via /api/documents/upload.
/// Saves Document row, enqueues to ingestion_queue, returns immediately.
/// ML Service poller picks up the queue item and fills in the analysis.
/// NO direct HTTP calls to ML Service.
/// </summary>
public class UploadDocumentCommandHandler : IRequestHandler<UploadDocumentCommand, UploadDocumentResponse>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UniversalFileParser _parser;
    private readonly IIngestionQueueService _queue;
    private readonly ILogger<UploadDocumentCommandHandler> _logger;

    public UploadDocumentCommandHandler(
        IUnitOfWork unitOfWork,
        UniversalFileParser parser,
        IIngestionQueueService queue,
        ILogger<UploadDocumentCommandHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _parser = parser;
        _queue = queue;
        _logger = logger;
    }

    public async Task<UploadDocumentResponse> Handle(UploadDocumentCommand request, CancellationToken ct)
    {
        var documentId = Guid.NewGuid();
        var queueId = Guid.NewGuid();
        var extension = Path.GetExtension(request.File.FileName);
        var storedFilename = $"{documentId}{extension}";

        // Read file into memory
        using var memoryStream = new MemoryStream();
        await request.File.CopyToAsync(memoryStream, ct);

        // Parse from memory
        memoryStream.Position = 0;
        var parseResult = await _parser.ParseAsync(memoryStream, request.File.FileName);

        var document = new Document
        {
            Id = documentId,
            TenantId = request.TenantId,
            UploadedBy = request.UserId,
            OriginalFilename = request.File.FileName,
            StoredFilename = storedFilename,
            FileExtension = extension,
            FileSizeBytes = request.File.Length,
            MimeType = request.File.ContentType,
            ContentType = parseResult.ContentType,
            RawText = parseResult.RawText,
            NormalizedPayload = parseResult.NormalizedPayload != null
                ? JsonSerializer.Serialize(parseResult.NormalizedPayload)
                : null,
            Status = "pending",
            UploadedAt = DateTimeOffset.UtcNow
        };

        await _unitOfWork.Documents.AddAsync(document, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        // Enqueue for ML processing — poller picks this up
        var content = !string.IsNullOrWhiteSpace(parseResult.RawText)
            ? parseResult.RawText
            : parseResult.NormalizedPayload != null
                ? JsonSerializer.Serialize(parseResult.NormalizedPayload)
                : "";

        var metadataJson = JsonSerializer.Serialize(new
        {
            file_size_bytes = request.File.Length,
            document_id = documentId,
            content_type_parsed = parseResult.ContentType,
        });

        await _queue.EnqueueAsync(
            queueId: queueId,
            tenantId: request.TenantId,
            userId: request.UserId,
            contentType: parseResult.ContentType,
            sourceType: "upload",
            originalFilename: request.File.FileName,
            fileExtension: extension,
            content: content,
            metadataJson: metadataJson,
            ct: ct);

        _logger.LogInformation(
            "Document {DocumentId} enqueued as {QueueId} for ML processing",
            documentId, queueId);

        return new UploadDocumentResponse
        {
            DocumentId = documentId,
            Filename = request.File.FileName,
            ContentType = parseResult.ContentType,
            Status = "pending",
            Message = "Archivo encolado para análisis ML."
        };
    }
}
