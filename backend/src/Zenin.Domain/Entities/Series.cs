namespace Zenin.Domain.Entities;

public class Series : BaseEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string SeriesKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public string DataType { get; set; } = "numeric";
    public string SourceType { get; set; } = "manual";
    public Guid? SourceId { get; set; }
    public string? Metadata { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? DeletedAt { get; set; }
    public ICollection<DataPoint> DataPoints { get; set; } = new List<DataPoint>();
    public ICollection<Prediction> Predictions { get; set; } = new List<Prediction>();
    public ICollection<Anomaly> Anomalies { get; set; } = new List<Anomaly>();
    public ICollection<Pattern> Patterns { get; set; } = new List<Pattern>();
    public SeriesLatest? Latest { get; set; }
    public SeriesProfile? Profile { get; set; }
}
