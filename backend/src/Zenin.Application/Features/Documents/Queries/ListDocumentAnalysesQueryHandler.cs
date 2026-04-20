using MediatR;
using System.Text.Json;
using Zenin.Domain.Interfaces;

namespace Zenin.Application.Features.Documents.Queries;

public class ListDocumentAnalysesQueryHandler : IRequestHandler<ListDocumentAnalysesQuery, List<DocumentAnalysisDto>>
{
    private readonly IAnalysisResultRepository _analysisRepository;

    public ListDocumentAnalysesQueryHandler(IAnalysisResultRepository analysisRepository)
    {
        _analysisRepository = analysisRepository;
    }

    public async Task<List<DocumentAnalysisDto>> Handle(ListDocumentAnalysesQuery request, CancellationToken ct)
    {
        var analyses = await _analysisRepository.GetByTenantAsync(
            request.TenantId,
            request.Page,
            request.PageSize,
            ct);

        // Filter by status if provided
        if (!string.IsNullOrEmpty(request.Status))
        {
            analyses = analyses.Where(a => a.Status == request.Status);
        }

        return analyses.Select(MapToDto).ToList();
    }
    
    private static DocumentAnalysisDto MapToDto(Domain.Entities.AnalysisResult result)
    {
        // Default values
        decimal? confidence = null;
        string? domain = null;
        string riskLevel = "NONE";
        string severity = "info";
        decimal urgencyScore = 0;
        string sentimentLabel = "neutral";
        string pattern = "unknown";
        bool actionRequired = false;
        var actions = new List<string>();
        var entities = new List<string>();

        // Parse MlResult JSON if available
        if (!string.IsNullOrEmpty(result.MlResult))
        {
            try
            {
                using var doc = JsonDocument.Parse(result.MlResult);
                var ml = doc.RootElement;
                
                // Extract confidence
                if (ml.TryGetProperty("confidence", out var conf))
                    confidence = conf.GetDecimal();
                    
                // Extract domain
                if (ml.TryGetProperty("domain", out var dom))
                    domain = dom.GetString();
                
                // Extract severity object
                if (ml.TryGetProperty("severity", out var sev))
                {
                    if (sev.ValueKind == JsonValueKind.Object)
                    {
                        riskLevel = sev.TryGetProperty("risk_level", out var rl) 
                            ? rl.GetString() ?? "NONE" : "NONE";
                        severity = sev.TryGetProperty("severity", out var sv)
                            ? sv.GetString() ?? "info" : "info";
                        actionRequired = sev.TryGetProperty("action_required", out var ar)
                            && ar.GetBoolean();
                    }
                    else if (sev.ValueKind == JsonValueKind.String)
                    {
                        // Fallback: severity is just a string
                        severity = sev.GetString() ?? "info";
                    }
                }
                
                // Extract urgency_score
                if (ml.TryGetProperty("urgency_score", out var us))
                {
                    if (us.ValueKind == JsonValueKind.Number)
                        urgencyScore = us.GetDecimal();
                }
                    
                // Extract sentiment_label
                if (ml.TryGetProperty("sentiment_label", out var sl))
                    sentimentLabel = sl.GetString() ?? "neutral";
                    
                // Extract pattern
                if (ml.TryGetProperty("pattern", out var pt))
                    pattern = pt.GetString() ?? "unknown";
                    
                // Extract actions array
                if (ml.TryGetProperty("actions", out var ac) && 
                    ac.ValueKind == JsonValueKind.Array)
                {
                    actions = ac.EnumerateArray()
                        .Select(a => a.GetString() ?? "")
                        .Where(a => !string.IsNullOrEmpty(a))
                        .ToList();
                }
                    
                // Extract entities array
                if (ml.TryGetProperty("entities", out var ent) && 
                    ent.ValueKind == JsonValueKind.Array)
                {
                    entities = ent.EnumerateArray()
                        .Select(e => e.GetString() ?? "")
                        .Where(e => !string.IsNullOrEmpty(e))
                        .ToList();
                }
            }
            catch
            {
                // JSON malformed → use defaults
            }
        }

        return new DocumentAnalysisDto
        {
            // Original fields
            Id = result.Id,
            OriginalFilename = result.OriginalFilename,
            FileExtension = result.FileExtension,
            FileSizeBytes = result.FileSizeBytes,
            Classification = result.Classification,
            Status = result.Status,
            Conclusion = result.Conclusion,
            MlResult = result.MlResult,
            SemanticName = result.SemanticName,
            MlDocId = result.MlDocId,
            AnalyzedAt = result.AnalyzedAt,
            CreatedAt = result.CreatedAt,
            
            // Extracted fields
            Confidence = confidence,
            Domain = domain,
            RiskLevel = riskLevel,
            Severity = severity,
            UrgencyScore = urgencyScore,
            SentimentLabel = sentimentLabel,
            Pattern = pattern,
            ActionRequired = actionRequired,
            Actions = actions,
            Entities = entities
        };
    }
}
