-- =============================================
-- ZENIN Chat System Tables Migration
-- Version: 003
-- Purpose: Create persistent chat sessions and messages
-- =============================================

SET QUOTED_IDENTIFIER ON;
GO

USE zenin_db;
GO

-- Create schema if not exists
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'zenin_chat')
BEGIN
    EXEC('CREATE SCHEMA zenin_chat');
END
GO

-- =============================================
-- Table: chat_sessions
-- Purpose: Store chat sessions with multi-tenant support
-- =============================================
IF OBJECT_ID('zenin_chat.chat_sessions', 'U') IS NOT NULL
    DROP TABLE zenin_chat.chat_sessions;
GO

CREATE TABLE zenin_chat.chat_sessions
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Session metadata
    title NVARCHAR(500) NULL,  -- Auto-generated or user-provided
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Soft delete
    is_deleted BIT NOT NULL DEFAULT 0,
    
    -- Indexes
    INDEX IX_chat_sessions_tenant NONCLUSTERED (tenant_id, is_deleted, created_at DESC),
    INDEX IX_chat_sessions_user NONCLUSTERED (user_id, is_deleted),
    
    -- Foreign keys
    CONSTRAINT FK_chat_sessions_tenant FOREIGN KEY (tenant_id) 
        REFERENCES zenin_core.tenants(id),
    CONSTRAINT FK_chat_sessions_user FOREIGN KEY (user_id) 
        REFERENCES zenin_core.users(id)
);
GO

-- =============================================
-- Table: chat_messages
-- Purpose: Store individual messages within sessions
-- =============================================
IF OBJECT_ID('zenin_chat.chat_messages', 'U') IS NOT NULL
    DROP TABLE zenin_chat.chat_messages;
GO

CREATE TABLE zenin_chat.chat_messages
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    session_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Message content
    role NVARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content NVARCHAR(MAX) NOT NULL,
    
    -- Optional metadata
    analysis_result_id UNIQUEIDENTIFIER NULL,  -- Link to analysis if message triggered one
    
    -- Timestamps
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Indexes
    INDEX IX_chat_messages_session NONCLUSTERED (session_id, created_at ASC),
    INDEX IX_chat_messages_analysis NONCLUSTERED (analysis_result_id) WHERE analysis_result_id IS NOT NULL,
    
    -- Foreign keys
    CONSTRAINT FK_chat_messages_session FOREIGN KEY (session_id) 
        REFERENCES zenin_chat.chat_sessions(id) ON DELETE CASCADE,
    CONSTRAINT FK_chat_messages_analysis FOREIGN KEY (analysis_result_id) 
        REFERENCES zenin_docs.analysis_results(Id)
);
GO

-- =============================================
-- Trigger: Update updated_at on chat_sessions
-- =============================================
CREATE OR ALTER TRIGGER trg_chat_sessions_update
ON zenin_chat.chat_sessions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE zenin_chat.chat_sessions
    SET updated_at = GETUTCDATE()
    FROM zenin_chat.chat_sessions cs
    INNER JOIN inserted i ON cs.id = i.id;
END
GO

-- =============================================
-- Grant permissions (adjust as needed)
-- =============================================
-- GRANT SELECT, INSERT, UPDATE ON zenin_chat.chat_sessions TO zenin_app_user;
-- GRANT SELECT, INSERT ON zenin_chat.chat_messages TO zenin_app_user;

PRINT 'Migration 003 completed: zenin_chat schema created';
GO
