using Microsoft.EntityFrameworkCore;
using Zenin.Domain.Entities;

namespace Zenin.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Series> Series => Set<Series>();
    public DbSet<DataPoint> DataPoints => Set<DataPoint>();
    public DbSet<SeriesLatest> SeriesLatest => Set<SeriesLatest>();
    public DbSet<SeriesProfile> SeriesProfiles => Set<SeriesProfile>();
    public DbSet<Prediction> Predictions => Set<Prediction>();
    public DbSet<Anomaly> Anomalies => Set<Anomaly>();
    public DbSet<Pattern> Patterns => Set<Pattern>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<AnalysisResult> AnalysisResults => Set<AnalysisResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users", "zenin_core");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.HasIndex(e => e.Email);
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired().HasColumnName("email");
            entity.Property(e => e.PasswordHash).IsRequired().HasColumnName("password_hash");
            entity.Property(e => e.FirstName).HasMaxLength(100).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasMaxLength(100).HasColumnName("last_name");
            entity.Property(e => e.Role).HasMaxLength(50).IsRequired().HasColumnName("role");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Ignore(e => e.UpdatedAt);
            entity.Ignore(e => e.LastLoginAt);
            entity.Ignore(e => e.RefreshToken);
            entity.Ignore(e => e.RefreshTokenExpiryTime);
            entity.Ignore(e => e.IsDeleted);
            entity.HasQueryFilter(e => e.IsActive);
            entity.HasOne(e => e.Tenant).WithMany(t => t.Users).HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs", "zenin_audit");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired().HasColumnName("action");
            entity.Property(e => e.EntityType).HasMaxLength(100).IsRequired().HasColumnName("entity_type");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.IpAddress).HasMaxLength(45).HasColumnName("ip_address");
            entity.Property(e => e.UserAgent).HasMaxLength(500).HasColumnName("user_agent");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            
            entity.HasOne(e => e.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.ToTable("tenants", "zenin_core");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Metadata).HasColumnType("nvarchar(max)");

            entity.HasData(new Tenant
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                Name = "Default",
                Slug = "default",
                Tier = "free",
                MaxSeries = 100,
                MaxStorageGb = 1.0m,
                IsActive = true,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            });
        });

        modelBuilder.Entity<Series>(entity =>
        {
            entity.ToTable("series", "zenin_ts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SeriesKey).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Metadata).HasColumnType("nvarchar(max)");
            entity.HasIndex(e => new { e.TenantId, e.SeriesKey }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany(t => t.Series).HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Latest).WithOne(l => l.Series).HasForeignKey<SeriesLatest>(l => l.SeriesId);
            entity.HasOne(e => e.Profile).WithOne(p => p.Series).HasForeignKey<SeriesProfile>(p => p.SeriesId);
        });

        modelBuilder.Entity<DataPoint>(entity =>
        {
            entity.ToTable("data_points", "zenin_ts");
            entity.HasKey(e => new { e.TenantId, e.SeriesId, e.Timestamp });
            entity.Property(e => e.Metadata).HasColumnType("nvarchar(max)");
            entity.HasOne(e => e.Series).WithMany(s => s.DataPoints).HasForeignKey(e => e.SeriesId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SeriesLatest>(entity =>
        {
            entity.ToTable("series_latest", "zenin_ts");
            entity.HasKey(e => e.SeriesId);
        });

        modelBuilder.Entity<SeriesProfile>(entity =>
        {
            entity.ToTable("series_profiles", "zenin_ts");
            entity.HasKey(e => e.SeriesId);
        });

        modelBuilder.Entity<Prediction>(entity =>
        {
            entity.ToTable("predictions", "zenin_ml");
            entity.HasKey(e => new { e.TenantId, e.SeriesId, e.PredictedAt });
            entity.Property(e => e.ExplanationJson).HasColumnType("nvarchar(max)");
            entity.Property(e => e.Metadata).HasColumnType("nvarchar(max)");
            entity.HasOne(e => e.Series).WithMany(s => s.Predictions).HasForeignKey(e => e.SeriesId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Anomaly>(entity =>
        {
            entity.ToTable("anomalies", "zenin_ml");
            entity.HasKey(e => new { e.TenantId, e.SeriesId, e.DetectedAt });
            entity.Property(e => e.MethodVotes).HasColumnType("nvarchar(max)");
            entity.Property(e => e.Context).HasColumnType("nvarchar(max)");
            entity.HasOne(e => e.Series).WithMany(s => s.Anomalies).HasForeignKey(e => e.SeriesId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Pattern>(entity =>
        {
            entity.ToTable("patterns", "zenin_ml");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Metadata).HasColumnType("nvarchar(max)");
            entity.HasOne(e => e.Series).WithMany(s => s.Patterns).HasForeignKey(e => e.SeriesId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("documents", "zenin_docs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BinaryContent).HasColumnType("varbinary(max)");
            entity.Property(e => e.NormalizedPayload).HasColumnType("nvarchar(max)");
            entity.Property(e => e.MlResult).HasColumnType("nvarchar(max)");
            entity.Property(e => e.Metadata).HasColumnType("nvarchar(max)");
            entity.Property(e => e.MlDocId).HasColumnName("WeaviateId").HasMaxLength(255);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Uploader).WithMany().HasForeignKey(e => e.UploadedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AnalysisResult>(entity =>
        {
            entity.ToTable("analysis_results", "zenin_docs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Classification).HasMaxLength(50).IsRequired();
            entity.Property(e => e.OriginalFilename).HasMaxLength(500).IsRequired();
            entity.Property(e => e.FileExtension).HasMaxLength(20);
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.Property(e => e.MlDocId).HasColumnName("WeaviateDocId").HasMaxLength(255);
            entity.Property(e => e.SemanticName).HasMaxLength(500);
            entity.Property(e => e.NumericSummary).HasColumnType("nvarchar(max)");
            entity.Property(e => e.TextSummary).HasColumnType("nvarchar(max)");
            entity.Property(e => e.MlResult).HasColumnType("nvarchar(max)");
            entity.Property(e => e.Conclusion).HasColumnType("nvarchar(max)");
            entity.Property(e => e.ErrorMessage).HasColumnType("nvarchar(max)");
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries<BaseEntity>();
        
        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTime.UtcNow;
            }
            // UpdatedAt is ignored for User entity since it doesn't exist in zenin_core.users
            // Only set it for entities that have this column
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
