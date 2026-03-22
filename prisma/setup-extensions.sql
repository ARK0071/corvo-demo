-- Move extensions to public schema
-- Run this before create-tables.sql

-- Move vector extension to public schema (if it exists in corvo)
DO $$
BEGIN
    -- Check if vector extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        -- Move to public schema
        ALTER EXTENSION vector SET SCHEMA public;
    ELSE
        -- Create in public schema
        CREATE EXTENSION vector SCHEMA public;
    END IF;
END $$;

-- Ensure uuid-ossp is in public
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        ALTER EXTENSION "uuid-ossp" SET SCHEMA public;
    ELSE
        CREATE EXTENSION "uuid-ossp" SCHEMA public;
    END IF;
END $$;