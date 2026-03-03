# ZENIN - Adapter Layer Architecture
## Migración Incremental Sin Downtime

**Principio:** El pipeline actual (ingest → broker → workers → UTSAE) **NO SE TOCA**.

---

## 1. Arquitectura Actual (Intacta)

```
┌─────────────────────────────────────────────────────────────┐
│              PIPELINE ACTUAL (NO MODIFICAR)                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Ingest API   │─────▶│ Redis Queue  │─────▶│   Workers    │
│ (FastAPI)    │      │   (Broker)   │      │  (Celery)    │
└──────────────┘      └──────────────┘      └──────┬───────┘
                                                    │
                                                    ▼
                                            ┌──────────────┐
                                            │    UTSAE     │
                                            │  (ML Core)   │
                                            └──────┬───────┘
                                                    │
                                                    ▼
                                            ┌──────────────┐
                                            │ SQL Server   │
                                            │ (iot_script) │
                                            └──────────────┘

Contratos actuales:
- POST /ingest/readings
- Celery tasks: process_sensor_reading
- UTSAE: predict(), detect_anomaly()
- SQL Server: dbo.sensor_readings, dbo.predictions
```

**✅ Este flujo NO cambia. Sigue funcionando exactamente igual.**

---

## 2. Nueva Arquitectura: Adapter Layer (Paralela)

```
┌─────────────────────────────────────────────────────────────┐
│                    ADAPTER LAYER (NUEVO)                     │
│                  Bridge sin tocar core                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Ingest API   │─────▶│ Redis Queue  │─────▶│   Workers    │
│ (FastAPI)    │      │   (Broker)   │      │  (Celery)    │
└──────┬───────┘      └──────────────┘      └──────┬───────┘
       │                                            │
       │ ┌──────────────────────────────────────┐  │
       └▶│   StorageAdapter (NEW)               │◀─┘
         │   - Dual Write Strategy              │
         │   - Feature Flags                    │
         │   - Tenant Resolution                │
         └──────┬───────────────────┬───────────┘
                │                   │
                ▼                   ▼
        ┌──────────────┐    ┌──────────────┐
        │ SQL Server   │    │ PostgreSQL   │
        │  (Legacy)    │    │ (Multi-tenant)│
        └──────────────┘    └──────────────┘
```

**Clave:** El adapter se inserta **sin modificar** el código existente de workers/UTSAE.

---

## 3. Componentes del Adapter Layer

### 3.1 StorageAdapter (Abstracción)

```python
# infrastructure/adapters/storage_adapter.py
from abc import ABC, abstractmethod
from typing import Optional
from domain.entities import SensorReading, Prediction, AnomalyResult

class StorageAdapter(ABC):
    """Abstracción para persistencia multi-backend"""
    
    @abstractmethod
    async def save_reading(self, reading: SensorReading) -> None:
        """Guardar lectura de sensor"""
        pass
    
    @abstractmethod
    async def save_prediction(self, prediction: Prediction) -> None:
        """Guardar predicción"""
        pass
    
    @abstractmethod
    async def save_anomaly(self, anomaly: AnomalyResult) -> None:
        """Guardar anomalía"""
        pass
    
    @abstractmethod
    async def get_latest_readings(
        self, 
        sensor_id: str, 
        limit: int = 100
    ) -> list[SensorReading]:
        """Obtener últimas lecturas"""
        pass
```

### 3.2 DualWriteAdapter (Implementación)

