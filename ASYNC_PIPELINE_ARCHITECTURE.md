# ZENIN - Async Pipeline Architecture

## Flujo Real del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE ASINCRÓNICO (PYTHON)                             │
└─────────────────────────────────────────────────────────────────────────────┘

[IoT Device]
     │
     │ POST /ingest/packets
     ▼
┌──────────────────┐
│  Ingesta API     │ FastAPI (Python)
│  (iot_ingest)    │ - Valida device_key
│                  │ - Resuelve sensor_id → series_id
│                  │ - BatchInserter → zenin_write.data_points
└────────┬─────────┘
         │
         │ Publica a Redis Stream: readings:validated
         ▼
┌──────────────────┐
│  Broker          │ Redis Streams
│  (iot_broker)    │ - Consumer groups
│                  │ - Backpressure
│                  │ - Persistencia
└────────┬─────────┘
         │
         │ Consume: readings:validated
         ▼
┌──────────────────┐
│  ML Service      │ UTSAE (Python)
│  (iot_ml)        │ - MetaCognitiveOrchestrator.predict()
│                  │ - AnomalyDetector.detect()
│                  │ - PatternDetector.analyze()
└────────┬─────────┘
         │
         │ Genera: Prediction, AnomalyResult, Explanation
         ▼
┌──────────────────┐
│  Orchestrator    │ Decision Orchestrator (Python)
│  (iot_worker)    │ - Procesa eventos ML
│                  │ - Actualiza snapshots
│                  │ - Escribe en zenin_read.*
│                  │ - Escribe en zenin_ml.*
│                  │ - Refresca materialized views
└────────┬─────────┘
         │
         │ Escribe en PostgreSQL
         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL (SOURCE OF TRUTH)                          │
│                                                                               │
│  zenin_write.*  ← Datos crudos (particionados)                              │
│  zenin_read.*   ← Snapshots optimizados (series_latest, profiles, etc.)     │
│  zenin_ml.*     ← Outputs ML (predictions, anomalies)                       │
└───────────────────────────────────────────────────────────────────────────────┘
         ▲
         │ SELECT (Read-Only)
         │
┌──────────────────┐
│  Backend .NET    │ ASP.NET Core 8
│  (ZENIN)         │ - Solo consulta vistas optimizadas
│                  │ - NO escribe
│                  │ - NO procesa
│                  │ - NO se comunica con Python
└────────┬─────────┘
         │
         │ HTTP API
         ▼
┌──────────────────┐
│  Frontend        │ React + Vite
│  (Dashboard)     │ - Gráficas en tiempo real
│                  │ - Alertas
│                  │ - Analytics
└──────────────────┘
```

---

## Separación de Responsabilidades

### Python Pipeline (Escritura Intensiva)
- **Ingesta API:** Recibe datos, valida, escribe en `zenin_write.data_points`
- **Broker:** Coordina flujo de eventos (Redis Streams)
- **ML Service:** Ejecuta UTSAE, genera predicciones/anomalías
- **Orchestrator:** Actualiza snapshots, agrega métricas, refresca vistas

### Backend .NET (Lectura Optimizada)
- **Solo consulta** tablas `zenin_read.*` y `zenin_ml.*`
- **NO escribe** en ninguna tabla
- **NO procesa** datos (sin ML, sin agregaciones)
- **NO se comunica** con servicios Python

---

## Schema PostgreSQL: Write vs Read

### Write-Intensive Tables (Python escribe)

```sql
-- Datos crudos particionados (millones de filas)
zenin_write.data_points
  ├── Particionado por mes
  ├── Escrito por: Ingesta API (BatchInserter)
  └── Backend: ❌ NO consulta (muy lento)

-- Predicciones particionadas
zenin_ml.predictions
  ├── Particionado por mes
  ├── Escrito por: Orchestrator (post-UTSAE)
  └── Backend: ⚠️ Solo queries recientes con LIMIT

-- Anomalías particionadas
zenin_ml.anomalies
  ├── Particionado por mes
  ├── Escrito por: Orchestrator
  └── Backend: ⚠️ Solo queries recientes con LIMIT
