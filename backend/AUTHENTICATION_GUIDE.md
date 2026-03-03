# ZENIN - Guía de Autenticación

## 🔐 Sistema de Autenticación Implementado

### Tecnologías
- **BCrypt** - Hash de contraseñas (workFactor 12)
- **JWT** - JSON Web Tokens para autenticación
- **Refresh Tokens** - Tokens de larga duración (7 días)

---

## 📋 Endpoints Disponibles

### 1. Registro de Usuario
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123!",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

**Respuesta exitosa (200):**
```json
{
  "userId": "uuid",
  "email": "usuario@ejemplo.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "User",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "base64_refresh_token",
  "expiresAt": "2024-03-03T15:00:00Z"
}
```

**Validaciones:**
- Email válido
- Password mínimo 8 caracteres
- FirstName mínimo 2 caracteres
- LastName mínimo 2 caracteres

---

### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123!"
}
```

**Respuesta exitosa (200):**
```json
{
  "userId": "uuid",
  "email": "usuario@ejemplo.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "User",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "base64_refresh_token",
  "expiresAt": "2024-03-03T15:00:00Z"
}
```

**Errores:**
- `401 Unauthorized` - Email o password incorrectos
- `401 Unauthorized` - Cuenta desactivada

---

### 3. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "base64_refresh_token"
}
```

**Respuesta exitosa (200):**
```json
{
  "userId": "uuid",
  "email": "usuario@ejemplo.com",
  "token": "nuevo_jwt_token",
  "refreshToken": "nuevo_refresh_token",
  "expiresAt": "2024-03-03T16:00:00Z"
}
```

---

### 4. Revoke Token (Logout)
```http
POST /api/auth/revoke
Content-Type: application/json

{
  "refreshToken": "base64_refresh_token"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true
}
```

---

## 🔑 Usuario Administrador por Defecto

### Credenciales
```
Email: admin@zenin.local
Password: Admin123!
```

### Crear usuario admin
```bash
psql -h crossover.proxy.rlwy.net -p 22152 -U postgres -d railway -f database/seed_admin_user.sql
```

---

## 🛡️ Usar JWT en Requests

### Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Ejemplo con curl
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@zenin.local",
    "password": "Admin123!"
  }'

# Guardar token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Usar token en request protegido
curl http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔐 Seguridad Implementada

### Password Hashing
- **Algoritmo:** BCrypt
- **Work Factor:** 12 (2^12 = 4096 iteraciones)
- **Salt:** Generado automáticamente por BCrypt
- **Resistente a:** Rainbow tables, fuerza bruta

### JWT Configuration
- **Algoritmo:** HMAC-SHA256
- **Expiración:** 60 minutos (configurable en `appsettings.json`)
- **Claims incluidos:**
  - `sub` - User ID
  - `email` - Email del usuario
  - `given_name` - First Name
  - `family_name` - Last Name
  - `role` - Rol del usuario
  - `jti` - JWT ID único

### Refresh Tokens
- **Duración:** 7 días
- **Almacenamiento:** Base de datos (tabla `users`)
- **Generación:** Cryptographically secure random (64 bytes)
- **Revocación:** Soportada (logout)

---

## 📝 Flujo de Autenticación

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │
       │ 1. POST /api/auth/login
       │    { email, password }
       ▼
┌─────────────────┐
│   AuthService   │
│                 │
│ 2. Buscar user  │────► IUserRepository
│ 3. Verify BCrypt│────► IPasswordHasher
│ 4. Generate JWT │────► IJwtTokenGenerator
│ 5. Save refresh │────► IUnitOfWork
└────────┬────────┘
         │
         │ 6. Return { token, refreshToken }
         ▼
┌─────────────┐
│   Cliente   │ Guarda tokens
└──────┬──────┘
       │
       │ 7. Request con Authorization: Bearer {token}
       ▼
┌─────────────────┐
│  API Endpoint   │
│  [Authorize]    │ ◄── JWT Middleware valida token
└─────────────────┘
```

---

## 🧪 Testing

### Registro de nuevo usuario
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@zenin.local",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@zenin.local",
    "password": "Test123!"
  }'
```

### Verificar token en jwt.io
1. Copiar el token de la respuesta
2. Ir a https://jwt.io
3. Pegar el token
4. Verificar claims y expiración

---

## 🔧 Configuración

### appsettings.json
```json
{
  "Jwt": {
    "Secret": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!",
    "Issuer": "ZeninAPI",
    "Audience": "ZeninClient",
    "ExpiryMinutes": 60
  }
}
```

### Variables de Entorno (Producción)
```bash
JWT_SECRET=your_production_secret_key_here
JWT_ISSUER=ZeninAPI
JWT_AUDIENCE=ZeninClient
JWT_EXPIRY_MINUTES=60
```

---

## ✅ Checklist de Implementación

- [x] BCrypt password hashing (workFactor 12)
- [x] JWT token generation
- [x] Refresh token support
- [x] User registration endpoint
- [x] Login endpoint
- [x] Refresh token endpoint
- [x] Revoke token endpoint (logout)
- [x] JWT middleware configuration
- [x] Password validation (min 8 chars)
- [x] Email validation
- [x] User repository
- [x] Seed admin user script

---

## 🚀 Próximos Pasos

1. **Ejecutar schema PostgreSQL:**
   ```bash
   psql -h crossover.proxy.rlwy.net -p 22152 -U postgres -d railway -f database/schema_async_pipeline.sql
   ```

2. **Crear usuario admin:**
   ```bash
   psql -h crossover.proxy.rlwy.net -p 22152 -U postgres -d railway -f database/seed_admin_user.sql
   ```

3. **Probar autenticación:**
   ```bash
   # Login con admin
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@zenin.local","password":"Admin123!"}'
   ```

4. **Crear usuarios adicionales** vía endpoint `/api/auth/register`

---

**Sistema de autenticación completo y listo para usar** ✅
