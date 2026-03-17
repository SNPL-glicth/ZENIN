namespace Zenin.Domain.Entities;

public class Anomaly
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SeriesId { get; set; }
    public Series Series { get; set; } = null!;
    public DateTimeOffset DetectedAt { get; set; }
    public decimal AnomalyScore { get; set; }
    public string Severity { get; set; } = "none";
    public decimal? Confidence { get; set; }
    public string? MethodVotes { get; set; }
    public string? Explanation { get; set; }
    public string? Context { get; set; }
    public bool IsAcknowledged { get; set; }
    public Guid? AcknowledgedBy { get; set; }
    public DateTimeOffset? AcknowledgedAt { get; set; }
    public Guid? AuditTraceId { get; set; }
}
