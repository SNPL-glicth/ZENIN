-- ZENIN: SQL Server initialization script
-- Creates database, schemas, and seed data

-- Create database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'zenin_db')
BEGIN
    CREATE DATABASE zenin_db;
END
GO

USE zenin_db;
GO

-- Create schemas
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'zenin_core')
    EXEC('CREATE SCHEMA zenin_core');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'zenin_audit')
    EXEC('CREATE SCHEMA zenin_audit');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'zenin_ts')
    EXEC('CREATE SCHEMA zenin_ts');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'zenin_ml')
    EXEC('CREATE SCHEMA zenin_ml');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'zenin_docs')
    EXEC('CREATE SCHEMA zenin_docs');
GO

-- Seed default tenant (used for new user registrations)
IF NOT EXISTS (SELECT 1 FROM zenin_core.tenants WHERE id = '00000000-0000-0000-0000-000000000001')
BEGIN
    INSERT INTO zenin_core.tenants (id, [Name], [Slug], [Tier], [MaxSeries], [MaxStorageGb], [IsActive], [CreatedAt])
    VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default', 'free', 100, 1.0, 1, GETUTCDATE());
    PRINT 'ZENIN: Default tenant seeded';
END
GO

PRINT 'ZENIN: Database and schemas created successfully';
GO
