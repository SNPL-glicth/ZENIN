namespace Zenin.Domain.Entities;

public class Pattern
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SeriesId { get; set; }
    public Series Series { get; set; } = null!;
    public string PatternType { get; set; } = string.Empty;
    public decimal? Confidence { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset DetectedAt { get; set; }
    public DateTimeOffset? StartTimestamp { get; set; }
    public DateTimeOffset? EndTimestamp { get; set; }
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
}
