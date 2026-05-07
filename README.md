# ZENIN

Plataforma SaaS de análisis de datos con ingesta asíncrona, ML y dashboards unificados.

**Stack:** ASP.NET Core 8 + React 19 + SQL Server + ML Service (Python)

---

## Arquitectura

### Flujo de ingesta (async, desacoplado)

```
Frontend (React)
  → POST /api/ingest/upload  →  .NET Backend (parse + clasificar)
                                    ↓
                            zenin_docs.analysis_results (status=pending)
                            zenin_docs.ingestion_queue
                                    ↓
                            ML Service poller (daemon thread)
                                    ↓
                            Text sub-analyzers (sentiment, urgency, readability, structural, pattern)
                                    ↓
                            TextCognitiveEngine (Perceive → Analyze → Remember → Reason → Explain)
                                    ↓
                            analysis_results (status=analyzed) + Explanation + Weaviate
                                    ↓
                            Frontend polling GET /api/ingest/analysis/{id}
```

**Principios clave:**
- .NET Backend **NO** ejecuta ML ni llama HTTP al ML Service durante ingesta
- ML Service es el **único** escritor de resultados ML y status updates
- Comunicación entre .NET y ML es **exclusivamente vía BD** (queue + results)
- Frontend comunica **solo** con .NET Backend
- Query (consultas semánticas) usa relay: .NET → ML HTTP `/ml/query`

### Backend (.NET 8)
- **Clean Architecture** (Domain → Application → Infrastructure → API)
- **SQL Server** (schemas: `zenin_core`, `zenin_ts`, `zenin_ml`, `zenin_docs`, `zenin_audit`)
- **EF Core** con mapeo explícito de columnas
- **JWT Authentication** con refresh tokens
- **ISO 27001** (audit logs, security headers)
- **MediatR** para CQRS

### Frontend (React 19)
- **Vite** build tool
- **Dashboard unificado** — consultas + upload + stats en una sola vista
- **Tailwind CSS** + diseño minimalista blanco y negro
- **Lucide React** para iconos
- **Polling** automático para resultados de análisis ML

---

## Estructura del proyecto

```
ZENIN/
├── backend/
│   ├── src/
│   │   ├── Zenin.Domain/              # Entidades, interfaces
│   │   │   └── Entities/
│   │   │       ├── AnalysisResult.cs   # Resultado de análisis ML
│   │   │       ├── Document.cs         # Documento subido
│   │   │       ├── Series.cs           # Serie temporal
│   │   │       └── ...
│   │   ├── Zenin.Application/         # Casos de uso (MediatR handlers)
│   │   │   ├── Features/
│   │   │   │   ├── Ingest/            # Upload + enqueue
│   │   │   │   ├── Query/             # Consultas → relay a ML Service
│   │   │   │   ├── Documents/         # CRUD documentos
│   │   │   │   └── Dashboard/         # Stats overview
│   │   │   └── Common/Interfaces/
│   │   │       ├── IIngestionQueueService.cs  # Escritura a cola
│   │   │       └── IMLSearchService.cs        # Relay búsqueda semántica
│   │   ├── Zenin.Infrastructure/      # EF Core, servicios externos
│   │   │   ├── Persistence/
│   │   │   │   └── ApplicationDbContext.cs
│   │   │   └── Services/
│   │   │       ├── IngestionQueueService.cs   # Raw SQL → ingestion_queue
│   │   │       └── MLSearchService.cs         # HTTP → ML /ml/semantic-search
│   │   └── Zenin.API/                 # Controllers, middleware
│   │       └── Controllers/
│   │           ├── IngestController.cs    # POST upload, GET analysis/{id}
│   │           ├── QueryController.cs     # POST /api/query
│   │           └── DashboardController.cs # GET /api/dashboard/overview
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx             # Sidebar + main content
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Vista unificada: consultar + upload + stats
│   │   │   ├── Upload.jsx             # Upload standalone (full page)
│   │   │   ├── Query.jsx              # Consultas standalone (full page)
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── ingestService.js       # upload + pollForResult
│   │   │   ├── queryService.js        # ask (POST /query)
│   │   │   └── dashboardService.js    # getOverview
│   │   └── App.jsx
│   ├── Dockerfile
│   └── nginx.conf
│
├── server/                    # Metrics Server (Node.js + LTTB downsampling)
│   ├── src/                   # Background metrics processor
│   ├── package.json
│   └── Dockerfile
│
└── scripts/
    ├── migrate_sensor_mapping.py
    └── validate_dual_write.py
```