```python
# infrastructure/adapters/dual_write_adapter.py
import asyncio
from typing import Optional
from .storage_adapter import StorageAdapter
from .sqlserver_adapter import SqlServerAdapter
from .postgresql_adapter import PostgreSQLAdapter
from ..feature_flags import FeatureFlags

class DualWriteAdapter(StorageAdapter):
    """
    Escribe en ambos backends (SQL Server + PostgreSQL).
    
    Estrategia:
    1. Escribe primero en SQL Server (legacy, source of truth)
    2. Escribe en PostgreSQL (nuevo, async)
    3. Si PostgreSQL falla, solo loguea (no bloquea)
    """
    
    def __init__(
        self,
        sqlserver: SqlServerAdapter,
        postgresql: PostgreSQLAdapter,
        feature_flags: FeatureFlags
    ):
        self.sqlserver = sqlserver
        self.postgresql = postgresql
        self.flags = feature_flags
    
    async def save_reading(self, reading: SensorReading) -> None:
        # 1. SQL Server (blocking, critical path)
        await self.sqlserver.save_reading(reading)
        
        # 2. PostgreSQL (non-blocking, best effort)
        if self.flags.is_enabled("postgresql_dual_write"):
            try:
                await asyncio.create_task(
                    self.postgresql.save_reading(reading)
                )
            except Exception as e:
                # Log pero NO falla
                logger.warning(f"PostgreSQL write failed: {e}")
    
    async def save_prediction(self, prediction: Prediction) -> None:
        # Mismo patrón: SQL Server primero, PostgreSQL async
        await self.sqlserver.save_prediction(prediction)
        
        if self.flags.is_enabled("postgresql_dual_write"):
            try:
                await asyncio.create_task(
                    self.postgresql.save_prediction(prediction)
                )
            except Exception as e:
                logger.warning(f"PostgreSQL write failed: {e}")
    
    async def get_latest_readings(
        self, 
        sensor_id: str, 
        limit: int = 100
    ) -> list[SensorReading]:
        # Leer desde backend activo según feature flag
        if self.flags.is_enabled("postgresql_read"):
            return await self.postgresql.get_latest_readings(sensor_id, limit)
        else:
            return await self.sqlserver.get_latest_readings(sensor_id, limit)
```

### 3.3 PostgreSQLAdapter (Nuevo Backend)

```python
# infrastructure/adapters/postgresql_adapter.py
from .storage_adapter import StorageAdapter
from sqlalchemy.ext.asyncio import AsyncSession
from domain.entities import SensorReading, Prediction

class PostgreSQLAdapter(StorageAdapter):
    """Adapter para PostgreSQL multi-tenant"""
    
    def __init__(self, session: AsyncSession, tenant_resolver):
        self.session = session
        self.tenant_resolver = tenant_resolver
    
    async def save_reading(self, reading: SensorReading) -> None:
        tenant_id = await self.tenant_resolver.get_current_tenant()
        
        # Mapeo: sensor_id → series_id
        series_id = await self._resolve_series_id(reading.sensor_id)
        
        # INSERT en zenin_ts.data_points
        stmt = """
            INSERT INTO zenin_ts.data_points 
            (tenant_id, series_id, timestamp, value, metadata)
            VALUES (:tenant_id, :series_id, :timestamp, :value, :metadata)
        """
        
        await self.session.execute(stmt, {
            "tenant_id": tenant_id,
            "series_id": series_id,
            "timestamp": reading.timestamp,
            "value": reading.value,
            "metadata": reading.to_dict()
        })
        
        await self.session.commit()
    
    async def _resolve_series_id(self, sensor_id: str) -> str:
        """
        Mapea sensor_id (SQL Server) → series_id (PostgreSQL).
        
        Usa tabla de mapeo:
        zenin_core.legacy_sensor_mapping (sensor_id, series_id)
        """
        stmt = """
            SELECT series_id 
            FROM zenin_core.legacy_sensor_mapping 
            WHERE sensor_id = :sensor_id
        """
        
        result = await self.session.execute(stmt, {"sensor_id": sensor_id})
        row = result.fetchone()
        
        if row:
            return row[0]
        else:
            # Auto-crear serie si no existe
            return await self._create_series_from_sensor(sensor_id)
```

### 3.4 FeatureFlags (Control de Migración)

```python
# infrastructure/feature_flags.py
from typing import Dict
import redis

class FeatureFlags:
    """
    Feature flags para controlar migración incremental.
    
    Flags:
    - postgresql_dual_write: Escribir en PostgreSQL (default: False)
    - postgresql_read: Leer desde PostgreSQL (default: False)
    - tenant_isolation: Activar multi-tenancy (default: False)
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.cache: Dict[str, bool] = {}
    
    def is_enabled(self, flag_name: str) -> bool:
        # Cache local (TTL 60s)
        if flag_name in self.cache:
            return self.cache[flag_name]
        
        # Leer desde Redis
        value = self.redis.get(f"feature_flag:{flag_name}")
        enabled = value == b"true" if value else False
        
        self.cache[flag_name] = enabled
        return enabled
    
    def enable(self, flag_name: str) -> None:
        """Activar feature flag (admin endpoint)"""
        self.redis.set(f"feature_flag:{flag_name}", "true")
        self.cache[flag_name] = True
    
    def disable(self, flag_name: str) -> None:
        """Desactivar feature flag"""
        self.redis.set(f"feature_flag:{flag_name}", "false")
        self.cache[flag_name] = False
```

