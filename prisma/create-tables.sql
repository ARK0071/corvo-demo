-- Manual table creation for Porter/Corvo in public schema
-- Run this SQL manually to create tables without affecting existing tables

-- Extensions should already be set up via setup-extensions.sql
-- Ensure they exist (no-op if already exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Port Profiles table
CREATE TABLE IF NOT EXISTS port_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location JSONB DEFAULT '{}',
    entity_type VARCHAR(100) NOT NULL,
    classification VARCHAR(100),
    characteristics JSONB DEFAULT '{}',
    priorities JSONB DEFAULT '[]',
    capabilities JSONB DEFAULT '[]',
    needs JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    environmental_goals JSONB DEFAULT '[]',
    community_impact JSONB DEFAULT '[]',
    profile_embedding vector,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discovered Grants table
CREATE TABLE IF NOT EXISTS discovered_grants (
    id VARCHAR(50) PRIMARY KEY,
    opportunity_number VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    agency VARCHAR(500) NOT NULL,
    agency_code VARCHAR(50),
    description TEXT,
    award_floor DECIMAL(15,2) DEFAULT 0,
    award_ceiling DECIMAL(15,2) DEFAULT 0,
    total_funding DECIMAL(15,2) DEFAULT 0,
    close_date DATE,
    post_date DATE,
    status VARCHAR(50) DEFAULT 'posted',
    application_url TEXT,
    cost_sharing BOOLEAN DEFAULT false,
    eligibility JSONB DEFAULT '[]',
    funding_categories JSONB DEFAULT '[]',
    funding_instruments JSONB DEFAULT '[]',
    aln_numbers JSONB DEFAULT '[]',
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    grant_embedding vector,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    api_source VARCHAR(50) DEFAULT 'grants.gov',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovered_grants_status ON discovered_grants(status);
CREATE INDEX IF NOT EXISTS idx_discovered_grants_close_date ON discovered_grants(close_date);
CREATE INDEX IF NOT EXISTS idx_discovered_grants_agency ON discovered_grants(agency);
CREATE INDEX IF NOT EXISTS idx_discovered_grants_last_synced ON discovered_grants(last_synced_at);

-- Port Vendors table
CREATE TABLE IF NOT EXISTS port_vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    sector VARCHAR(100),
    headquarters VARCHAR(255),
    annual_revenue DECIMAL(15,2) DEFAULT 0,
    bonding_capacity DECIMAL(15,2) DEFAULT 0,
    employee_count INT DEFAULT 0,
    safety_record DECIMAL(4,2) DEFAULT 0.8,
    disadvantaged_business VARCHAR(50),
    capabilities JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    key_personnel JSONB DEFAULT '[]',
    past_port_projects JSONB DEFAULT '[]',
    description TEXT,
    vendor_embedding vector,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    api_source VARCHAR(50) DEFAULT 'usaspending',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_port_vendors_sector ON port_vendors(sector);
CREATE INDEX IF NOT EXISTS idx_port_vendors_dbe ON port_vendors(disadvantaged_business);
CREATE INDEX IF NOT EXISTS idx_port_vendors_last_synced ON port_vendors(last_synced_at);

-- Pipeline Grants table
CREATE TABLE IF NOT EXISTS pipeline_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id VARCHAR(50) NOT NULL REFERENCES discovered_grants(id) ON DELETE CASCADE,
    port_profile_id UUID NOT NULL REFERENCES port_profiles(id) ON DELETE CASCADE,
    stage VARCHAR(50) DEFAULT 'eligible',
    notes TEXT DEFAULT '',
    overall_score INT,
    eligibility_score INT,
    alignment_score INT,
    impact_score INT,
    competitiveness_score INT,
    recommendation VARCHAR(50),
    eligibility_status VARCHAR(50),
    strengths JSONB DEFAULT '[]',
    concerns JSONB DEFAULT '[]',
    key_requirements JSONB DEFAULT '[]',
    scored_at TIMESTAMPTZ,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grant_id, port_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_grants_profile ON pipeline_grants(port_profile_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_grants_stage ON pipeline_grants(stage);

-- Grant Vendor Matches table
CREATE TABLE IF NOT EXISTS grant_vendor_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id VARCHAR(50) NOT NULL REFERENCES discovered_grants(id) ON DELETE CASCADE,
    vendor_id VARCHAR(50) NOT NULL REFERENCES port_vendors(id) ON DELETE CASCADE,
    overall_score INT NOT NULL,
    capability_alignment INT DEFAULT 0,
    certification_match INT DEFAULT 0,
    geographic_fit INT DEFAULT 0,
    financial_capacity INT DEFAULT 0,
    strengths JSONB DEFAULT '[]',
    gaps JSONB DEFAULT '[]',
    recommendation VARCHAR(50) NOT NULL,
    vector_similarity FLOAT,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grant_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_grant_vendor_matches_grant ON grant_vendor_matches(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_vendor_matches_vendor ON grant_vendor_matches(vendor_id);
CREATE INDEX IF NOT EXISTS idx_grant_vendor_matches_score ON grant_vendor_matches(overall_score DESC);

-- API Sync Log table
CREATE TABLE IF NOT EXISTS api_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    api_source VARCHAR(50) NOT NULL,
    search_params JSONB,
    records_fetched INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Vector indexes (HNSW for fast similarity search)
-- Note: These are expensive to create, uncomment when you have data
-- CREATE INDEX IF NOT EXISTS idx_grants_embedding ON discovered_grants USING hnsw (grant_embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_vendors_embedding ON port_vendors USING hnsw (vendor_embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON port_profiles USING hnsw (profile_embedding vector_cosine_ops);