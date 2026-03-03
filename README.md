# ZENIN

Modern SaaS application with ASP.NET Core 8 backend and React frontend.

## Architecture

### Backend
- **Clean Architecture** (Domain, Application, Infrastructure, API)
- **ASP.NET Core 8** Web API
- **PostgreSQL** for primary database
- **Redis** for caching and real-time events
- **JWT Authentication** with refresh tokens
- **ISO 27001 Compliance** (audit logs, security headers)
- **Swagger/OpenAPI** documentation
- **Health checks** for monitoring

### Frontend
- **React 19** with Vite
- **Minimalist black & white design**
- **React Router** for navigation
- **Axios** for API calls
- **Lucide React** for icons
- **Tailwind CSS** for styling

## Features

✅ User authentication (register/login)  
✅ JWT-based authorization  
✅ Audit logging (ISO 27001)  
✅ Security headers (CSP, X-Frame-Options, etc.)  
✅ Health monitoring  
✅ Docker support  
✅ Production-ready configuration  

## Quick Start

### Prerequisites

- .NET 8 SDK
- Node.js 20+
- PostgreSQL 16
- Redis 7
- Docker (optional)

### Development Setup

#### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your settings

# Start dependencies
docker-compose up postgres redis -d

# Run migrations
cd src/Zenin.API
dotnet ef database update

# Run API
dotnet run
```

API will be available at `http://localhost:5000`  
Swagger UI at `http://localhost:5000/swagger`

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env

# Run dev server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Docker Deployment

```bash
# Backend
cd backend
docker-compose up -d

# Frontend (build and serve)
cd frontend
docker build -t zenin-frontend .
docker run -p 80:80 zenin-frontend
```

## Project Structure

```
ZENIN/
├── backend/
│   ├── src/
│   │   ├── Zenin.Domain/          # Entities, interfaces
│   │   ├── Zenin.Application/     # Use cases, DTOs
│   │   ├── Zenin.Infrastructure/  # EF Core, services
│   │   └── Zenin.API/             # Controllers, middleware
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── frontend/
    ├── src/
    │   ├── components/            # Reusable UI components
    │   ├── context/               # React context (auth)
    │   ├── pages/                 # Route pages
    │   ├── services/              # API client
    │   └── App.jsx                # Main app component
    ├── Dockerfile
    └── nginx.conf
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens

### Health
- `GET /health` - Health check status
- `GET /` - API info

## Security (ISO 27001)

### Implemented Controls

**A.9 Access Control**
- JWT authentication
- Role-based authorization
- Refresh token rotation

**A.10 Cryptography**
- BCrypt password hashing
- HMAC-SHA256 JWT signing

**A.12 Operations Security**
- Comprehensive audit logging
- User activity tracking
- Structured logging with Serilog

**A.13 Communications Security**
- Security headers (CSP, X-Frame-Options, HSTS)
- CORS configuration
- HTTPS enforcement

**A.18 Compliance**
- Soft delete for data retention
- Audit trail for all actions
- IP and User-Agent tracking

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection | localhost:5432 |
| `ConnectionStrings__Redis` | Redis connection | localhost:6379 |
| `Jwt__Secret` | JWT signing key | (required) |
| `Jwt__Issuer` | JWT issuer | ZeninAPI |
| `Jwt__Audience` | JWT audience | ZeninClient |
| `Jwt__ExpiryMinutes` | Token expiry | 60 |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:5000/api |

## Development

### Backend Migrations

```bash
# Add migration
dotnet ef migrations add MigrationName -p src/Zenin.Infrastructure -s src/Zenin.API

# Update database
dotnet ef database update -p src/Zenin.Infrastructure -s src/Zenin.API
```

### Frontend Build

```bash
npm run build    # Production build
npm run preview  # Preview production build
```

## Production Deployment

1. Set strong JWT secret
2. Configure production database connections
3. Enable HTTPS
4. Set `ASPNETCORE_ENVIRONMENT=Production`
5. Configure CORS for production domain
6. Deploy using Docker or cloud platform

## License

MIT