```

### Read-Optimized Tables (Backend consulta)

```sql
-- Snapshot de últimos valores (1 fila por serie)
zenin_read.series_latest
  ├── Escrito por: Orchestrator (on every data point)
  ├── Backend: ✅ Ultra-rápido (no partition scan)
  └── Uso: Dashboard real-time, gráficas

-- Perfiles estadísticos (1 fila por serie)
zenin_read.series_profiles
  ├── Escrito por: Orchestrator (hourly recomputation)
  ├── Backend: ✅ Rápido (no computation)
  └── Uso: Analytics, charts

-- Agregados pre-computados (time-bucketed)
zenin_read.series_aggregates
  ├── Escrito por: Orchestrator (periodic job)
  ├── Backend: ✅ Rápido (no aggregation)
  └── Uso: Charts históricos (1min, 5min, 1hour buckets)

-- Última predicción (1 fila por serie)
zenin_read.series_latest_prediction
  ├── Escrito por: Orchestrator (on prediction)
  ├── Backend: ✅ Ultra-rápido
  └── Uso: Dashboard predicciones

-- Anomalías activas (solo no-acknowledged)
zenin_read.active_anomalies
  ├── Escrito por: Orchestrator (on anomaly)
  ├── Backend: ✅ Rápido (solo activas)
  └── Uso: Alert dashboard

-- Health snapshot
zenin_read.system_health
  ├── Escrito por: Orchestrator (every cycle)
  ├── Backend: ✅ Ultra-rápido (1 row)
  └── Uso: Health dashboard

-- Materialized View (refreshed every 5min)
zenin_read.mv_dashboard_summary
  ├── Refrescado por: Orchestrator (REFRESH MATERIALIZED VIEW)
  ├── Backend: ✅ Ultra-rápido (pre-computed)
  └── Uso: Dashboard summary
```

---

## Arquitectura .NET: Clean Architecture para Read-Only

```
ZENIN/backend/
├── src/
│   ├── Zenin.Domain/
│   │   ├── Entities/
│   │   │   ├── Series.cs
│   │   │   ├── SeriesLatest.cs          # DTO para zenin_read.series_latest
│   │   │   ├── SeriesProfile.cs         # DTO para zenin_read.series_profiles
│   │   │   ├── SeriesAggregate.cs       # DTO para zenin_read.series_aggregates
│   │   │   ├── LatestPrediction.cs      # DTO para zenin_read.series_latest_prediction
│   │   │   ├── ActiveAnomaly.cs         # DTO para zenin_read.active_anomalies
│   │   │   └── SystemHealth.cs          # DTO para zenin_read.system_health
│   │   └── ValueObjects/
│   │       ├── TenantId.cs
│   │       └── SeriesId.cs
│   │
│   ├── Zenin.Application/
│   │   ├── Interfaces/
│   │   │   ├── ISeriesQueryService.cs   # Read-only queries
│   │   │   ├── IPredictionQueryService.cs
│   │   │   ├── IAnomalyQueryService.cs
│   │   │   └── IHealthQueryService.cs
│   │   │
│   │   ├── DTOs/
│   │   │   ├── DashboardSummaryDto.cs
│   │   │   ├── SeriesDetailDto.cs
│   │   │   ├── ChartDataDto.cs
│   │   │   └── HealthStatusDto.cs
│   │   │
│   │   └── UseCases/
│   │       ├── GetDashboardSummary/
│   │       │   ├── GetDashboardSummaryQuery.cs
│   │       │   └── GetDashboardSummaryHandler.cs
│   │       ├── GetSeriesDetail/
│   │       ├── GetChartData/
│   │       └── GetHealthStatus/
│   │
│   ├── Zenin.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── ZeninDbContext.cs        # EF Core DbContext (Read-Only)
│   │   │   ├── Configurations/
│   │   │   │   ├── SeriesLatestConfiguration.cs
│   │   │   │   ├── SeriesProfileConfiguration.cs
│   │   │   │   └── ...
│   │   │   └── Repositories/            # Read-only repositories
│   │   │       ├── SeriesQueryRepository.cs
│   │   │       ├── PredictionQueryRepository.cs
│   │   │       └── AnomalyQueryRepository.cs
│   │   │
│   │   └── Services/
│   │       ├── SeriesQueryService.cs
│   │       ├── PredictionQueryService.cs
│   │       └── HealthQueryService.cs
│   │
│   └── Zenin.API/
│       ├── Controllers/
│       │   ├── DashboardController.cs   # GET endpoints only
│       │   ├── SeriesController.cs      # GET endpoints only
│       │   ├── PredictionsController.cs # GET endpoints only
│       │   ├── AnomaliesController.cs   # GET endpoints only
│       │   └── HealthController.cs      # GET endpoints only
│       │
│       └── Program.cs
```

---

## Ejemplo: Backend .NET Read-Only

### Domain Entity (DTO)

```csharp
// Zenin.Domain/Entities/SeriesLatest.cs
namespace Zenin.Domain.Entities;

