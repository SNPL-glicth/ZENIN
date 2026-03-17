using System.Text.RegularExpressions;
using Zenin.Application.Common.Interfaces;

namespace Zenin.Infrastructure.Services;

public class NLUService : INLUService
{
    private static readonly string[] StopWords = {
        "el", "la", "los", "las", "un", "una", "de", "del", "en", "con", "por", "para",
        "que", "es", "son", "fue", "ser", "al", "lo", "se", "su", "no", "si", "como",
        "the", "a", "an", "is", "are", "was", "of", "in", "to", "for", "on", "with",
        "and", "or", "but", "not", "this", "that", "it", "be", "has", "have", "do",
        "me", "mi", "te", "le", "nos", "les", "más", "ya", "muy", "qué", "cuál"
    };

    private static readonly List<(Regex Pattern, QueryIntent Intent, double Confidence)> Rules = new()
    {
        // Calculation / Comparison
        (new Regex(@"\bcompara\b|\bvs\b|\bdiferencia\b|\bcompare\b|\bdifference\b|\bcomparación\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.Calculation, 0.95),
        (new Regex(@"\bcuánto\b.*\bmás\b|\bcuánto\b.*\bmenos\b|\bporcentaje\b|\bratio\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.Calculation, 0.90),
        (new Regex(@"\bmayor\b|\bmenor\b|\bmáximo\b|\bmínimo\b|\bpromedio\b|\bmedia\b|\baverage\b|\bmax\b|\bmin\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.Calculation, 0.85),

        // Analysis
        (new Regex(@"\banaliza\b|\banálisis\b|\btendencia\b|\bpatrón\b|\bpatrones\b|\banomalía\b|\banomalías\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.Analysis, 0.95),
        (new Regex(@"\btrend\b|\bpattern\b|\banomaly\b|\banalyze\b|\banalysis\b|\bdetect\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.Analysis, 0.90),
        (new Regex(@"\bpredice\b|\bpredecir\b|\bpredict\b|\bforecast\b|\bproyección\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.Analysis, 0.90),
        (new Regex(@"\bevolución\b|\bcambio\b|\bcomportamiento\b|\bestadístic\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.Analysis, 0.85),

        // Semantic Search
        (new Regex(@"\bbusca\b|\bencuentra\b|\bdocumento\b|\barchivo\b|\btexto\b|\bsobre\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.SemanticSearch, 0.90),
        (new Regex(@"\bsearch\b|\bfind\b|\bdocument\b|\babout\b|\brelated\b|\bsimilar\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.SemanticSearch, 0.90),
        (new Regex(@"\brelacionado\b|\bparecido\b|\bsimilar\b|\bcontiene\b|\bmenciona\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), QueryIntent.SemanticSearch, 0.85),
    };

    // Comparison pattern: "A vs B" or "compara A con B"
    private static readonly Regex ComparisonPattern = new(
        @"(?:compara\s+)?(?<A>[\w.]+)\s+(?:vs|versus|con|y|and)\s+(?<B>[\w.]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Entity extraction: quoted strings or filenames
    private static readonly Regex QuotedEntity = new(
        @"""([^""]+)""|'([^']+)'|(\S+\.\w{2,5})",
        RegexOptions.Compiled);

    public Task<DetectedIntent> DetectIntentAsync(string query, CancellationToken ct = default)
    {
        var normalized = Normalize(query);
        var keywords = ExtractKeywords(normalized);

        // Rule-based detection
        QueryIntent bestIntent = QueryIntent.GeneralQuestion;
        double bestConfidence = 0.5;

        foreach (var (pattern, intent, confidence) in Rules)
        {
            if (pattern.IsMatch(query))
            {
                if (confidence > bestConfidence)
                {
                    bestIntent = intent;
                    bestConfidence = confidence;
                }
            }
        }

        // Extract parameters based on intent
        var parameters = ExtractParameters(query, bestIntent);

        return Task.FromResult(new DetectedIntent
        {
            Type = bestIntent,
            Confidence = bestConfidence,
            OriginalQuery = query,
            NormalizedQuery = normalized,
            Keywords = keywords,
            ExtractedParameters = parameters
        });
    }

    private static string Normalize(string text)
    {
        // Lowercase
        var normalized = text.ToLowerInvariant().Trim();

        // Remove punctuation except dots in filenames
        normalized = Regex.Replace(normalized, @"[¿¡!?,;:()\[\]{}'\""]", " ");

        // Collapse whitespace
        normalized = Regex.Replace(normalized, @"\s+", " ").Trim();

        return normalized;
    }

    private static List<string> ExtractKeywords(string normalizedText)
    {
        var words = normalizedText.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var stopSet = new HashSet<string>(StopWords, StringComparer.OrdinalIgnoreCase);

        return words
            .Where(w => w.Length > 2 && !stopSet.Contains(w))
            .Distinct()
            .ToList();
    }

    private static Dictionary<string, object> ExtractParameters(string query, QueryIntent intent)
    {
        var parameters = new Dictionary<string, object>();

        // Extract comparison entities (A vs B)
        if (intent == QueryIntent.Calculation)
        {
            var match = ComparisonPattern.Match(query);
            if (match.Success)
            {
                parameters["A"] = match.Groups["A"].Value;
                parameters["B"] = match.Groups["B"].Value;
            }
        }

        // Extract quoted entities or filenames
        var entities = new List<string>();
        foreach (Match m in QuotedEntity.Matches(query))
        {
            var entity = m.Groups[1].Success ? m.Groups[1].Value
                       : m.Groups[2].Success ? m.Groups[2].Value
                       : m.Groups[3].Value;
            entities.Add(entity);
        }
        if (entities.Count > 0)
            parameters["entities"] = entities;

        return parameters;
    }
}
