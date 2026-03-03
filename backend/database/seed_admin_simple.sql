-- ============================================================================
-- Crear usuario administrador con credenciales simples
-- ============================================================================
-- Email: admin
-- Password: admin123
-- BCrypt hash generado con workFactor 12
-- ============================================================================

-- Habilitar extensión uuid si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tenant por defecto si no existe
INSERT INTO zenin_core.tenants (id, name, slug, tier, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Organization',
    'default',
    'enterprise',
    true,
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Crear usuario administrador en zenin_core.users
-- Email: admin
-- Password: admin123
-- Hash BCrypt (workFactor 12): $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqR.W8qGSu

INSERT INTO zenin_core.users (
    id,
    tenant_id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active,
    created_at
)
VALUES (
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'admin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqR.W8qGSu',
    'Admin',
    'User',
    'Admin',
    true,
    NOW()
)
ON CONFLICT (tenant_id, email) DO UPDATE
SET 
    password_hash = EXCLUDED.password_hash,
    role = 'Admin',
    is_active = true;

-- Verificar usuario creado
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    t.name as tenant_name,
    t.slug as tenant_slug
FROM zenin_core.users u
JOIN zenin_core.tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin';

-- Mostrar credenciales
DO $$
BEGIN
    RAISE NOTICE '✅ Usuario administrador creado/actualizado';
    RAISE NOTICE '📧 Email: admin';
    RAISE NOTICE '🔑 Password: admin123';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Puedes iniciar sesión en:';
    RAISE NOTICE '   Frontend: https://zenin-azure.vercel.app/login';
    RAISE NOTICE '   Backend:  https://apizeninutsae.com/api/auth/login';
END $$;