/// <summary>
/// DTO para zenin_read.series_latest (snapshot de último valor)
/// </summary>
public class SeriesLatest
{
    public Guid SeriesId { get; set; }
    public Guid TenantId { get; set; }
    
    public decimal LatestValue { get; set; }
    public DateTime LatestTimestamp { get; set; }
    
    public decimal? PreviousValue { get; set; }
    public DateTime? PreviousTimestamp { get; set; }
    
    public decimal? Delta { get; set; }
    public decimal? DeltaPercentage { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation
    public Series Series { get; set; }
}
```

### Application Query Service

```csharp
// Zenin.Application/Interfaces/ISeriesQueryService.cs
namespace Zenin.Application.Interfaces;

public interface ISeriesQueryService
{
    /// <summary>
    /// Obtiene últimos valores de todas las series activas del tenant
    /// </summary>
    Task<List<SeriesLatest>> GetLatestValuesAsync(Guid tenantId);
    
    /// <summary>
    /// Obtiene perfil estadístico de una serie
    /// </summary>
    Task<SeriesProfile> GetProfileAsync(Guid seriesId);
    
    /// <summary>
    /// Obtiene datos agregados para gráfica (pre-computados)
    /// </summary>
    Task<List<SeriesAggregate>> GetChartDataAsync(
        Guid seriesId, 
        DateTime from, 
        DateTime to, 
        TimeSpan bucketSize);
}
```

### Infrastructure Implementation

```csharp
// Zenin.Infrastructure/Services/SeriesQueryService.cs
namespace Zenin.Infrastructure.Services;

public class SeriesQueryService : ISeriesQueryService
{
    private readonly ZeninDbContext _context;
    
    public SeriesQueryService(ZeninDbContext context)
    {
        _context = context;
    }
    
    public async Task<List<SeriesLatest>> GetLatestValuesAsync(Guid tenantId)
    {
        // Query optimizada: zenin_read.series_latest (1 fila por serie)
        // NO query a zenin_write.data_points (millones de filas)
        return await _context.SeriesLatest
            .Where(sl => sl.TenantId == tenantId)
            .Include(sl => sl.Series)
            .OrderByDescending(sl => sl.LatestTimestamp)
            .ToListAsync();
    }
    
    public async Task<SeriesProfile> GetProfileAsync(Guid seriesId)
    {
        // Query optimizada: zenin_read.series_profiles (1 fila)
        // NO compute statistics (ya pre-computado por Orchestrator)
        return await _context.SeriesProfiles
            .FirstOrDefaultAsync(sp => sp.SeriesId == seriesId);
    }
    
    public async Task<List<SeriesAggregate>> GetChartDataAsync(
        Guid seriesId, 
        DateTime from, 
        DateTime to, 
        TimeSpan bucketSize)
    {
        // Query optimizada: zenin_read.series_aggregates (pre-computados)
        // NO aggregate raw data_points (muy lento)
        return await _context.SeriesAggregates
            .Where(sa => sa.SeriesId == seriesId)
            .Where(sa => sa.BucketStart >= from && sa.BucketEnd <= to)
            .Where(sa => sa.BucketSize == bucketSize)
            .OrderBy(sa => sa.BucketStart)
            .ToListAsync();
    }
}
```

### API Controller (Read-Only)

```csharp
// Zenin.API/Controllers/DashboardController.cs
namespace Zenin.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ISeriesQueryService _seriesQuery;
    private readonly IPredictionQueryService _predictionQuery;
    private readonly IAnomalyQueryService _anomalyQuery;
    private readonly IHealthQueryService _healthQuery;
    
