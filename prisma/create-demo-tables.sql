-- Demo tables for OpenAI embeddings (text-embedding-3-small: 1536 dimensions)
-- These are separate from the production tables for demo purposes

-- Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Demo Port Profiles table
CREATE TABLE IF NOT EXISTS demo_port_profiles (
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
    profile_embedding vector(1536),  -- OpenAI text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo Discovered Grants table
CREATE TABLE IF NOT EXISTS demo_discovered_grants (
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
    grant_embedding vector(1536),  -- OpenAI text-embedding-3-small
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    api_source VARCHAR(50) DEFAULT 'grants.gov',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_grants_status ON demo_discovered_grants(status);
CREATE INDEX IF NOT EXISTS idx_demo_grants_close_date ON demo_discovered_grants(close_date);
CREATE INDEX IF NOT EXISTS idx_demo_grants_agency ON demo_discovered_grants(agency);

-- Demo Port Vendors table
CREATE TABLE IF NOT EXISTS demo_port_vendors (
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
    vendor_embedding vector(1536),  -- OpenAI text-embedding-3-small
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    api_source VARCHAR(50) DEFAULT 'usaspending',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_vendors_sector ON demo_port_vendors(sector);
CREATE INDEX IF NOT EXISTS idx_demo_vendors_dbe ON demo_port_vendors(disadvantaged_business);

-- Demo Pipeline Grants table
CREATE TABLE IF NOT EXISTS demo_pipeline_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id VARCHAR(50) NOT NULL REFERENCES demo_discovered_grants(id) ON DELETE CASCADE,
    port_profile_id UUID NOT NULL REFERENCES demo_port_profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_demo_pipeline_profile ON demo_pipeline_grants(port_profile_id);
CREATE INDEX IF NOT EXISTS idx_demo_pipeline_stage ON demo_pipeline_grants(stage);

-- Demo Grant Vendor Matches table
CREATE TABLE IF NOT EXISTS demo_grant_vendor_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id VARCHAR(50) NOT NULL REFERENCES demo_discovered_grants(id) ON DELETE CASCADE,
    vendor_id VARCHAR(50) NOT NULL REFERENCES demo_port_vendors(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_demo_matches_grant ON demo_grant_vendor_matches(grant_id);
CREATE INDEX IF NOT EXISTS idx_demo_matches_vendor ON demo_grant_vendor_matches(vendor_id);
CREATE INDEX IF NOT EXISTS idx_demo_matches_score ON demo_grant_vendor_matches(overall_score DESC);

-- HNSW indexes for fast vector similarity search (enable after loading data)
-- CREATE INDEX IF NOT EXISTS idx_demo_grants_embedding ON demo_discovered_grants USING hnsw (grant_embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_demo_vendors_embedding ON demo_port_vendors USING hnsw (vendor_embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_demo_profiles_embedding ON demo_port_profiles USING hnsw (profile_embedding vector_cosine_ops);