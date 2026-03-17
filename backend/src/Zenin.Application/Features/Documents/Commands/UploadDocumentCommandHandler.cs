using System.Net.Http.Json;
using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Configuration;
using Zenin.Application.Services;
using Zenin.Domain.Entities;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Commands;

public class UploadDocumentCommandHandler : IRequestHandler<UploadDocumentCommand, UploadDocumentResponse>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UniversalFileParser _parser;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public UploadDocumentCommandHandler(
        IUnitOfWork unitOfWork,
        UniversalFileParser parser,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _unitOfWork = unitOfWork;
        _parser = parser;
        _configuration = configuration;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<UploadDocumentResponse> Handle(UploadDocumentCommand request, CancellationToken ct)
    {
        var documentId = Guid.NewGuid();
        var extension = Path.GetExtension(request.File.FileName);
        var storedFilename = $"{documentId}{extension}";

        // Read file into memory
        using var memoryStream = new MemoryStream();
        await request.File.CopyToAsync(memoryStream, ct);
        var binaryContent = memoryStream.ToArray();

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
            Status = "processing",
            UploadedAt = DateTimeOffset.UtcNow
        };

        await _unitOfWork.Documents.AddAsync(document, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        _ = Task.Run(async () =>
        {
            try
            {
                var mlServiceUrl = _configuration["MlService:BaseUrl"];
                var timeoutSeconds = int.Parse(_configuration["MlService:TimeoutSeconds"] ?? "30");

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
                var payload = new
                {
                    document_id = documentId.ToString(),
                    content_type = parseResult.ContentType,
                    normalized_payload = parseResult.NormalizedPayload
                };

                var response = await _httpClient.PostAsJsonAsync(
                    $"{mlServiceUrl}/ml/analyze-document",
                    payload,
                    cts.Token);

                if (!response.IsSuccessStatusCode)
                {
                    document.Status = "error";
                    document.ErrorMessage = $"ML Service returned {response.StatusCode}";
                    await _unitOfWork.SaveChangesAsync(CancellationToken.None);
                }
            }
            catch (Exception ex)
            {
                document.Status = "error";
                document.ErrorMessage = ex.Message;
                await _unitOfWork.SaveChangesAsync(CancellationToken.None);
            }
        }, ct);

        return new UploadDocumentResponse
        {
            DocumentId = documentId,
            Filename = request.File.FileName,
            ContentType = parseResult.ContentType,
            Status = "pending",
            Message = "Archivo guardado en BD. ML Service lo procesará de forma asíncrona."
        };
    }
}
