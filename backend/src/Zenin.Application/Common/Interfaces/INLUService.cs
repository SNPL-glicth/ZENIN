namespace Zenin.Application.Common.Interfaces;

public enum QueryIntent
{
    Calculation,
    Analysis,
    SemanticSearch,
    GeneralQuestion
}

public class DetectedIntent
{
    public QueryIntent Type { get; set; }
    public double Confidence { get; set; }
    public string OriginalQuery { get; set; } = string.Empty;
    public string NormalizedQuery { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = new();
    public Dictionary<string, object> ExtractedParameters { get; set; } = new();
}

public interface INLUService
{
    Task<DetectedIntent> DetectIntentAsync(string query, CancellationToken ct = default);
}
