namespace Zenin.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Tier { get; set; } = "free";
    public int MaxSeries { get; set; }
    public decimal MaxStorageGb { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Metadata { get; set; }
    public DateTime? DeletedAt { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Series> Series { get; set; } = new List<Series>();
}