    public DashboardController(
        ISeriesQueryService seriesQuery,
        IPredictionQueryService predictionQuery,
        IAnomalyQueryService anomalyQuery,
        IHealthQueryService healthQuery)
    {
        _seriesQuery = seriesQuery;
        _predictionQuery = predictionQuery;
        _anomalyQuery = anomalyQuery;
        _healthQuery = healthQuery;
    }
    
    /// <summary>
    /// GET /api/dashboard/summary
    /// Ultra-rápido: consulta materialized view
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        var tenantId = GetCurrentTenantId();
        
        // Query a zenin_read.mv_dashboard_summary (materialized view)
        var summary = await _context.DashboardSummary
            .FirstOrDefaultAsync(ds => ds.TenantId == tenantId);
        
        return Ok(summary);
    }
    
    /// <summary>
    /// GET /api/dashboard/latest-values
    /// Ultra-rápido: consulta series_latest (1 fila por serie)
    /// </summary>
    [HttpGet("latest-values")]
    public async Task<ActionResult<List<SeriesLatest>>> GetLatestValues()
    {
        var tenantId = GetCurrentTenantId();
        var latest = await _seriesQuery.GetLatestValuesAsync(tenantId);
        return Ok(latest);
    }
    
    /// <summary>
    /// GET /api/dashboard/active-anomalies
    /// Rápido: consulta active_anomalies (solo no-acknowledged)
    /// </summary>
    [HttpGet("active-anomalies")]
    public async Task<ActionResult<List<ActiveAnomaly>>> GetActiveAnomalies()
    {
        var tenantId = GetCurrentTenantId();
        var anomalies = await _anomalyQuery.GetActiveAnomaliesAsync(tenantId);
        return Ok(anomalies);
    }
    
    /// <summary>
    /// GET /api/dashboard/health
    /// Ultra-rápido: consulta system_health (1 fila)
    /// </summary>
    [HttpGet("health")]
    public async Task<ActionResult<SystemHealth>> GetHealth()
    {
        var tenantId = GetCurrentTenantId();
        var health = await _healthQuery.GetLatestHealthAsync(tenantId);
        return Ok(health);
    }
}
```

### EF Core DbContext (Read-Only)

```csharp
// Zenin.Infrastructure/Persistence/ZeninDbContext.cs
namespace Zenin.Infrastructure.Persistence;

public class ZeninDbContext : DbContext
{
    public ZeninDbContext(DbContextOptions<ZeninDbContext> options)
        : base(options)
    {
        // Read-only: no change tracking
        ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        ChangeTracker.AutoDetectChangesEnabled = false;
    }
    
    // Core
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Series> Series { get; set; }
    
    // Read-optimized (zenin_read.*)
    public DbSet<SeriesLatest> SeriesLatest { get; set; }
    public DbSet<SeriesProfile> SeriesProfiles { get; set; }
    public DbSet<SeriesAggregate> SeriesAggregates { get; set; }
    public DbSet<LatestPrediction> LatestPredictions { get; set; }
    public DbSet<ActiveAnomaly> ActiveAnomalies { get; set; }
    public DbSet<SystemHealth> SystemHealth { get; set; }
    public DbSet<DashboardSummary> DashboardSummary { get; set; }
    
    // ML (zenin_ml.*)
    public DbSet<Model> Models { get; set; }
    public DbSet<Prediction> Predictions { get; set; }  // Solo queries recientes
    public DbSet<Anomaly> Anomalies { get; set; }       // Solo queries recientes
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Map to correct schemas
        modelBuilder.Entity<Tenant>().ToTable("tenants", "zenin_core");
        modelBuilder.Entity<Series>().ToTable("series", "zenin_core");
        
        modelBuilder.Entity<SeriesLatest>().ToTable("series_latest", "zenin_read");
        modelBuilder.Entity<SeriesProfile>().ToTable("series_profiles", "zenin_read");
        modelBuilder.Entity<SeriesAggregate>().ToTable("series_aggregates", "zenin_read");
        modelBuilder.Entity<LatestPrediction>().ToTable("series_latest_prediction", "zenin_read");
        modelBuilder.Entity<ActiveAnomaly>().ToTable("active_anomalies", "zenin_read");
        modelBuilder.Entity<SystemHealth>().ToTable("system_health", "zenin_read");
        
