namespace Zenin.Domain.Entities;

public class Prediction
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ModelId { get; set; }
    public Guid SeriesId { get; set; }
    public Series Series { get; set; } = null!;
    public decimal PredictedValue { get; set; }
    public decimal? ConfidenceScore { get; set; }
    public string? ConfidenceLevel { get; set; }
    public string? Trend { get; set; }
    public int? HorizonSteps { get; set; }
    public decimal? ConfidenceIntervalLower { get; set; }
    public decimal? ConfidenceIntervalUpper { get; set; }
    public DateTimeOffset PredictedAt { get; set; }
    public DateTimeOffset? TargetTimestamp { get; set; }
    public bool IsAnomaly { get; set; }
    public decimal? AnomalyScore { get; set; }
    public string RiskLevel { get; set; } = "NONE";
    public string? Explanation { get; set; }
    public string? ExplanationJson { get; set; }
    public string? EngineName { get; set; }
    public string? Metadata { get; set; }
    public Guid? AuditTraceId { get; set; }
}
