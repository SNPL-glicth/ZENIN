-- ============================================================================
-- ZENIN - Setup Local PostgreSQL Database
-- ============================================================================
-- Ejecutar como superuser (postgres):
-- psql -U postgres -f setup_local_db.sql
-- ============================================================================

-- Crear base de datos
CREATE DATABASE mcgst;

-- Crear usuario
CREATE USER nico WITH ENCRYPTED PASSWORD 'cWyA#Lw%d5N&YwV9auA#U5';

-- Otorgar privilegios (CORREGIDO: era 'midb', ahora es 'mcgst')
GRANT ALL PRIVILEGES ON DATABASE mcgst TO nico;

-- Conectar a la nueva base de datos
\c mcgst

-- Otorgar permisos en el schema public
GRANT ALL PRIVILEGES ON SCHEMA public TO nico;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nico;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nico;

-- Mensaje de confirmación
SELECT 'Base de datos mcgst creada correctamente' AS status;