---

## 4. Integración con Pipeline Actual

### 4.1 Modificación Mínima en Workers

```python
# workers/prediction_worker.py (ANTES)
from infrastructure.adapters.sqlserver_storage import SqlServerStorageAdapter

storage = SqlServerStorageAdapter(connection_string)

@celery_app.task
def process_prediction(sensor_id: str):
    prediction = utsae_engine.predict(sensor_id)
    storage.save_prediction(prediction)  # ← Solo SQL Server
```

```python
# workers/prediction_worker.py (DESPUÉS - cambio mínimo)
from infrastructure.adapters.dual_write_adapter import DualWriteAdapter
from infrastructure.adapters.sqlserver_adapter import SqlServerAdapter
from infrastructure.adapters.postgresql_adapter import PostgreSQLAdapter
from infrastructure.feature_flags import FeatureFlags

# Inyección de dependencias
sqlserver = SqlServerAdapter(sqlserver_conn)
postgresql = PostgreSQLAdapter(postgres_conn, tenant_resolver)
flags = FeatureFlags(redis_client)

storage = DualWriteAdapter(sqlserver, postgresql, flags)

@celery_app.task
def process_prediction(sensor_id: str):
    prediction = utsae_engine.predict(sensor_id)
    storage.save_prediction(prediction)  # ← Dual write automático
```

**Cambio:** Solo reemplazar `SqlServerStorageAdapter` por `DualWriteAdapter`.  
**UTSAE:** No se toca. Sigue devolviendo `Prediction` objects.

### 4.2 Modificación Mínima en Ingest API

```python
# ingest_api/main.py (ANTES)
@app.post("/ingest/readings")
async def ingest_reading(reading: SensorReadingDTO):
    # Validar
    validated = validate_reading(reading)
    
    # Guardar en SQL Server
    await sqlserver_storage.save_reading(validated)
    
    # Encolar para procesamiento
    celery_app.send_task("process_reading", args=[validated.id])
```

```python
# ingest_api/main.py (DESPUÉS - cambio mínimo)
@app.post("/ingest/readings")
async def ingest_reading(reading: SensorReadingDTO):
    # Validar (sin cambios)
    validated = validate_reading(reading)
    
    # Guardar con dual write
    await storage_adapter.save_reading(validated)  # ← DualWriteAdapter
    
    # Encolar (sin cambios)
    celery_app.send_task("process_reading", args=[validated.id])
```

**Cambio:** Solo usar `storage_adapter` (inyectado) en vez de `sqlserver_storage`.

---

## 5. Schema PostgreSQL Complementario

### 5.1 Tabla de Mapeo (Bridge)

```sql
-- Mapeo entre SQL Server y PostgreSQL
CREATE TABLE zenin_core.legacy_sensor_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES zenin_core.tenants(id),
    
    -- SQL Server IDs (legacy)
    sensor_id BIGINT NOT NULL UNIQUE,  -- dbo.sensors.id
    device_id BIGINT,                  -- dbo.devices.id
    
    -- PostgreSQL IDs (nuevo)
    series_id UUID NOT NULL REFERENCES zenin_ts.series(id),
    device_uuid UUID,                  -- zenin_iot.devices.id (futuro)
    
    -- Metadata
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    CONSTRAINT uq_sensor_series UNIQUE (sensor_id, series_id)
);

CREATE INDEX idx_legacy_mapping_sensor ON zenin_core.legacy_sensor_mapping(sensor_id);
CREATE INDEX idx_legacy_mapping_series ON zenin_core.legacy_sensor_mapping(series_id);
```

### 5.2 Vistas de Compatibilidad

