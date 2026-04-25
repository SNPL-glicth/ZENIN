using System.Net.Http.Json;
using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Zenin.Application.Common.Interfaces;
using Zenin.Application.Common.Models;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Query.Commands;

/// <summary>
/// Query handler — PURE RELAY.
/// 
/// .NET does NOT analyze, calculate, or generate intelligent text.
/// .NET does NOT interact with Weaviate — ML Service is the ONLY brain.
/// 
/// Flow:
///   1. NLU routing (regex only — acceptable in .NET)
///   2. Forward question to ML Service via HTTP → ML generates answer
///   3. If ML unavailable → read pre-computed MlResult/Conclusion from DB + ML semantic search
///   4. Return whatever ML produced
/// </summary>
public class QueryCommandHandler : IRequestHandler<QueryCommand, Result<QueryResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMLSearchService _mlSearch;
    private readonly ICacheService _cache;
    private readonly INLUService _nlu;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<QueryCommandHandler> _logger;

    public QueryCommandHandler(
        IUnitOfWork unitOfWork,
        IMLSearchService mlSearch,
        ICacheService cache,
        INLUService nlu,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<QueryCommandHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _mlSearch = mlSearch;
        _cache = cache;
        _nlu = nlu;
        _configuration = configuration;
        _httpClient = httpClientFactory.CreateClient();
        _logger = logger;
    }

    public async Task<Result<QueryResponse>> Handle(QueryCommand request, CancellationToken ct)
    {
        // 1. NLU: detect intent locally (regex routing only — no analysis)
        var intent = await _nlu.DetectIntentAsync(request.Question, ct);

        _logger.LogInformation("NLU: intent={Intent} confidence={Confidence:F2}",
            intent.Type, intent.Confidence);

        // 2. Check Redis cache for identical recent query (if enabled)
        var cacheEnabled = _configuration.GetValue<bool>("CHAT_CACHE_ENABLED", false);
        if (cacheEnabled)
        {
            var cacheKey = $"query:{request.TenantId}:{request.Question.GetHashCode():X}";
            var cached = await _cache.GetAsync<QueryResponse>(cacheKey, ct);
            if (cached != null)
            {
                _logger.LogDebug("Query cache hit: key={Key}", cacheKey);
                return Result<QueryResponse>.Success(cached);
            }
        }

        // 3. Try ML Service first — it is the ONLY brain
        var mlAnswer = await ForwardToMlServiceAsync(request, intent, ct);

        if (mlAnswer != null)
        {
            _logger.LogInformation("Query answered by ML Service: intent={Intent}", intent.Type);
            
            // Solo cachear si está habilitado
            if (cacheEnabled)
            {
                var cacheKey = $"query:{request.TenantId}:{request.Question.GetHashCode():X}";
                await _cache.SetAsync(cacheKey, mlAnswer, TimeSpan.FromMinutes(5), ct);
            }
            
            return Result<QueryResponse>.Success(mlAnswer);
        }

        // 4. ML unavailable — return error instead of stale fallback
        _logger.LogError("ML Service unavailable for query: {Question}", request.Question);
        return Result<QueryResponse>.Failure(
            "No pude procesar tu mensaje. El servicio de ML no está disponible. Intenta de nuevo en unos momentos.");
    }

    /// <summary>
    /// Forward question to ML Service. ML does ALL the thinking.
    /// .NET only sends the question and receives the answer.
    /// </summary>
    private async Task<QueryResponse?> ForwardToMlServiceAsync(
        QueryCommand request, DetectedIntent intent, CancellationToken ct)
    {
        try
        {
            var mlServiceUrl = _configuration["MlService:BaseUrl"];
            if (string.IsNullOrEmpty(mlServiceUrl)) return null;

            var timeoutSeconds = int.Parse(_configuration["MlService:TimeoutSeconds"] ?? "30");
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

            // Gather raw DB data for ML to analyze (no processing, just retrieval)
            var analysisResults = (await _unitOfWork.AnalysisResults
                .GetByTenantAsync(request.TenantId, 1, 20, ct))
                .Select(r => new
                {
                    id = r.Id,
                    filename = r.OriginalFilename,
                    classification = r.Classification,
                    status = r.Status,
                    numeric_summary = r.NumericSummary,
                    text_summary = r.TextSummary,
                    ml_result = r.MlResult,
                    conclusion = r.Conclusion,
                    analyzed_at = r.AnalyzedAt
                })
                .ToList();

            // Nuevo formato /ml/query con session_id para contexto
            var sessionId = Guid.NewGuid().ToString(); // Generar session temporal por query
            var payload = new
            {
                session_id = sessionId,
                message = request.Question,
                tenant_id = request.TenantId.ToString(),
                include_context = false
            };

            var response = await _httpClient.PostAsJsonAsync(
                $"{mlServiceUrl}/ml/query", payload, cts.Token);

            if (!response.IsSuccessStatusCode) return null;

            var mlResponse = await response.Content.ReadFromJsonAsync<JsonElement>(cts.Token);

            // Leer campos del nuevo formato QueryResponse
            var responseText = mlResponse.TryGetProperty("response_text", out var rt) 
                ? rt.GetString() ?? "" 
                : "";
            
            return new QueryResponse
            {
                Question = request.Question,
                Answer = responseText,
                Sources = new List<QuerySource>(), // Simplified - no sources in new format
                Data = mlResponse.TryGetProperty("metadata", out var meta) ? meta.Deserialize<object>() : null
            };
        }
        catch (Exception ex) when (ex is TaskCanceledException or HttpRequestException)
        {
            _logger.LogWarning(ex, "ML Service unreachable for query");
            return null;
        }
    }

    /// <summary>
    /// Fallback: read pre-computed ML results from DB + ML semantic search.
    /// .NET does NOT interpret or analyze — just reads and relays.
    /// </summary>
    private async Task<QueryResponse> ReadFromDatabaseAsync(
        QueryCommand request, DetectedIntent intent, CancellationToken ct)
    {
        var response = new QueryResponse { Question = request.Question };

        // Read pre-computed results from DB
        var allResults = (await _unitOfWork.AnalysisResults
            .GetByTenantAsync(request.TenantId, 1, 20, ct)).ToList();

        if (allResults.Count == 0)
        {
            response.Answer = "No se encontraron datos. Sube archivos para comenzar el análisis.";
            return response;
        }

        // Semantic search via ML Service (ML handles Weaviate internally)
        var semanticResults = await _mlSearch.SearchAsync(
            request.Question, request.TenantId, limit: 5, ct: ct);

        // Build response from pre-computed ML results — NO calculation, NO interpretation
        var sources = new List<QuerySource>();

        sources.AddRange(semanticResults.Select(d => new QuerySource
        {
            Type = "semantic",
            Source = d.Source,
            Excerpt = d.Content.Length > 300 ? d.Content[..300] + "..." : d.Content,
            Relevance = d.Score,
            AnalysisResultId = d.AnalysisResultId != Guid.Empty ? d.AnalysisResultId : null
        }));

        sources.AddRange(allResults.Take(5).Select(r => new QuerySource
        {
            Type = "sql_analysis",
            Source = r.OriginalFilename,
            Excerpt = r.Conclusion ?? r.Classification,
            Relevance = 0.5,
            AnalysisResultId = r.Id
        }));

        response.Sources = sources.OrderByDescending(s => s.Relevance).Take(5).ToList();

        // Return pre-computed ML conclusions — .NET does NOT generate text
        var conclusionParts = allResults
            .Where(r => r.MlResult != null || r.Conclusion != null)
            .Take(5)
            .Select(r => r.Conclusion ?? r.MlResult ?? "")
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .ToList();

        response.Answer = conclusionParts.Count > 0
            ? string.Join("\n---\n", conclusionParts)
            : "Los datos están siendo procesados por ML. Intenta de nuevo en unos momentos.";

        response.Data = allResults.Take(5).Select(r => (object)new
        {
            id = r.Id,
            filename = r.OriginalFilename,
            classification = r.Classification,
            status = r.Status,
            analyzedAt = r.AnalyzedAt,
        }).ToList();

        return response;
    }

    // ── Helpers (data mapping only — NO analysis) ──

    private static List<QuerySource> ExtractSources(JsonElement mlResponse)
    {
        var sources = new List<QuerySource>();
        if (!mlResponse.TryGetProperty("sources", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return sources;

        foreach (var item in arr.EnumerateArray())
        {
            sources.Add(new QuerySource
            {
                Type = item.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "",
                Source = item.TryGetProperty("source", out var s) ? s.GetString() ?? "" : "",
                Excerpt = item.TryGetProperty("excerpt", out var e) ? e.GetString() ?? "" : "",
                Relevance = item.TryGetProperty("relevance", out var r) ? r.GetDouble() : 0,
            });
        }
        return sources;
    }
}
