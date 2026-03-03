# ZENIN - Technical Architecture Audit & Production Readiness

**Fecha:** 2026-03-03  
**Versión:** 1.0  
**Auditor:** Arquitecto Principal  
**Sistema:** ZENIN (UTSAE + Multi-Tenant SaaS)

---

## Executive Summary

**Estado General:** ⚠️ **READY WITH CRITICAL FIXES REQUIRED**

ZENIN integra UTSAE (Universal Time Series Analysis Engine) con una plataforma SaaS multi-tenant. El núcleo ML es **robusto y maduro** (1207 tests passing), pero la capa de presentación y multi-tenancy requieren **hardening crítico** antes de producción.

**Nivel de Madurez:** **Intermediate-Advanced** (75/100)
- Core ML Engine: 90/100 ✅
- Backend API: 60/100 ⚠️
- Database Layer: 70/100 ⚠️
- Security: 65/100 ⚠️
- Scalability: 55/100 ❌

---

## 1. Arquitectura Actual

### 1.1 Stack Tecnológico

#### Backend
- **ASP.NET Core 8** Web API
- **Clean Architecture** (Domain, Application, Infrastructure, API)
- **PostgreSQL 16** (migración desde SQL Server)
- **Redis 7** (cache + pub/sub)
- **Weaviate** (cognitive memory - opcional)

#### ML Engine (UTSAE)
- **Python 3.13**
- **Arquitectura Cognitiva** (MetaCognitiveOrchestrator)
- **Engines:** Taylor, Statistical, Baseline, Cognitive
- **Detección:** Anomalías (voting), Patrones, Change Points
- **Explicabilidad:** Structured Explanation objects

#### Frontend
- **React 19 + Vite**
- **Tailwind CSS** (minimalist black/white)
- **Axios** (API client)
- **React Router** (SPA)

### 1.2 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                      ZENIN ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │ React SPA
│  (Port 5173) │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────┐
│  ASP.NET API │ Multi-tenant Gateway
│  (Port 8080) │ JWT Auth, Rate Limiting
└──────┬───────┘
       │
       ├─────────────────┬─────────────────┬──────────────────┐
       ▼                 ▼                 ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌──────────┐   ┌──────────────┐
│ PostgreSQL  │   │    Redis    │   │  UTSAE   │   │   Weaviate   │
│  (Port 5432)│   │ (Port 6379) │   │  Python  │   │ (Port 8080)  │
└─────────────┘   └─────────────┘   └──────────┘   └──────────────┘
  Time-series       Cache/Pub-Sub    ML Engine      Cognitive Mem
  Partitioned       Latest Values    Predictions    (Optional)
