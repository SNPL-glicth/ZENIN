namespace Zenin.Application.Features.Documents.Commands;

public class BulkDeleteRequest
{
    public List<Guid> Ids { get; set; } = new();
}