```sql
-- Vista que emula dbo.sensor_readings para queries legacy
CREATE VIEW zenin_compat.v_sensor_readings AS
SELECT 
    dp.id::text AS id,
    lm.sensor_id,
    dp.value,
    dp.timestamp,
    dp.created_at
FROM zenin_ts.data_points dp
JOIN zenin_core.legacy_sensor_mapping lm ON dp.series_id = lm.series_id
WHERE lm.is_active = true;

-- Vista que emula dbo.predictions
CREATE VIEW zenin_compat.v_predictions AS
SELECT 
    p.id::text AS id,
    lm.sensor_id,
    p.predicted_value,
    p.confidence_score AS confidence,
    p.predicted_at,
    p.trend,
    p.is_anomaly,
    p.anomaly_score
FROM zenin_ml.predictions p
JOIN zenin_core.legacy_sensor_mapping lm ON p.series_id = lm.series_id;
```

---

## 6. Estrategia de Migración Incremental (Zero Downtime)

### Fase 0: Preparación (Semana 1)
```bash
# 1. Crear schema PostgreSQL
psql -f backend/database/schema.sql

# 2. Crear tenant default
psql -c "INSERT INTO zenin_core.tenants (name, slug) VALUES ('Default', 'default');"

# 3. Migrar mapeo de sensores
python scripts/migrate_sensor_mapping.py
# → Crea registros en legacy_sensor_mapping
# → Crea series en zenin_ts.series para cada sensor

# 4. Validar mapeo
psql -c "SELECT COUNT(*) FROM zenin_core.legacy_sensor_mapping;"
```

**Estado:** PostgreSQL listo, pero NO se usa. Sistema sigue 100% en SQL Server.

---

### Fase 1: Dual Write (Semana 2-3)

```bash
# 1. Deploy DualWriteAdapter (sin activar)
git checkout feature/adapter-layer
docker build -t workers:dual-write .
kubectl set image deployment/workers workers=workers:dual-write

# 2. Activar feature flag (gradual)
redis-cli SET feature_flag:postgresql_dual_write true

# 3. Monitorear logs
kubectl logs -f deployment/workers | grep "PostgreSQL write"

# 4. Validar consistencia
python scripts/validate_dual_write.py
# → Compara SQL Server vs PostgreSQL
# → Reporta discrepancias
```

**Estado:** Escribe en ambos backends. Lee desde SQL Server. **Rollback fácil** (disable flag).

---

### Fase 2: Validación Paralela (Semana 4-5)

```bash
# 1. Comparar datos históricos
python scripts/compare_databases.py --days 7
# → Sensor readings: 99.98% match
# → Predictions: 99.95% match
# → Anomalies: 100% match

# 2. Load test dual write
locust -f tests/load_test.py --users 1000 --spawn-rate 100
# → Latency p95: +5ms (aceptable)
# → Error rate: 0% (PostgreSQL failures no bloquean)

# 3. Validar particiones
psql -c "SELECT COUNT(*) FROM zenin_ts.data_points_2026_03;"
```

**Estado:** Confianza en PostgreSQL. Datos consistentes. Performance validada.

---

### Fase 3: Read Migration (Semana 6-7)

```bash
# 1. Activar lectura desde PostgreSQL (canary: 10%)
redis-cli SET feature_flag:postgresql_read_percentage 10

# 2. Monitorear latencia
# Dashboard Grafana: Query latency PostgreSQL vs SQL Server

# 3. Incrementar gradualmente
redis-cli SET feature_flag:postgresql_read_percentage 25
redis-cli SET feature_flag:postgresql_read_percentage 50
redis-cli SET feature_flag:postgresql_read_percentage 100

# 4. Validar cache hit rate
redis-cli INFO stats | grep keyspace_hits
# → Target: >85%
```

**Estado:** Lee desde PostgreSQL. Escribe en ambos. **Rollback:** cambiar flag a 0.

---

### Fase 4: SQL Server Deprecation (Semana 8-10)

```bash
# 1. Desactivar escritura en SQL Server (solo PostgreSQL)
redis-cli SET feature_flag:sqlserver_write false

# 2. Monitorear 2 semanas
# → Zero errors
# → Performance estable

# 3. Archivar datos SQL Server
python scripts/archive_sqlserver_data.py --older-than 90days
# → Exporta a Parquet
# → Sube a S3/Azure Blob

# 4. Mantener SQL Server read-only (6 meses)
# → Queries legacy pueden seguir leyendo
# → Eventual decomission
```

