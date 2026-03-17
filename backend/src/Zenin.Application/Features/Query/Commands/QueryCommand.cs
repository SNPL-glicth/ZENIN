using MediatR;
using Zenin.Application.Common.Models;

namespace Zenin.Application.Features.Query.Commands;

public record QueryCommand(
    string Question,
    Guid TenantId
) : IRequest<Result<QueryResponse>>;

public class QueryResponse
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public List<QuerySource> Sources { get; set; } = new();
    public object? Data { get; set; }
}

public class QuerySource
{
    public string Type { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public double Relevance { get; set; }
    public Guid? AnalysisResultId { get; set; }
}
