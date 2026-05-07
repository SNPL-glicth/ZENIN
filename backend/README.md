# Zenin Backend API

ASP.NET Core 8 Web API with Clean Architecture, SQL Server, Redis, and JWT Authentication.

## Architecture

```
├── Domain/           # Enterprise business rules (entities, interfaces)
├── Application/      # Application business rules (use cases, DTOs)
├── Infrastructure/   # External concerns (database, cache, services)
└── API/             # Presentation layer (controllers, middleware)
```

## Features

- ✅ Clean Architecture (Domain, Application, Infrastructure, API)
- ✅ SQL Server with Entity Framework Core (schemas: `zenin_core`, `zenin_ts`, `zenin_ml`, `zenin_docs`, `zenin_audit`)
- ✅ Redis for caching and real-time events
- ✅ JWT Authentication with refresh tokens
- ✅ ISO 27001 compliance (audit logs, security headers)
- ✅ CQRS with MediatR
- ✅ FluentValidation
- ✅ Health checks
- ✅ Swagger/OpenAPI
- ✅ Serilog logging
- ✅ Docker support

## Prerequisites

- .NET 8 SDK
- SQL Server (local or Docker, port 1434)
- Redis 7
- Docker (optional)

## Getting Started

### Local Development

1. **Clone and navigate:**
   ```bash
   cd ZENIN/backend
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start dependencies:**
   ```bash
   docker run -d -p 1434:1434 -e SA_PASSWORD=YourPassword123 -e ACCEPT_EULA=Y mcr.microsoft.com/mssql/server:2022-latest
docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **Run migrations:**
   ```bash
   cd src/Zenin.API
   dotnet ef database update
   ```

5. **Run the API:**
   ```bash
   dotnet run
   ```

6. **Access Swagger:**
   ```
   http://localhost:5000/swagger
   ```

### Docker Deployment

```bash
docker-compose up -d
```

API will be available at `http://localhost:8080`

## Project Structure

```
backend/
├── src/
│   ├── Zenin.Domain/
│   │   ├── Entities/          # Domain entities
│   │   └── Interfaces/        # Repository interfaces
│   ├── Zenin.Application/
│   │   ├── Common/            # Shared models, interfaces
│   │   └── Features/          # Use cases (CQRS)
│   ├── Zenin.Infrastructure/
│   │   ├── Persistence/       # EF Core, repositories
│   │   └── Services/          # JWT, cache, audit
│   └── Zenin.API/
│       ├── Controllers/       # API endpoints
│       └── Middleware/        # Security, exception handling
├── Dockerfile
├── docker-compose.yml
└── Zenin.sln
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT tokens

### Ingest
- `POST /api/ingest/upload` - Upload file (parse + enqueue async)
- `GET /api/ingest/analysis/{id}` - Poll ML analysis result (tenant-isolated)

### Query
- `POST /api/query` - Semantic question → relay to ML Service `/ml/query`

### Dashboard
- `GET /api/dashboard/overview` - Stats: series, anomalies, patterns, predictions

### Health
- `GET /health` - Health check status

## Security (ISO 27001)

### Implemented Controls

1. **Access Control (A.9)**
   - JWT-based authentication
   - Role-based authorization
   - Refresh token rotation

2. **Cryptography (A.10)**
   - BCrypt password hashing
   - HMAC-SHA256 JWT signing
   - Secure token generation

3. **Operations Security (A.12)**
   - Comprehensive audit logging
   - User activity tracking
   - Error logging with Serilog

4. **Communications Security (A.13)**
   - Security headers (CSP, X-Frame-Options, etc.)
   - CORS configuration
   - HTTPS enforcement (production)

5. **Information Security (A.18)**
   - Soft delete for data retention
   - Audit trail for all actions
   - IP and User-Agent tracking

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ConnectionStrings__DefaultConnection` | SQL Server connection | (required) |
| `MLService__BaseUrl` | ML Service URL | http://localhost:8002 |
| `ConnectionStrings__Redis` | Redis connection | localhost:6379 |
| `Jwt__Secret` | JWT signing key | (required) |
| `Jwt__Issuer` | JWT issuer | ZeninAPI |
| `Jwt__Audience` | JWT audience | ZeninClient |
| `Jwt__ExpiryMinutes` | Token expiry | 60 |
| `Cors__AllowedOrigins` | Allowed CORS origins | localhost:5173 |

## Database Migrations

```bash
# Add migration
dotnet ef migrations add MigrationName -p src/Zenin.Infrastructure -s src/Zenin.API

# Update database
dotnet ef database update -p src/Zenin.Infrastructure -s src/Zenin.API

# Remove last migration
dotnet ef migrations remove -p src/Zenin.Infrastructure -s src/Zenin.API
```

## Testing

```bash
dotnet test
```

## Production Deployment

1. Update `appsettings.json` with production values
2. Set strong JWT secret
3. Configure PostgreSQL and Redis connections
4. Enable HTTPS
5. Set `ASPNETCORE_ENVIRONMENT=Production`
6. Deploy using Docker or cloud platform

## License

MIT
