using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Zenin.Application.Common.Interfaces;

namespace Zenin.Infrastructure.Services;

/// <summary>
/// Delegates semantic search and document indexing to the ML Service via HTTP.
/// .NET does NOT interact with Weaviate, generate embeddings, or perform vector operations.
/// ML Service is the ONLY component that touches Weaviate.
/// </summary>
public class MLSearchService : IMLSearchService
{
    private readonly HttpClient _httpClient;
    private readonly ICacheService _cache;
    private readonly string? _mlBaseUrl;
    private readonly int _timeoutSeconds;
    private readonly ILogger<MLSearchService> _logger;

    private const string CachePrefix = "ml:search:";
    private static readonly TimeSpan CacheTTL = TimeSpan.FromMinutes(5);

    public MLSearchService(
        IHttpClientFactory httpClientFactory,
        ICacheService cache,
        IConfiguration configuration,
        ILogger<MLSearchService> logger)
    {
        _httpClient = httpClientFactory.CreateClient();
        _cache = cache;
        _mlBaseUrl = configuration["MlService:BaseUrl"];
        _timeoutSeconds = int.Parse(configuration["MlService:TimeoutSeconds"] ?? "30");
        _logger = logger;
    }

    public async Task<List<SemanticSearchResult>> SearchAsync(
        string query, Guid tenantId, int limit = 5, CancellationToken ct = default)
    {
        // 1. Check Redis cache first
        var cacheKey = $"{CachePrefix}{tenantId}:{query.GetHashCode():X}:{limit}";
        var cached = await _cache.GetAsync<List<SemanticSearchResult>>(cacheKey, ct);
        if (cached != null)
        {
            _logger.LogDebug("ML search cache hit: key={Key}", cacheKey);
            return cached;
        }

        // 2. Forward to ML Service
        if (string.IsNullOrEmpty(_mlBaseUrl))
            return new List<SemanticSearchResult>();

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_timeoutSeconds));

            var payload = new
            {
                query,
                tenant_id = tenantId.ToString(),
                limit
            };

            var response = await _httpClient.PostAsJsonAsync(
                $"{_mlBaseUrl}/ml/semantic-search", payload, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("ML Service semantic-search returned {Status}", response.StatusCode);
                return new List<SemanticSearchResult>();
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cts.Token);
            var results = ParseSearchResults(json);

            // 3. Cache results in Redis
            if (results.Count > 0)
            {
                await _cache.SetAsync(cacheKey, results, CacheTTL, ct);
            }

            _logger.LogInformation("ML semantic search: {Count} results", results.Count);
            return results;
        }
        catch (Exception ex) when (ex is TaskCanceledException or HttpRequestException)
        {
            _logger.LogWarning(ex, "ML Service unreachable for semantic search");
            return new List<SemanticSearchResult>();
        }
    }

    private static List<SemanticSearchResult> ParseSearchResults(JsonElement json)
    {
        var results = new List<SemanticSearchResult>();

        if (!json.TryGetProperty("results", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return results;

        foreach (var item in arr.EnumerateArray())
        {
            var result = new SemanticSearchResult
            {
                DocId = item.TryGetProperty("doc_id", out var d) ? d.GetString() ?? "" : "",
                Content = item.TryGetProperty("content", out var c) ? c.GetString() ?? "" : "",
                Source = item.TryGetProperty("source", out var s) ? s.GetString() ?? "" : "",
                Classification = item.TryGetProperty("classification", out var cl) ? cl.GetString() ?? "" : "",
                Score = item.TryGetProperty("score", out var sc) && sc.TryGetDouble(out var sv) ? sv : 0,
            };

            if (item.TryGetProperty("tenant_id", out var tid))
                result.TenantId = Guid.TryParse(tid.GetString(), out var tg) ? tg : Guid.Empty;
            if (item.TryGetProperty("analysis_result_id", out var arid))
                result.AnalysisResultId = Guid.TryParse(arid.GetString(), out var ag) ? ag : Guid.Empty;

            results.Add(result);
        }

        return results;
    }
}