        // Materialized view
        modelBuilder.Entity<DashboardSummary>()
            .ToTable("mv_dashboard_summary", "zenin_read")
            .HasNoKey();  // Materialized view, no PK
        
        modelBuilder.Entity<Model>().ToTable("models", "zenin_ml");
        modelBuilder.Entity<Prediction>().ToTable("predictions", "zenin_ml");
        modelBuilder.Entity<Anomaly>().ToTable("anomalies", "zenin_ml");
        
        // Apply configurations
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ZeninDbContext).Assembly);
    }
}
```

---

## Orchestrator: Escritura en Snapshots

### Python Orchestrator (Actualiza Snapshots)

```python
# iot_worker/decision_orchestrator/infrastructure/snapshot_writer.py
from typing import Optional
import psycopg2
from psycopg2.extras import execute_values

class SnapshotWriter:
    """
    Escribe snapshots optimizados para Backend .NET.
    
    Actualiza:
    - zenin_read.series_latest (on every data point)
    - zenin_read.series_profiles (hourly)
    - zenin_read.series_aggregates (periodic)
    - zenin_read.series_latest_prediction (on prediction)
    - zenin_read.active_anomalies (on anomaly)
    - zenin_read.system_health (every cycle)
    """
    
    def __init__(self, connection_string: str):
        self.conn_str = connection_string
    
    def update_series_latest(
        self, 
        series_id: str, 
        tenant_id: str,
        latest_value: float,
        latest_timestamp: datetime,
        previous_value: Optional[float] = None,
        previous_timestamp: Optional[datetime] = None
    ):
        """
        Actualiza zenin_read.series_latest (1 fila por serie).
        Backend consulta esto para real-time displays.
        """
        conn = psycopg2.connect(self.conn_str)
        cursor = conn.cursor()
        
        delta = None
        delta_percentage = None
        if previous_value is not None:
            delta = latest_value - previous_value
            if previous_value != 0:
                delta_percentage = (delta / abs(previous_value)) * 100
        
        sql = """
            INSERT INTO zenin_read.series_latest 
            (series_id, tenant_id, latest_value, latest_timestamp, 
             previous_value, previous_timestamp, delta, delta_percentage, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (series_id) DO UPDATE
            SET latest_value = EXCLUDED.latest_value,
                latest_timestamp = EXCLUDED.latest_timestamp,
                previous_value = EXCLUDED.previous_value,
                previous_timestamp = EXCLUDED.previous_timestamp,
                delta = EXCLUDED.delta,
                delta_percentage = EXCLUDED.delta_percentage,
                updated_at = NOW()
        """
        
        cursor.execute(sql, (
            series_id, tenant_id, latest_value, latest_timestamp,
            previous_value, previous_timestamp, delta, delta_percentage
        ))
        
        conn.commit()
        conn.close()
    
    def update_series_profile(
        self,
        series_id: str,
        tenant_id: str,
        structural_analysis: StructuralAnalysis  # From UTSAE
    ):
        """
        Actualiza zenin_read.series_profiles (1 fila por serie).
        Backend consulta esto para analytics.
        """
        conn = psycopg2.connect(self.conn_str)
        cursor = conn.cursor()
        
        sql = """
            INSERT INTO zenin_read.series_profiles 
            (series_id, tenant_id, mean, std_dev, min_value, max_value,
             volatility_level, stationarity_hint, regime, trend_strength,
             sample_size, last_computed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (series_id) DO UPDATE
            SET mean = EXCLUDED.mean,
                std_dev = EXCLUDED.std_dev,
                min_value = EXCLUDED.min_value,
                max_value = EXCLUDED.max_value,
                volatility_level = EXCLUDED.volatility_level,
                stationarity_hint = EXCLUDED.stationarity_hint,
                regime = EXCLUDED.regime,
                trend_strength = EXCLUDED.trend_strength,
                sample_size = EXCLUDED.sample_size,
                last_computed_at = NOW()
        """
        
        cursor.execute(sql, (
            series_id, tenant_id,
            structural_analysis.mean,
            structural_analysis.std,
            # min/max from window
            structural_analysis.volatility_level,
            structural_analysis.stationarity_hint,
            structural_analysis.regime.value,
            structural_analysis.trend_strength,
            structural_analysis.n_points
        ))
        
        conn.commit()
        conn.close()
    
    def update_latest_prediction(
        self,
        series_id: str,
        tenant_id: str,
        prediction: Prediction  # From UTSAE
    ):
        """
        Actualiza zenin_read.series_latest_prediction (1 fila por serie).
        Backend consulta esto para dashboard predictions.
        """
        conn = psycopg2.connect(self.conn_str)
        cursor = conn.cursor()
        
        sql = """
            INSERT INTO zenin_read.series_latest_prediction 
            (series_id, tenant_id, model_id, predicted_value, confidence_score,
             confidence_level, trend, is_anomaly, anomaly_score, risk_level,
             predicted_at, target_timestamp, explanation_text, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (series_id) DO UPDATE
            SET predicted_value = EXCLUDED.predicted_value,
                confidence_score = EXCLUDED.confidence_score,
                confidence_level = EXCLUDED.confidence_level,
                trend = EXCLUDED.trend,
                is_anomaly = EXCLUDED.is_anomaly,
                anomaly_score = EXCLUDED.anomaly_score,
                risk_level = EXCLUDED.risk_level,
                predicted_at = EXCLUDED.predicted_at,
                target_timestamp = EXCLUDED.target_timestamp,
                explanation_text = EXCLUDED.explanation_text,
                updated_at = NOW()
        """
        
        cursor.execute(sql, (
            series_id, tenant_id, None,  # model_id
            prediction.predicted_value,
            prediction.confidence_score,
            prediction.confidence_level.value,
            prediction.trend,
            False,  # is_anomaly
            None,   # anomaly_score
            'NONE', # risk_level
            datetime.utcnow(),
            datetime.utcnow() + timedelta(minutes=prediction.horizon_steps),
            # explanation from metadata
            ""
        ))
        
        conn.commit()
        conn.close()
    
    def refresh_materialized_view(self):
        """
        Refresca zenin_read.mv_dashboard_summary.
        Backend consulta esto para dashboard summary.
        """
        conn = psycopg2.connect(self.conn_str)
        cursor = conn.cursor()
        
        cursor.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY zenin_read.mv_dashboard_summary")
        
        conn.commit()
        conn.close()
