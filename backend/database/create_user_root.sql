-- ============================================================================
-- Crear usuario 'root' para ZENIN Backend
-- ============================================================================
-- Ejecutar como superusuario (postgres)
-- Comando: psql -h maglev.proxy.rlwy.net -p 16666 -U postgres -d railway -f create_user_root.sql
-- ============================================================================

-- 1. Crear usuario root (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'root') THEN
        CREATE USER root WITH PASSWORD 'kQamXlLJgxKAObBmmIbTHAThxabVxbtS';
        RAISE NOTICE 'Usuario root creado exitosamente';
    ELSE
        RAISE NOTICE 'Usuario root ya existe';
    END IF;
END
$$;

-- 2. Otorgar permisos de superusuario (opcional, solo si necesitas permisos completos)
-- ALTER USER root WITH SUPERUSER;

-- 3. Otorgar permisos sobre la base de datos railway
GRANT ALL PRIVILEGES ON DATABASE railway TO root;

-- 4. Otorgar permisos sobre todos los schemas
GRANT ALL PRIVILEGES ON SCHEMA public TO root;
GRANT ALL PRIVILEGES ON SCHEMA zenin_core TO root;
GRANT ALL PRIVILEGES ON SCHEMA zenin_write TO root;
GRANT ALL PRIVILEGES ON SCHEMA zenin_read TO root;
GRANT ALL PRIVILEGES ON SCHEMA zenin_ml TO root;
GRANT ALL PRIVILEGES ON SCHEMA zenin_audit TO root;

-- 5. Otorgar permisos sobre todas las tablas existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO root;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA zenin_core TO root;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA zenin_write TO root;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA zenin_read TO root;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA zenin_ml TO root;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA zenin_audit TO root;

-- 6. Otorgar permisos sobre todas las secuencias
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA zenin_core TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA zenin_write TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA zenin_read TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA zenin_ml TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA zenin_audit TO root;

-- 7. Otorgar permisos sobre funciones
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO root;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA zenin_core TO root;

-- 8. Permisos por defecto para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_core GRANT ALL ON TABLES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_write GRANT ALL ON TABLES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_read GRANT ALL ON TABLES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_ml GRANT ALL ON TABLES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_audit GRANT ALL ON TABLES TO root;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_core GRANT ALL ON SEQUENCES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_write GRANT ALL ON SEQUENCES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_read GRANT ALL ON SEQUENCES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_ml GRANT ALL ON SEQUENCES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA zenin_audit GRANT ALL ON SEQUENCES TO root;

-- 9. Permitir crear schemas
GRANT CREATE ON DATABASE railway TO root;

-- 10. Verificar permisos
\du root

-- ============================================================================
-- Usuario 'root' creado con permisos completos
-- ============================================================================
