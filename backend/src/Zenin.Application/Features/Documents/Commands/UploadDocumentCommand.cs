using MediatR;
using Microsoft.AspNetCore.Http;

namespace Zenin.Application.Features.Documents.Commands;

public record UploadDocumentCommand(
    IFormFile File,
    Guid TenantId,
    Guid UserId
) : IRequest<UploadDocumentResponse>;

public class UploadDocumentResponse
{
    public Guid DocumentId { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