**Estado:** PostgreSQL es source of truth. SQL Server read-only (backup).

---

## 7. Rollback Strategy (Cada Fase)

### Rollback Fase 1 (Dual Write)
```bash
# Desactivar PostgreSQL writes
redis-cli SET feature_flag:postgresql_dual_write false

# Verificar
kubectl logs -f deployment/workers | grep "PostgreSQL write"
# → No debe aparecer
```

### Rollback Fase 3 (Read Migration)
```bash
# Volver a SQL Server
redis-cli SET feature_flag:postgresql_read_percentage 0

# Verificar latencia
curl http://api/metrics | grep query_latency_ms
```

### Rollback Completo (Emergencia)
```bash
# 1. Revertir deployment
kubectl rollout undo deployment/workers

# 2. Desactivar todos los flags
redis-cli DEL feature_flag:postgresql_dual_write
redis-cli DEL feature_flag:postgresql_read_percentage

# 3. Validar
# Sistema vuelve a 100% SQL Server
```

---

## 8. Monitoreo Durante Migración

### Métricas Clave

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram

# Dual write metrics
dual_write_success = Counter(
    'dual_write_success_total',
    'Successful dual writes',
    ['backend']  # sqlserver, postgresql
)

dual_write_latency = Histogram(
    'dual_write_latency_seconds',
    'Dual write latency',
    ['backend']
)

dual_write_errors = Counter(
    'dual_write_errors_total',
    'Dual write errors',
    ['backend', 'error_type']
)

# Data consistency metrics
data_consistency_check = Gauge(
    'data_consistency_percentage',
    'Data consistency between backends',
    ['entity_type']  # readings, predictions, anomalies
)
```

### Alertas

```yaml
# Prometheus alerts
groups:
- name: migration
  rules:
  - alert: PostgreSQLWriteFailureRate
    expr: rate(dual_write_errors_total{backend="postgresql"}[5m]) > 0.01
    for: 5m
    annotations:
      summary: "PostgreSQL write failures > 1%"
  
  - alert: DataInconsistency
    expr: data_consistency_percentage < 99.9
    for: 10m
    annotations:
      summary: "Data consistency < 99.9%"
  
  - alert: DualWriteLatencyHigh
    expr: histogram_quantile(0.95, dual_write_latency_seconds{backend="postgresql"}) > 0.1
    for: 5m
    annotations:
      summary: "PostgreSQL write p95 > 100ms"
```

---

## 9. Testing Strategy

### 9.1 Unit Tests (Adapter Layer)

```python
# tests/unit/test_dual_write_adapter.py
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_dual_write_success():
    """Ambos backends escriben correctamente"""
    sqlserver = AsyncMock()
    postgresql = AsyncMock()
    flags = MockFeatureFlags({"postgresql_dual_write": True})
    
    adapter = DualWriteAdapter(sqlserver, postgresql, flags)
    reading = SensorReading(sensor_id="123", value=25.5)
    
    await adapter.save_reading(reading)
    
    sqlserver.save_reading.assert_called_once()
    postgresql.save_reading.assert_called_once()

@pytest.mark.asyncio
async def test_postgresql_failure_does_not_block():
    """Fallo en PostgreSQL no bloquea SQL Server"""
    sqlserver = AsyncMock()
    postgresql = AsyncMock(side_effect=Exception("DB down"))
    flags = MockFeatureFlags({"postgresql_dual_write": True})
    
    adapter = DualWriteAdapter(sqlserver, postgresql, flags)
    reading = SensorReading(sensor_id="123", value=25.5)
    
    # No debe lanzar excepción
    await adapter.save_reading(reading)
    
    sqlserver.save_reading.assert_called_once()