---

## API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Registro de usuario |
| `POST` | `/api/auth/login` | Login → JWT + refresh token |

### Ingesta
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/ingest/upload` | Subir archivo (parse + enqueue async) |
| `GET`  | `/api/ingest/analysis/{id}` | Polling resultado ML (tenant-isolated) |

### Consultas
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/query` | Pregunta → relay a ML Service `/ml/query` |

### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/api/dashboard/overview` | Stats: series, anomalias, patrones, predicciones |

### Health
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/health` | Health check |

---

## Base de datos (SQL Server)

### Schemas

| Schema | Propósito |
|--------|-----------|
| `zenin_core` | Tenants, users |
| `zenin_ts` | Series temporales, data points |
| `zenin_ml` | Predictions, anomalies, patterns |
| `zenin_docs` | Documents, analysis_results, ingestion_queue |
| `zenin_audit` | Audit logs |

### Tablas clave de ingesta

- **`zenin_docs.analysis_results`** — Fila por archivo. .NET crea con `status=pending`, ML actualiza a `analyzed`.
- **`zenin_docs.ingestion_queue`** — Cola: .NET escribe, ML poller lee y procesa.

---

## Variables de entorno

### Backend

| Variable | Descripción | Default |
|----------|-------------|---------|
| `ConnectionStrings__DefaultConnection` | SQL Server connection string | (required) |
| `ConnectionStrings__Redis` | Redis connection | localhost:6379 |
| `Jwt__Secret` | JWT signing key | (required) |
| `Jwt__Issuer` | JWT issuer | ZeninAPI |
| `Jwt__Audience` | JWT audience | ZeninClient |
| `Jwt__ExpiryMinutes` | Token expiry | 60 |
| `MLService__BaseUrl` | URL del ML Service | http://localhost:8002 |

### Frontend

| Variable | Descripción | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:5000/api |

---

## Quick Start

### Prerrequisitos

- .NET 8 SDK
- Node.js 20+
- SQL Server (local o Docker, puerto 1434)
- Redis 7 (opcional, para cache)

### Backend

```bash
cd backend
cp .env.example .env
# Editar .env con credenciales SQL Server

# Ejecutar migraciones
# Ver database/migrations/zenin_db/

# Iniciar API
dotnet run --project src/Zenin.API
```

API en `http://localhost:5000` — Swagger en `http://localhost:5000/swagger`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env

npm run dev
```

Frontend en `http://localhost:5173`

### Build

```bash
# Backend
dotnet build src/Zenin.API/Zenin.API.csproj   # 0 warnings, 0 errors

# Frontend
cd frontend && npm run build
```

---

## Seguridad (ISO 27001)

| Control | Implementación |
|---------|----------------|
| **A.9 Access Control** | JWT + roles + refresh token rotation |
| **A.10 Cryptography** | BCrypt password hashing, HMAC-SHA256 JWT |
| **A.12 Operations** | Audit logging (zenin_audit), Serilog |
| **A.13 Communications** | CSP, X-Frame-Options, HSTS, CORS |
| **A.18 Compliance** | Soft delete, audit trail, IP tracking |

---

## Comunicación con otros servicios

| Servicio | Dirección | Detalle |
|----------|-----------|---------|
| **SQL Server** | Lee/Escribe | Todas las tablas zenin_* |
| **ML Service** (`iot_machine_learning`) | HTTP relay (query) + BD (ingesta) | Query: `/ml/query`, `/ml/semantic-search`. Ingesta: via `ingestion_queue` → `TextCognitiveEngine` (5-phase cognitive pipeline: perceive, analyze, remember, reason, explain) |
| **Redis** | Cache | Búsquedas semánticas (5min TTL), queries (5min), análisis (30min) |
| **Frontend** | HTTP | Único cliente del Backend |

---

## License

MIT
