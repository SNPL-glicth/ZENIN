namespace Zenin.Domain.Entities;

public class SeriesLatest
{
    public Guid SeriesId { get; set; }
    public Series Series { get; set; } = null!;
    public Guid TenantId { get; set; }
    public decimal? LatestValue { get; set; }
    public DateTimeOffset? LatestTimestamp { get; set; }
    public DateTime UpdatedAt { get; set; }
}