```

---

## 2. Análisis de Componentes

### 2.1 Backend API (ASP.NET Core 8)

#### ✅ Fortalezas
- Clean Architecture bien implementada
- Separación clara Domain/Application/Infrastructure
- MediatR + CQRS pattern
- FluentValidation
- Swagger/OpenAPI documentation
- Health checks configurados

#### ⚠️ Debilidades
- **CRÍTICO:** No hay multi-tenancy implementado en el código actual
- **CRÍTICO:** Falta middleware de tenant resolution
- **ALTO:** No hay rate limiting por tenant
- **MEDIO:** Falta circuit breaker para llamadas a UTSAE
- **MEDIO:** No hay retry policy configurado
- **BAJO:** Logs no estructurados (falta Serilog enrichers)

#### 🔧 Recomendaciones
1. Implementar `TenantResolutionMiddleware` (extraer tenant_id de JWT/header)
2. Agregar `ICurrentTenantService` inyectable
3. Configurar Polly para resilience (circuit breaker, retry, timeout)
4. Implementar rate limiting con AspNetCoreRateLimit
5. Agregar structured logging con Serilog enrichers

---

### 2.2 PostgreSQL Schema

#### ✅ Fortalezas
- **Excelente:** Particionamiento por mes en tablas de alto volumen
- **Excelente:** UUIDs como PKs (multi-tenant ready)
- **Excelente:** Índices optimizados para time-series
- **Bueno:** Row Level Security (RLS) configurado
- **Bueno:** Triggers para updated_at automático
- **Bueno:** Funciones de mantenimiento (create/drop partitions)

#### ⚠️ Debilidades
- **ALTO:** Falta estrategia de backup automático
- **ALTO:** No hay replicación configurada (single point of failure)
- **MEDIO:** Falta monitoring de query performance (pg_stat_statements)
- **MEDIO:** No hay índices parciales en todas las tablas necesarias
- **BAJO:** Falta VACUUM automático optimizado para time-series

#### 🔧 Recomendaciones
1. Configurar pgBackRest o WAL-G para backups continuos
2. Implementar streaming replication (1 master + 2 replicas)
3. Configurar pg_stat_statements + pgBadger para análisis
4. Agregar índices parciales: `WHERE deleted_at IS NULL`, `WHERE is_active = true`
5. Optimizar autovacuum para particiones time-series

---

### 2.3 UTSAE (ML Engine)

#### ✅ Fortalezas
- **Excelente:** 1207 tests passing, 0 regressions
- **Excelente:** Arquitectura cognitiva modular
- **Excelente:** Explicabilidad estructurada (Explanation objects)
- **Excelente:** Domain-driven design puro
- **Bueno:** Múltiples engines con voting/fusion
- **Bueno:** Detección temporal (velocity, acceleration)
- **Bueno:** Adaptive learning (plasticity tracking)

#### ⚠️ Debilidades
- **CRÍTICO:** No hay API REST expuesta (solo Python modules)
- **ALTO:** Falta containerización (Dockerfile)
- **ALTO:** No hay health check endpoint
- **MEDIO:** Falta queue system para procesamiento async
- **MEDIO:** No hay métricas expuestas (Prometheus)
- **BAJO:** Logs no estructurados

#### 🔧 Recomendaciones
1. **URGENTE:** Crear FastAPI wrapper para UTSAE
2. Dockerizar UTSAE con multi-stage build
3. Implementar Celery + Redis para async processing
4. Exponer métricas Prometheus (`/metrics`)
5. Agregar structlog para logging estructurado
6. Implementar gRPC para comunicación de baja latencia con ASP.NET

---

### 2.4 Redis

#### ✅ Fortalezas
- Estrategia de cache bien definida (ver REDIS_STRATEGY.md)
- Pub/Sub para eventos en tiempo real
- TTL configurados por tipo de dato

#### ⚠️ Debilidades
- **CRÍTICO:** No hay Redis Sentinel/Cluster configurado (SPOF)
- **ALTO:** Falta monitoring de hit rate
- **MEDIO:** No hay backup configurado (RDB/AOF)
- **MEDIO:** Falta ACL para usuarios con permisos limitados

#### 🔧 Recomendaciones
1. Configurar Redis Sentinel (3 nodos: 1 master + 2 replicas)
2. Implementar monitoring con Redis Exporter + Prometheus
3. Configurar AOF + RDB snapshots
4. Crear ACL users: `zenin_app` (read/write), `zenin_readonly`

---

### 2.5 Security (ISO 27001)

#### ✅ Fortalezas
- Audit logs implementados (zenin_audit.logs)
- Security headers middleware (CSP, X-Frame-Options, etc.)
- BCrypt password hashing
- JWT con refresh tokens
- Row Level Security en PostgreSQL

#### ⚠️ Debilidades
- **CRÍTICO:** JWT secret hardcoded en appsettings.json
- **CRÍTICO:** No hay secrets management (Azure Key Vault, HashiCorp Vault)
- **ALTO:** Falta 2FA (Two-Factor Authentication)
- **ALTO:** No hay IP whitelisting para admin endpoints
- **MEDIO:** Falta HTTPS enforcement (HSTS)
- **MEDIO:** No hay CAPTCHA en login/register
- **BAJO:** Falta session timeout configurable

#### 🔧 Recomendaciones
1. **URGENTE:** Migrar secrets a Azure Key Vault o HashiCorp Vault
2. Implementar TOTP-based 2FA (Google Authenticator)
3. Agregar IP whitelisting middleware para `/admin/*`
4. Configurar HSTS con `max-age=31536000; includeSubDomains; preload`
5. Integrar reCAPTCHA v3 en formularios públicos
6. Implementar session timeout: 15 min inactivity, 8 horas max

---

### 2.6 Observability

#### ✅ Fortalezas
- Health checks básicos (`/health`)
- Serilog configurado

#### ⚠️ Debilidades
- **CRÍTICO:** No hay APM (Application Performance Monitoring)
- **CRÍTICO:** No hay distributed tracing
- **ALTO:** Falta dashboard de métricas (Grafana)
- **ALTO:** No hay alerting configurado
- **MEDIO:** Logs no centralizados (ELK/Loki)

#### 🔧 Recomendaciones
1. Implementar OpenTelemetry + Jaeger para distributed tracing
2. Configurar Prometheus + Grafana para métricas
3. Agregar Application Insights o Datadog APM
4. Centralizar logs con Loki + Grafana
5. Configurar alertas: Latency p99 > 500ms, Error rate > 1%, Memory > 80%

---

## 3. Riesgos Críticos de Producción

### 🔴 CRÍTICO (Bloqueantes)

#### C-1: Single Points of Failure
**Impacto:** Sistema completo cae si falla un componente  
**Componentes:** PostgreSQL (sin réplica), Redis (sin Sentinel), UTSAE (sin HA)

**Mitigación:**
```yaml
PostgreSQL:
  - Master: 1 nodo (escritura)
  - Replicas: 2 nodos (lectura)
  - Failover: Automático con Patroni/Stolon

Redis:
  - Sentinel: 3 nodos (quorum 2)
  - Master: 1 nodo
  - Replicas: 2 nodos

UTSAE:
  - Kubernetes: 3 pods (HPA: min 3, max 10)
  - Load Balancer: NGINX/Traefik
```

#### C-2: No Multi-Tenancy Enforcement
**Impacto:** Tenant A puede acceder a datos de Tenant B  
**Riesgo:** Violación GDPR, pérdida de confianza, demandas

**Mitigación:**
```csharp
// Middleware
public class TenantResolutionMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        var tenantId = ExtractTenantId(context); // From JWT or header
        context.Items["TenantId"] = tenantId;
        await _next(context);
    }
}

// EF Core Query Filter
modelBuilder.Entity<Series>()
    .HasQueryFilter(s => s.TenantId == _currentTenant.Id);
```

#### C-3: Secrets Hardcoded
**Impacto:** Exposición de credenciales en Git, acceso no autorizado  
**Riesgo:** Compromiso total del sistema

**Mitigación:**
```bash
# Azure Key Vault
az keyvault secret set --vault-name zenin-vault --name JwtSecret --value "..."
az keyvault secret set --vault-name zenin-vault --name DbPassword --value "..."

# appsettings.json
{
  "KeyVault": {
    "Url": "https://zenin-vault.vault.azure.net/"
  }
}
```

#### C-4: No UTSAE API
**Impacto:** ASP.NET no puede invocar ML engine  
**Riesgo:** Sistema no funcional

**Mitigación:**
```python
# FastAPI wrapper para UTSAE
from fastapi import FastAPI
from utsae import MetaCognitiveOrchestrator

app = FastAPI()

@app.post("/predict")
async def predict(request: PredictionRequest):
    orchestrator = MetaCognitiveOrchestrator(...)
    result = orchestrator.predict(request.values, request.timestamps)
    return result.to_dict()
```

---

### 🟠 ALTO (Urgentes)

#### A-1: No Rate Limiting
**Impacto:** DDoS, abuso de API, costos elevados  
**Mitigación:** AspNetCoreRateLimit (100 req/min free, 1000 req/min pro)

#### A-2: No Circuit Breaker
**Impacto:** Cascading failures, timeouts, degradación total  
**Mitigación:** Polly circuit breaker (5 fallos → open 30s)

#### A-3: No Backup Automático
**Impacto:** Pérdida de datos en desastre  
**Mitigación:** pgBackRest (full daily, incremental hourly, WAL archiving)

#### A-4: No Monitoring
**Impacto:** Incidentes no detectados, SLA incumplido  
**Mitigación:** Prometheus + Grafana + AlertManager

---

### 🟡 MEDIO (Importantes)

#### M-1: No Distributed Tracing
**Impacto:** Debugging difícil, latencia no identificable  
**Mitigación:** OpenTelemetry + Jaeger

#### M-2: Logs No Centralizados
**Impacto:** Análisis manual, troubleshooting lento  
**Mitigación:** Loki + Grafana o ELK Stack

#### M-3: No 2FA
**Impacto:** Cuentas comprometidas por phishing  
**Mitigación:** TOTP (Google Authenticator)

---

## 4. Plan de Hardening (Pre-Producción)

### Fase 1: Fundamentos (Semana 1-2)

#### Sprint 1.1: Multi-Tenancy
- [ ] Implementar `TenantResolutionMiddleware`
- [ ] Agregar `ICurrentTenantService`
- [ ] Configurar EF Core query filters
- [ ] Tests de aislamiento de tenants (100% coverage)

#### Sprint 1.2: Secrets Management
- [ ] Migrar secrets a Azure Key Vault
- [ ] Configurar managed identity
- [ ] Actualizar CI/CD para secrets injection
- [ ] Rotar todas las credenciales

#### Sprint 1.3: UTSAE API
- [ ] Crear FastAPI wrapper
- [ ] Dockerizar UTSAE
- [ ] Implementar health check
- [ ] Tests de integración ASP.NET ↔ UTSAE

---

### Fase 2: Resilience (Semana 3-4)

#### Sprint 2.1: Database HA
- [ ] Configurar PostgreSQL streaming replication
- [ ] Implementar Patroni para failover automático
- [ ] Configurar pgBackRest
- [ ] Tests de failover

#### Sprint 2.2: Redis HA
- [ ] Configurar Redis Sentinel
- [ ] Implementar connection retry logic
- [ ] Tests de failover

#### Sprint 2.3: Circuit Breakers
- [ ] Configurar Polly policies
- [ ] Implementar fallback strategies
- [ ] Tests de degradación graceful

---

### Fase 3: Security (Semana 5-6)

#### Sprint 3.1: Authentication
- [ ] Implementar 2FA (TOTP)
- [ ] Agregar reCAPTCHA v3
- [ ] Configurar session timeout
- [ ] Penetration testing

#### Sprint 3.2: Authorization
- [ ] Implementar RBAC granular
- [ ] Agregar IP whitelisting
- [ ] Configurar CORS restrictivo
- [ ] Security audit

#### Sprint 3.3: Compliance
- [ ] Revisar ISO 27001 checklist
- [ ] Implementar GDPR data export
- [ ] Configurar audit log retention (7 años)
- [ ] Documentar políticas de seguridad

---

### Fase 4: Observability (Semana 7-8)

#### Sprint 4.1: Metrics
- [ ] Configurar Prometheus exporters
- [ ] Crear dashboards Grafana
- [ ] Configurar AlertManager
- [ ] SLO/SLA definitions

#### Sprint 4.2: Logging
- [ ] Centralizar logs con Loki
- [ ] Configurar structured logging
- [ ] Implementar log sampling (high volume)
- [ ] Crear queries de troubleshooting

#### Sprint 4.3: Tracing
- [ ] Implementar OpenTelemetry
- [ ] Configurar Jaeger
- [ ] Instrumentar endpoints críticos
- [ ] Performance profiling

---

## 5. Estrategia de Escalabilidad

### 5.1 Horizontal Scaling

#### API Layer
```yaml
Kubernetes:
  replicas: 3 (min) → 20 (max)
  HPA:
    cpu: 70%
    memory: 80%
    custom: requests_per_second > 1000
```

#### UTSAE
```yaml
Kubernetes:
  replicas: 3 (min) → 10 (max)
  HPA:
    cpu: 80%
    queue_depth: > 100 (Celery)
```

#### Database
```yaml
PostgreSQL:
  Read Replicas: 2 (min) → 5 (max)
  Connection Pooling: PgBouncer (1000 connections)
  Partitioning: Monthly (auto-create, auto-drop)
```

### 5.2 Vertical Scaling Limits

| Component | Min | Recommended | Max |
|-----------|-----|-------------|-----|
| API Pod | 512MB / 0.5 CPU | 2GB / 2 CPU | 8GB / 4 CPU |
| UTSAE Pod | 1GB / 1 CPU | 4GB / 2 CPU | 16GB / 8 CPU |
| PostgreSQL | 4GB / 2 CPU | 16GB / 8 CPU | 64GB / 32 CPU |
| Redis | 2GB / 1 CPU | 8GB / 2 CPU | 32GB / 4 CPU |

### 5.3 Data Retention

```sql
-- Partition retention: 13 months
-- Auto-drop partitions older than 13 months
SELECT zenin_core.drop_old_partitions(); -- Monthly cron

-- Archive to cold storage (S3/Azure Blob)
-- Partitions 13-24 months old → Parquet files
-- Partitions > 24 months → Delete
```

---

## 6. Performance Targets (SLA)

### API Endpoints
- **Latency p50:** < 100ms
- **Latency p95:** < 300ms
- **Latency p99:** < 500ms
- **Error Rate:** < 0.1%
- **Availability:** 99.9% (43 min downtime/month)

### ML Predictions (UTSAE)
- **Latency p50:** < 200ms
- **Latency p95:** < 500ms
- **Latency p99:** < 1000ms
- **Throughput:** > 100 predictions/sec

### Database
- **Query p95:** < 50ms
- **Connection Pool:** < 80% utilization
- **Replication Lag:** < 1 second

### Redis
- **Hit Rate:** > 85%
- **Latency p99:** < 5ms
- **Memory Usage:** < 80%

---

## 7. Deployment Strategy

### Blue-Green Deployment
```yaml
Production:
  Blue: v1.0.0 (current, 100% traffic)
  Green: v1.1.0 (new, 0% traffic)

Rollout:
  1. Deploy Green
  2. Smoke tests
  3. Route 10% traffic → Green
  4. Monitor 15 min
  5. Route 50% traffic → Green
  6. Monitor 15 min
  7. Route 100% traffic → Green
  8. Decommission Blue (keep 24h for rollback)
```

### Rollback Criteria
- Error rate > 1%
- Latency p99 > 1000ms
- Database deadlocks
- Memory leak detected
- Critical bug reported

---

## 8. Disaster Recovery

### RTO/RPO Targets
- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 5 minutes

### Backup Strategy
```yaml
PostgreSQL:
  Full Backup: Daily 02:00 UTC
  Incremental: Hourly
  WAL Archiving: Continuous (5 min RPO)
  Retention: 30 days

Redis:
  RDB Snapshot: Every 15 min
  AOF: appendfsync everysec
  Retention: 7 days

Application State:
  Docker Images: Immutable, tagged
  Configuration: Git + Terraform
  Secrets: Azure Key Vault (versioned)
```

### Recovery Procedures
1. **Database Failure:** Promote replica to master (Patroni auto-failover)
2. **API Failure:** Kubernetes restarts pod (liveness probe)
3. **Region Failure:** Failover to secondary region (manual, 1 hour RTO)

---

## 9. Cost Estimation (Monthly)

### Infrastructure (Azure/AWS)

| Component | Tier | Cost |
|-----------|------|------|
| **Compute** | | |
| API (3 pods) | Standard_D2s_v3 | $150 |
| UTSAE (3 pods) | Standard_D4s_v3 | $300 |
| **Database** | | |
| PostgreSQL (16GB) | General Purpose | $200 |
| Read Replicas (2x) | General Purpose | $400 |
| **Cache** | | |
| Redis (8GB) | Premium | $150 |
| **Storage** | | |
| PostgreSQL Storage (500GB) | Premium SSD | $100 |
| Backups (1TB) | Blob Storage | $20 |
| **Networking** | | |
| Load Balancer | Standard | $20 |
| Egress (1TB) | Data Transfer | $90 |
| **Monitoring** | | |
| Application Insights | Standard | $50 |
| **Total** | | **$1,480/month** |

### Scaling Costs (per 10k users)
- Compute: +$200/month
- Database: +$100/month
- Storage: +$50/month
- **Total:** +$350/month per 10k users

---

## 10. Checklist de Producción

### Pre-Launch (Mandatory)

#### Security
- [ ] Secrets en Key Vault (no hardcoded)
- [ ] HTTPS enforced (HSTS)
- [ ] JWT secret rotado
- [ ] 2FA implementado
- [ ] Rate limiting configurado
- [ ] CORS restrictivo
- [ ] Security headers (CSP, X-Frame-Options)
- [ ] Penetration testing completado

#### Resilience
- [ ] PostgreSQL replication (1 master + 2 replicas)
- [ ] Redis Sentinel (3 nodos)
- [ ] Circuit breakers configurados
- [ ] Health checks en todos los servicios
- [ ] Graceful shutdown implementado

#### Observability
- [ ] Prometheus + Grafana configurado
- [ ] Logs centralizados (Loki/ELK)
- [ ] Distributed tracing (Jaeger)
- [ ] Alertas configuradas (PagerDuty/Opsgenie)
- [ ] SLA/SLO definidos

#### Data
- [ ] Backups automáticos (pgBackRest)
- [ ] Disaster recovery plan documentado
- [ ] Data retention policy implementada
- [ ] GDPR compliance verificado

#### Performance
- [ ] Load testing (10x expected traffic)
- [ ] Latency targets validados
- [ ] Database query optimization
- [ ] Redis hit rate > 85%

---

## 11. Conclusión

### Estado Actual
ZENIN tiene un **núcleo ML excepcional** (UTSAE) pero requiere **hardening crítico** en infraestructura y seguridad antes de producción.

### Tiempo Estimado para Producción
- **Mínimo Viable:** 4 semanas (Fase 1-2)
- **Production Ready:** 8 semanas (Fase 1-4)
- **Enterprise Grade:** 12 semanas (+ optimizaciones)

### Prioridades Inmediatas
1. **Semana 1:** Multi-tenancy + Secrets Management
2. **Semana 2:** UTSAE API + Docker
3. **Semana 3:** Database HA + Backups
4. **Semana 4:** Monitoring + Alerting

### Riesgo de Lanzamiento Prematuro
**ALTO** - Sin las correcciones críticas (C-1 a C-4), el sistema es **vulnerable** a:
- Data breaches (multi-tenancy)
- Downtime prolongado (SPOF)
- Pérdida de datos (sin backups)
- Incidentes no detectados (sin monitoring)

### Recomendación Final
**NO LANZAR** hasta completar Fase 1 y Fase 2 (4 semanas mínimo).

---

**Aprobado por:** Arquitecto Principal  
**Fecha:** 2026-03-03  
**Próxima Revisión:** Post-Fase 2 (2026-03-31)
