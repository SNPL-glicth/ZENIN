-- ============================================================================
-- Crear usuario administrador inicial
-- ============================================================================
-- Password: Admin123!
-- BCrypt hash generado con workFactor 12
-- ============================================================================

DO $$
DECLARE
    default_tenant_id UUID;
    admin_user_id UUID;
BEGIN
    -- 1. Crear tenant por defecto si no existe
    INSERT INTO zenin_core.tenants (id, name, slug, tier, is_active, created_at)
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Default Organization',
        'default',
        'enterprise',
        true,
        NOW()
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_tenant_id;

    -- Si el tenant ya existía, obtener su ID
    IF default_tenant_id IS NULL THEN
        SELECT id INTO default_tenant_id 
        FROM zenin_core.tenants 
        WHERE slug = 'default';
    END IF;

    -- 2. Crear usuario administrador
    -- Password: Admin123!
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
        default_tenant_id,
        'admin@zenin.local',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqR.W8qGSu',
        'Admin',
        'User',
        'Admin',
        true,
        NOW()
    )
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role = 'Admin',
        is_active = true
    RETURNING id INTO admin_user_id;

    RAISE NOTICE '✅ Usuario administrador creado/actualizado';
    RAISE NOTICE '📧 Email: admin@zenin.local';
    RAISE NOTICE '🔑 Password: Admin123!';
    RAISE NOTICE '🆔 User ID: %', admin_user_id;
    RAISE NOTICE '🏢 Tenant ID: %', default_tenant_id;
END $$;

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
WHERE u.email = 'admin@zenin.local';
