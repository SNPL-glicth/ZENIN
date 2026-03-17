-- ============================================================================
-- ZENIN - Seed Admin User for Local Development
-- ============================================================================
-- Ejecutar después de schema.sql:
-- psql -U nico -d mcgst -f seed_admin_local.sql
-- ============================================================================

-- Crear tenant por defecto
INSERT INTO zenin_core.tenants (id, name, slug, tier, max_series, max_storage_gb, is_active, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Local Development',
    'local-dev',
    'enterprise',
    10000,
    1000,
    true,
    '{"environment": "development"}'::JSONB,
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Crear usuario admin (password: "admin" hasheado con BCrypt)
-- Hash generado con: BCrypt.Net.BCrypt.HashPassword("admin", workFactor: 11)
-- IMPORTANTE: Este hash es válido para "admin" con BCrypt
INSERT INTO zenin_core.users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000002'::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID,
    'admin@zenin.local',
    '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- password: "admin"
    'Admin',
    'User',
    'admin',
    true,
    NOW()
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Verificación
SELECT 
    u.id, 
    u.email, 
    u.first_name, 
    u.last_name, 
    u.role, 
    t.name AS tenant_name,
    t.tier
FROM zenin_core.users u
JOIN zenin_core.tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@zenin.local';

-- Mensaje de confirmación
SELECT 'Usuario admin@zenin.local creado correctamente. Password: admin' AS status;