```

### 9.2 Integration Tests

```python
# tests/integration/test_migration_flow.py
@pytest.mark.integration
async def test_end_to_end_dual_write():
    """Test completo: Ingest → Worker → Dual Write"""
    # 1. Ingest reading
    response = await client.post("/ingest/readings", json={
        "sensor_id": "123",
        "value": 25.5,
        "timestamp": "2026-03-03T15:00:00Z"
    })
    assert response.status_code == 200
    
    # 2. Wait for worker processing
    await asyncio.sleep(2)
    
    # 3. Verify SQL Server
    sqlserver_reading = await sqlserver_db.query(
        "SELECT * FROM sensor_readings WHERE sensor_id = 123"
    )
    assert sqlserver_reading is not None
    
    # 4. Verify PostgreSQL
    postgres_reading = await postgres_db.query(
        "SELECT * FROM zenin_ts.data_points WHERE series_id = ..."
    )
    assert postgres_reading is not None
    
    # 5. Verify consistency
    assert sqlserver_reading.value == postgres_reading.value
```

---

## 10. Checklist de Implementación

### Semana 1: Preparación
- [ ] Crear schema PostgreSQL (`schema.sql`)
- [ ] Crear tabla `legacy_sensor_mapping`
- [ ] Migrar mapeo de sensores existentes
- [ ] Crear tenant default
- [ ] Validar conectividad PostgreSQL

### Semana 2: Adapter Layer
- [ ] Implementar `StorageAdapter` (abstracción)
- [ ] Implementar `DualWriteAdapter`
- [ ] Implementar `PostgreSQLAdapter`
- [ ] Implementar `FeatureFlags`
- [ ] Unit tests (coverage >90%)

### Semana 3: Integración
- [ ] Modificar workers (inyectar `DualWriteAdapter`)
- [ ] Modificar ingest API (inyectar adapter)
- [ ] Configurar feature flags en Redis
- [ ] Integration tests
- [ ] Deploy a staging

### Semana 4-5: Dual Write
- [ ] Activar `postgresql_dual_write` en staging
- [ ] Validar consistencia (script automático)
- [ ] Load testing
- [ ] Deploy a producción (flag OFF)
- [ ] Activar flag gradualmente (10% → 100%)

### Semana 6-7: Read Migration
- [ ] Activar `postgresql_read_percentage` (canary)
- [ ] Monitorear latencia
- [ ] Incrementar gradualmente
- [ ] Validar cache hit rate
- [ ] 100% reads desde PostgreSQL

### Semana 8-10: Deprecation
- [ ] Desactivar escritura SQL Server
- [ ] Monitorear 2 semanas
- [ ] Archivar datos SQL Server
- [ ] Documentar proceso
- [ ] Celebrar 🎉

---

## 11. Ventajas de Esta Estrategia

### ✅ Zero Downtime
- Sistema actual sigue funcionando
- Rollback instantáneo (feature flags)
- No hay "big bang" deployment

### ✅ Validación Continua
- Dual write permite comparar datos
- Detectar inconsistencias temprano
- Confianza gradual en PostgreSQL

### ✅ Bajo Riesgo
- SQL Server sigue siendo source of truth (Fase 1-3)
- PostgreSQL falla → solo log, no bloquea
- Rollback en cada fase

### ✅ No Refactoring de Core
- UTSAE: sin cambios
- Workers: cambio mínimo (inyección)
- Ingest API: cambio mínimo (inyección)
- Contratos: sin cambios

### ✅ Multi-Tenancy Ready
- `tenant_id` en todas las tablas PostgreSQL
- Mapeo `sensor_id → series_id` por tenant
- Preparado para SaaS

---

## 12. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| PostgreSQL más lento que SQL Server | Media | Medio | Cache Redis, índices optimizados, load testing |
| Inconsistencia de datos | Baja | Alto | Script de validación continua, alertas |
| Dual write aumenta latencia | Media | Bajo | Async writes, monitoreo, timeout corto |
| Mapeo sensor→series incorrecto | Baja | Alto | Validación en migración, tests |
| Feature flags no funcionan | Baja | Crítico | Fallback a SQL Server, tests de flags |

---

## Conclusión

**Esta arquitectura permite:**

1. **No tocar UTSAE** ni pipeline actual
2. **Migración incremental** con rollback en cada fase
3. **Zero downtime** garantizado
4. **Validación continua** de consistencia
5. **Multi-tenancy** preparado para SaaS

**Próximo paso:** Implementar `StorageAdapter` y `DualWriteAdapter` (Semana 2).
