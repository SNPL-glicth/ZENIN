namespace Zenin.Application.Common.Interfaces;

public class SemanticSearchResult
{
    public string DocId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public Guid AnalysisResultId { get; set; }
    public double Score { get; set; }
}

/// <summary>
/// Delegates semantic search to the ML Service.
/// .NET does NOT interact with Weaviate or generate embeddings — ML is the ONLY brain.
/// Indexing is handled by the ML Service poller (not by .NET).
/// </summary>
public interface IMLSearchService
{
    /// <summary>
    /// Forward semantic search query to ML Service.
    /// ML performs Weaviate search internally and returns results.
    /// </summary>
    Task<List<SemanticSearchResult>> SearchAsync(
        string query,
        Guid tenantId,
        int limit = 5,
        CancellationToken ct = default);
}
