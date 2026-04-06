namespace Zenin.Application.DTOs;

public class PredictionDto
{
    public int Id { get; set; }
    public string SeriesId { get; set; } = string.Empty;
    public decimal PredictedValue { get; set; }
    public decimal Confidence { get; set; }
    public string Trend { get; set; } = string.Empty;
    public string SelectedEngine { get; set; } = string.Empty;
    public string RiskLevel { get; set; } = "NONE";
    public string Severity { get; set; } = "info";
    public string? Explanation { get; set; }
    public string? ExplanationJson { get; set; }
    public string? Metadata { get; set; }
    public string Regime { get; set; } = "unknown";
    public bool IsAnomaly { get; set; }
    public decimal AnomalyScore { get; set; }
    public DateTime PredictedAt { get; set; }
    public DateTime? TargetTimestamp { get; set; }
    public int HorizonMinutes { get; set; }
}