```

---

## Performance Comparison

### ❌ Mal: Backend consulta tablas crudas

```csharp
// LENTO: Scan de particiones (millones de filas)
var latestValues = await _context.DataPoints
    .Where(dp => dp.TenantId == tenantId)
    .GroupBy(dp => dp.SeriesId)
    .Select(g => new {
        SeriesId = g.Key,
        LatestValue = g.OrderByDescending(dp => dp.Timestamp).First().Value,
        LatestTimestamp = g.Max(dp => dp.Timestamp)
    })
    .ToListAsync();

// Latency: ~2-5 segundos (inaceptable)
```

### ✅ Bien: Backend consulta snapshots

```csharp
// RÁPIDO: Query a series_latest (1 fila por serie)
var latestValues = await _context.SeriesLatest
    .Where(sl => sl.TenantId == tenantId)
    .ToListAsync();

// Latency: ~10-50ms (excelente)
```

---

## Ventajas de Esta Arquitectura

### ✅ Separación Clara
- **Python:** Procesamiento pesado (ML, agregaciones)
- **.NET:** Solo lectura (ultra-rápido)

### ✅ Performance Óptimo
- Backend NO escanea particiones
- Backend NO computa agregaciones
- Backend NO ejecuta ML
- Todo pre-computado por Orchestrator

### ✅ Escalabilidad
- Python workers escalan horizontalmente
- Backend escala horizontalmente (stateless)
- PostgreSQL read replicas para queries

### ✅ Mantenibilidad
- Backend simple (solo queries)
- Lógica compleja en Python (donde debe estar)
- Contratos claros (schemas PostgreSQL)

---

## Próximos Pasos

1. **Ejecutar schema:** `psql -f schema_async_pipeline.sql`
2. **Implementar SnapshotWriter** en Orchestrator Python
3. **Implementar Backend .NET** (read-only queries)
4. **Configurar refresh job** para materialized views
5. **Load testing** para validar performance

---

**Conclusión:** Backend .NET es **ultra-rápido** porque solo lee snapshots pre-computados. El trabajo pesado lo hace el pipeline Python asincrónico.
