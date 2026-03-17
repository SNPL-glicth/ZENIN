-- ============================================================================
-- ZENIN - Tabla Universal de Documentos
-- ============================================================================
-- Ejecutar como superuser:
-- sudo -u postgres psql -d mcgst -f create_documents_table.sql
-- ============================================================================

-- Otorgar permisos al usuario nico sobre zenin_core (para foreign keys)
GRANT USAGE ON SCHEMA zenin_core TO nico;
GRANT SELECT ON zenin_core.tenants TO nico;
GRANT SELECT ON zenin_core.users TO nico;

-- Crear schema si no existe
CREATE SCHEMA IF NOT EXISTS zenin_docs;

-- Tabla principal de documentos subidos
CREATE TABLE IF NOT EXISTS zenin_docs.documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES zenin_core.tenants(id),
    uploaded_by     UUID NOT NULL REFERENCES zenin_core.users(id),
    original_filename   TEXT NOT NULL,
    stored_filename     TEXT NOT NULL,
    file_extension      TEXT NOT NULL,
    file_size_bytes     BIGINT,
    mime_type           TEXT,
    content_type        TEXT,
    binary_content      BYTEA,
    raw_text            TEXT,
    normalized_payload  JSONB,
    status              TEXT NOT NULL DEFAULT 'pending',
    error_message       TEXT,
    ml_result           JSONB,
    conclusion          TEXT,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    analyzed_at         TIMESTAMPTZ,
    metadata            JSONB,
    weaviate_id         TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documents_tenant 
    ON zenin_docs.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status 
    ON zenin_docs.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at 
    ON zenin_docs.documents(uploaded_at DESC);

-- Otorgar permisos al usuario nico
GRANT USAGE ON SCHEMA zenin_docs TO nico;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA zenin_docs TO nico;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA zenin_docs TO nico;

-- Mensaje de confirmación
SELECT 'Tabla zenin_docs.documents creada correctamente' AS status;
