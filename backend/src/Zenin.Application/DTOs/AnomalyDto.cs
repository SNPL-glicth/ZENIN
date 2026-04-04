namespace Zenin.Application.DTOs;

public class AnomalyDto
{
    public int Id { get; set; }
    public string SeriesId { get; set; } = string.Empty;
    public DateTime DetectedAt { get; set; }
    public string Severity { get; set; } = string.Empty;
    public decimal AnomalyScore { get; set; }
    public decimal AnomalyConfidence { get; set; }
    public Dictionary<string, decimal>? MethodVotes { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public Guid? AuditTraceId { get; set; }
}
