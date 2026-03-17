# 🔧 Setup Base de Datos Local PostgreSQL para ZENIN

## 📋 Pre-requisitos

- PostgreSQL instalado localmente
- Acceso como superuser (postgres)

## 🚀 Pasos de Configuración

### 1️⃣ Crear Base de Datos y Usuario

```bash
# Ejecutar como superuser postgres
sudo -u postgres psql -f /home/nicolas/Documentos/Iot_System/ZENIN/backend/database/setup_local_db.sql
```

**Resumen del script:**
- Crea database: `mcgst`
- Crea usuario: `nico` (password: `cWyA#Lw%d5N&YwV9auA#U5`)
- Otorga todos los privilegios

---

### 2️⃣ Ejecutar Schema Completo

```bash
# Conectarse a la nueva DB y ejecutar schema
psql -U nico -d mcgst -f /home/nicolas/Documentos/Iot_System/ZENIN/backend/database/schema.sql
```

**Este script crea:**
- ✅ 5 schemas: zenin_core, zenin_ts, zenin_ml, zenin_audit, zenin_iot
- ✅ 20+ tablas con particiones automáticas (13 meses)
- ✅ Triggers, funciones, vistas
- ✅ Row Level Security (RLS)
- ✅ Extensiones: uuid-ossp, pg_stat_statements, btree_gin

---

### 3️⃣ Crear Usuario Admin

```bash
# Seed del usuario admin/admin
psql -U nico -d mcgst -f /home/nicolas/Documentos/Iot_System/ZENIN/backend/database/seed_admin_local.sql
```

**Usuario creado:**
- 📧 Email: `admin@zenin.local`
- 🔑 Password: `admin`
- 👤 Rol: `admin`
- 🏢 Tenant: `Local Development` (tier: enterprise)

---

### 4️⃣ Verificar Conexión

```bash
# Test de conexión
psql -U nico -d mcgst -c "SELECT tablename FROM pg_tables WHERE schemaname = 'zenin_core';"
```

**Debería mostrar:**
```
 tablename
-----------
 tenants
 users
 api_keys
(3 rows)
```

---

### 5️⃣ Verificar Usuario Admin

```bash
psql -U nico -d mcgst -c "SELECT email, role, t.name AS tenant FROM zenin_core.users u JOIN zenin_core.tenants t ON u.tenant_id = t.id WHERE u.email = 'admin@zenin.local';"
```

**Output esperado:**
```
       email        | role  |      tenant
--------------------+-------+-------------------
 admin@zenin.local | admin | Local Development
(1 row)
```

---

## ✅ Configuración Backend .NET

Los siguientes archivos ya fueron actualizados:

### `.env`
```env
POSTGRES_DB=mcgst
POSTGRES_USER=nico
POSTGRES_PASSWORD=cWyA#Lw%d5N&YwV9auA#U5
DB_HOST=localhost
DB_PORT=5432
```

### `appsettings.json`
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=mcgst;Username=nico;Password=cWyA#Lw%d5N&YwV9auA#U5"
  }
}
```

---

## 🧪 Test del Backend

```bash
cd /home/nicolas/Documentos/Iot_System/ZENIN/backend/src/Zenin.API
dotnet run
```

**Verificar logs:**
```
🚀 Zenin API iniciada correctamente
📍 Puerto: 8080
📊 Swagger UI: http://localhost:8080/swagger
💚 Health Check: http://localhost:8080/health
```

**Test de health check:**
```bash
curl http://localhost:8080/health | jq
```

**Debería retornar:**
```json
{
  "status": "Healthy",
  "results": {
    "npgsql": {
      "status": "Healthy"
    },
    "redis": {
      "status": "Healthy"
    }
  }
}
```

---

## 🔐 Test de Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@zenin.local",
    "password": "admin"
  }' | jq
```

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "email": "admin@zenin.local",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin"
}
```

---

## 🗑️ Limpiar y Reiniciar (Si es necesario)

```bash
# Eliminar base de datos y volver a crear
sudo -u postgres psql -c "DROP DATABASE IF EXISTS mcgst;"
sudo -u postgres psql -c "DROP USER IF EXISTS nico;"

# Re-ejecutar desde paso 1
```

---

## ⚠️ Notas Importantes

1. **Password de admin**: Cambiar `admin` por un password seguro en producción
2. **Backup de producción**: Connection string original guardado en `appsettings.json` bajo `_ProductionBackup`
3. **Redis**: Asegurarse que Redis esté corriendo en `localhost:6379`
4. **Particiones**: Se crean automáticamente para 13 meses. Usar función `zenin_core.create_next_month_partitions()` mensualmente.
5. **RLS**: Row Level Security está habilitado. Asegurarse de setear `app.current_tenant_id` en el contexto.

---

## 📝 Checklist Final

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `mcgst` creada
- [ ] Usuario `nico` creado con permisos
- [ ] Schema ejecutado (20+ tablas creadas)
- [ ] Usuario admin seeded
- [ ] Backend .env actualizado
- [ ] Backend appsettings.json actualizado
- [ ] Backend compila sin errores (`dotnet build`)
- [ ] Health check retorna Healthy
- [ ] Login con admin/admin funciona
- [ ] Redis corriendo (opcional para health check)

---

**Migración completada** ✅

Base de datos local lista para desarrollo sin conexión a Railway/producción.
