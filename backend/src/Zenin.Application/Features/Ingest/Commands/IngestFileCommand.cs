using MediatR;
using Microsoft.AspNetCore.Http;
using Zenin.Application.Common.Models;

namespace Zenin.Application.Features.Ingest.Commands;

public record IngestFileCommand(
    IFormFile File,
    Guid TenantId,
    Guid UserId
) : IRequest<Result<IngestFileResponse>>;

public class IngestFileResponse
{
    public Guid AnalysisId { get; set; }
    public Guid? QueueId { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    /// <summary>pending | analyzed | error</summary>
    public string Status { get; set; } = string.Empty;
    public object? NumericSummary { get; set; }
    public object? TextSummary { get; set; }
    public object? MlResult { get; set; }
    public string? Conclusion { get; set; }
}
