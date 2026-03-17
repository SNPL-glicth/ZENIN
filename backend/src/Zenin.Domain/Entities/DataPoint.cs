namespace Zenin.Domain.Entities;

public class DataPoint
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SeriesId { get; set; }
    public Series Series { get; set; } = null!;
    public DateTimeOffset Timestamp { get; set; }
    public decimal Value { get; set; }
    public decimal? QualityScore { get; set; }
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
}
