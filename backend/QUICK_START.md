# ZENIN Backend - Quick Start

## 🚀 Ejecutar desde la carpeta backend

```bash
# Navegar a la carpeta backend
cd ZENIN/backend

# Restaurar dependencias
dotnet restore

# Compilar
dotnet build

# Ejecutar API
dotnet run --project src/Zenin.API/Zenin.API.csproj

# O simplemente (desde backend/):
dotnet run --project src/Zenin.API
```

## 📁 ¿Por qué la API está separada en src/?

Esta es la estructura estándar de **Clean Architecture** en .NET:

```
backend/
├── src/                          # Código fuente (separado de infra)
│   ├── Zenin.Domain/            # Entidades, interfaces (sin dependencias)
│   ├── Zenin.Application/       # Casos de uso, DTOs (depende de Domain)
│   ├── Zenin.Infrastructure/    # Implementaciones (EF Core, Redis, etc.)
│   └── Zenin.API/               # Controllers, endpoints (capa HTTP)
│
├── database/                     # Scripts SQL
├── Dockerfile                    # Imagen Docker
├── docker-compose.yml            # Orquestación
└── Zenin.sln                     # Solución .NET (referencia todos los proyectos)
```

### Ventajas de esta estructura:

1. **Separación de responsabilidades:**
   - `Domain`: Lógica de negocio pura (sin dependencias externas)
   - `Application`: Casos de uso (orquestación)
   - `Infrastructure`: Detalles técnicos (BD, cache, APIs externas)
   - `API`: Capa HTTP (controllers, middleware)

2. **Testeable:**
   - Puedes testear `Domain` sin BD
   - Puedes testear `Application` sin HTTP
   - Puedes mockear `Infrastructure`

3. **Escalable:**
   - Puedes agregar `Zenin.Tests/` en `src/`
   - Puedes agregar `Zenin.Contracts/` para DTOs compartidos
   - Puedes agregar `Zenin.Worker/` para background jobs

4. **Estándar de la industria:**
   - Microsoft lo recomienda
   - Todos los proyectos enterprise lo usan
   - Facilita onboarding de nuevos devs

### Si prefieres estructura plana (NO recomendado):

```
backend/
├── Domain/
├── Application/
├── Infrastructure/
├── API/
└── Zenin.sln
```

**Problema:** Mezcla código fuente con archivos de infraestructura (Dockerfile, database/, etc.)

---

## 🔧 Comandos útiles

### Desde `backend/`:

```bash
# Restaurar + Compilar + Ejecutar
dotnet run --project src/Zenin.API

# Solo compilar
dotnet build

# Limpiar
dotnet clean

# Ejecutar tests (cuando existan)
dotnet test

# Publicar para producción
dotnet publish src/Zenin.API -c Release -o ./publish

# Ver estructura de la solución
dotnet sln list
```

### Desde `backend/src/Zenin.API/`:

```bash
# Ejecutar directamente
dotnet run

# Watch mode (recarga automática)
dotnet watch run
```

---

## 🐳 Docker (desde backend/)

```bash
# Build
docker build -t zenin-api:latest .

# Run
docker-compose up -d

# Logs
docker-compose logs -f api
```

---

## 🔍 Troubleshooting

### Error: "No se pudo encontrar un proyecto para ejecutar"

**Causa:** Estás en la carpeta incorrecta o no especificaste el proyecto.

**Solución:**
```bash
# Desde backend/
dotnet run --project src/Zenin.API

# O navega a src/Zenin.API/
cd src/Zenin.API
dotnet run
```

### Error: "AddValidatorsFromAssembly no existe"

**Causa:** Falta el paquete `FluentValidation.DependencyInjectionExtensions`.

**Solución:** Ya está arreglado en `Zenin.Application.csproj`. Ejecuta:
```bash
dotnet restore
dotnet build
```

### Error: "El directorio de trabajo actual no contiene un archivo de proyecto"

**Causa:** Ejecutaste `dotnet build` sin estar en la carpeta correcta.

**Solución:**
```bash
# Desde backend/
dotnet build Zenin.sln

# O especifica el proyecto
dotnet build src/Zenin.API/Zenin.API.csproj
```

---

## 📝 Estructura completa explicada

```
ZENIN/backend/
│
├── src/                                    # CÓDIGO FUENTE
│   ├── Zenin.Domain/                       # Capa 1: Entidades puras
│   │   ├── Entities/                       # SeriesLatest, SeriesProfile, etc.
│   │   ├── ValueObjects/                   # TenantId, SeriesId
│   │   └── Interfaces/                     # IRepository, IUnitOfWork
│   │
│   ├── Zenin.Application/                  # Capa 2: Casos de uso
│   │   ├── UseCases/                       # GetDashboardSummary, etc.
│   │   ├── DTOs/                           # DashboardSummaryDto
│   │   ├── Interfaces/                     # ISeriesQueryService
│   │   └── DependencyInjection.cs          # Registro de servicios
│   │
│   ├── Zenin.Infrastructure/               # Capa 3: Implementaciones
│   │   ├── Persistence/                    # EF Core DbContext
│   │   ├── Services/                       # SeriesQueryService
│   │   ├── Repositories/                   # SeriesQueryRepository
│   │   └── DependencyInjection.cs          # Registro de servicios
│   │
│   └── Zenin.API/                          # Capa 4: HTTP
│       ├── Controllers/                    # DashboardController
│       ├── Middleware/                     # TenantResolutionMiddleware
│       ├── Program.cs                      # Entry point
│       └── appsettings.json                # Configuración
│
├── database/                               # SCRIPTS SQL
│   ├── schema_async_pipeline.sql           # Schema PostgreSQL
│   └── REDIS_STRATEGY.md                   # Documentación Redis
│
├── Dockerfile                              # DOCKER
├── docker-compose.yml                      # Orquestación
├── .env.example                            # Variables de entorno
├── Zenin.sln                               # SOLUCIÓN .NET
└── README.md                               # Documentación principal
```

---

## ✅ Resumen

**Ejecutar desde `backend/`:**
```bash
dotnet run --project src/Zenin.API
```

**¿Por qué `src/`?**
- Separa código fuente de infraestructura
- Estándar de la industria
- Facilita testing y escalabilidad

**¿Por qué API separada?**
- Clean Architecture: Domain → Application → Infrastructure → API
- Cada capa tiene una responsabilidad clara
- Testeable, mantenible, escalable
