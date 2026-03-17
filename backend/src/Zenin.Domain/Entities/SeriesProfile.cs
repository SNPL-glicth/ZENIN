namespace Zenin.Domain.Entities;

public class SeriesProfile
{
    public Guid SeriesId { get; set; }
    public Series Series { get; set; } = null!;
    public Guid TenantId { get; set; }
    public decimal? Mean { get; set; }
    public decimal? StdDev { get; set; }
    public decimal? MinValue { get; set; }
    public decimal? MaxValue { get; set; }
    public string? VolatilityLevel { get; set; }
    public string? StationarityHint { get; set; }
    public string? Regime { get; set; }
    public DateTime? LastComputedAt { get; set; }
    public string? Metadata { get; set; }
    public DateTime UpdatedAt { get; set; }
}
