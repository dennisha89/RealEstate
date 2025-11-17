-- ============================================================================
-- Property Management SaaS Platform - Database Schema
-- Database: PostgreSQL 14+
-- Author: AI Assistant
-- Date: 2025-11-17
-- Description: Comprehensive schema for multi-tenant property management
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";           -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";            -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";             -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";          -- Advanced indexing
-- Optional: CREATE EXTENSION IF NOT EXISTS "timescaledb"; -- Time-series data

-- ============================================================================
-- CUSTOM TYPES & ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'landlord',
    'tenant',
    'contractor',
    'property_manager',
    'admin'
);

CREATE TYPE user_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_verification'
);

CREATE TYPE property_type AS ENUM (
    'single_family',
    'multi_family',
    'apartment',
    'condo',
    'townhouse',
    'commercial',
    'other'
);

CREATE TYPE property_status AS ENUM (
    'available',
    'occupied',
    'maintenance',
    'off_market'
);

CREATE TYPE unit_status AS ENUM (
    'available',
    'occupied',
    'maintenance',
    'reserved'
);

CREATE TYPE lease_status AS ENUM (
    'draft',
    'pending_signature',
    'active',
    'expired',
    'terminated',
    'cancelled'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled'
);

CREATE TYPE payment_type AS ENUM (
    'rent',
    'security_deposit',
    'late_fee',
    'maintenance_fee',
    'utility',
    'pet_deposit',
    'application_fee',
    'other'
);

CREATE TYPE payment_method AS ENUM (
    'credit_card',
    'debit_card',
    'ach',
    'bank_transfer',
    'check',
    'cash',
    'other'
);

CREATE TYPE maintenance_status AS ENUM (
    'submitted',
    'acknowledged',
    'assigned',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled',
    'rejected'
);

CREATE TYPE maintenance_priority AS ENUM (
    'emergency',
    'urgent',
    'normal',
    'low'
);

CREATE TYPE maintenance_category AS ENUM (
    'plumbing',
    'electrical',
    'hvac',
    'appliance',
    'structural',
    'pest_control',
    'landscaping',
    'security',
    'other'
);

CREATE TYPE document_type AS ENUM (
    'lease_agreement',
    'lease_amendment',
    'move_in_checklist',
    'move_out_checklist',
    'inspection_report',
    'photo',
    'video',
    'receipt',
    'invoice',
    'notice',
    'violation_notice',
    'correspondence',
    'other'
);

CREATE TYPE message_status AS ENUM (
    'sent',
    'delivered',
    'read',
    'failed'
);

CREATE TYPE inspection_type AS ENUM (
    'move_in',
    'move_out',
    'periodic',
    'emergency',
    'pre_lease',
    'maintenance'
);

CREATE TYPE inspection_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE violation_type AS ENUM (
    'noise',
    'unauthorized_occupant',
    'unauthorized_pet',
    'property_damage',
    'late_payment',
    'illegal_activity',
    'lease_violation',
    'other'
);

CREATE TYPE violation_severity AS ENUM (
    'minor',
    'moderate',
    'serious',
    'critical'
);

CREATE TYPE violation_status AS ENUM (
    'reported',
    'acknowledged',
    'warning_issued',
    'under_review',
    'resolved',
    'escalated',
    'legal_action'
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ORGANIZATIONS (Multi-tenancy root)
-- ----------------------------------------------------------------------------
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- Contact info
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    
    -- Settings
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(50) DEFAULT 'active',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT organizations_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Authentication
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    avatar_url VARCHAR(500),
    
    -- Role & Status
    role user_role NOT NULL,
    status user_status DEFAULT 'pending_verification',
    
    -- Contact preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'email',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Emergency contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    
    -- Settings & Metadata
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Security
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_name_not_empty CHECK (
        LENGTH(TRIM(first_name)) > 0 AND 
        LENGTH(TRIM(last_name)) > 0
    ),
    UNIQUE (organization_id, email, deleted_at)
);

CREATE INDEX idx_users_organization_id ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- ----------------------------------------------------------------------------
-- PROPERTIES
-- ----------------------------------------------------------------------------
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    property_type property_type NOT NULL,
    status property_status DEFAULT 'available',
    
    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Property Details
    year_built INTEGER,
    square_footage INTEGER,
    lot_size DECIMAL(10, 2),
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    parking_spaces INTEGER,
    
    -- Financial
    purchase_price DECIMAL(12, 2),
    current_market_value DECIMAL(12, 2),
    property_tax_annual DECIMAL(10, 2),
    insurance_annual DECIMAL(10, 2),
    hoa_fee_monthly DECIMAL(8, 2),
    
    -- Features & Amenities
    features JSONB DEFAULT '{}',
    amenities TEXT[],
    
    -- Management
    property_manager_id UUID REFERENCES users(id),
    management_fee_percentage DECIMAL(5, 2),
    
    -- Documentation
    description TEXT,
    notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT properties_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT properties_coordinates_valid CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    ),
    CONSTRAINT properties_financial_positive CHECK (
        (purchase_price IS NULL OR purchase_price >= 0) AND
        (current_market_value IS NULL OR current_market_value >= 0) AND
        (property_tax_annual IS NULL OR property_tax_annual >= 0) AND
        (insurance_annual IS NULL OR insurance_annual >= 0) AND
        (hoa_fee_monthly IS NULL OR hoa_fee_monthly >= 0)
    )
);

CREATE INDEX idx_properties_organization_id ON properties(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_owner_id ON properties(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_property_type ON properties(property_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_location ON properties(city, state) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_coordinates ON properties USING GIST(ll_to_earth(latitude, longitude)) WHERE deleted_at IS NULL AND latitude IS NOT NULL;
CREATE INDEX idx_properties_deleted_at ON properties(deleted_at);

-- ----------------------------------------------------------------------------
-- UNITS (for multi-unit properties)
-- ----------------------------------------------------------------------------
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Unit Info
    unit_number VARCHAR(50) NOT NULL,
    floor INTEGER,
    status unit_status DEFAULT 'available',
    
    -- Unit Details
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    square_footage INTEGER,
    
    -- Rental Info
    monthly_rent DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) NOT NULL,
    pet_deposit DECIMAL(10, 2) DEFAULT 0,
    
    -- Features
    features JSONB DEFAULT '{}',
    amenities TEXT[],
    
    -- Documentation
    description TEXT,
    notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT units_unit_number_not_empty CHECK (LENGTH(TRIM(unit_number)) > 0),
    CONSTRAINT units_rent_positive CHECK (monthly_rent > 0),
    CONSTRAINT units_deposit_positive CHECK (security_deposit >= 0 AND pet_deposit >= 0),
    UNIQUE (property_id, unit_number, deleted_at)
);

CREATE INDEX idx_units_property_id ON units(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_units_status ON units(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_units_deleted_at ON units(deleted_at);

-- ----------------------------------------------------------------------------
-- LEASES
-- ----------------------------------------------------------------------------
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    landlord_id UUID NOT NULL REFERENCES users(id),
    
    -- Lease Terms
    lease_number VARCHAR(50) UNIQUE,
    status lease_status DEFAULT 'draft',
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    signed_date DATE,
    move_in_date DATE,
    move_out_date DATE,
    notice_date DATE,
    
    -- Financial Terms
    monthly_rent DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) NOT NULL,
    pet_deposit DECIMAL(10, 2) DEFAULT 0,
    late_fee_amount DECIMAL(10, 2) DEFAULT 0,
    late_fee_grace_period_days INTEGER DEFAULT 5,
    
    -- Payment Terms
    rent_due_day INTEGER NOT NULL DEFAULT 1,
    payment_method payment_method,
    auto_renewal BOOLEAN DEFAULT FALSE,
    
    -- Terms & Conditions
    terms_and_conditions TEXT,
    special_provisions TEXT,
    pet_policy TEXT,
    smoking_allowed BOOLEAN DEFAULT FALSE,
    subletting_allowed BOOLEAN DEFAULT FALSE,
    max_occupants INTEGER,
    
    -- Utilities
    utilities_included TEXT[],
    utilities_tenant_responsible TEXT[],
    
    -- Documentation
    notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT leases_date_range_valid CHECK (end_date > start_date),
    CONSTRAINT leases_rent_positive CHECK (monthly_rent > 0),
    CONSTRAINT leases_deposit_positive CHECK (security_deposit >= 0 AND pet_deposit >= 0),
    CONSTRAINT leases_due_day_valid CHECK (rent_due_day BETWEEN 1 AND 28),
    CONSTRAINT leases_move_in_valid CHECK (
        move_in_date IS NULL OR 
        (move_in_date >= start_date AND move_in_date <= end_date)
    )
);

CREATE INDEX idx_leases_organization_id ON leases(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_property_id ON leases(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_unit_id ON leases(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_landlord_id ON leases(landlord_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_status ON leases(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_dates ON leases(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_active ON leases(start_date, end_date) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_leases_deleted_at ON leases(deleted_at);

-- ----------------------------------------------------------------------------
-- LEASE_TENANTS (Many-to-Many: Leases <-> Users)
-- ----------------------------------------------------------------------------
CREATE TABLE lease_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES users(id),
    
    -- Tenant Details
    is_primary BOOLEAN DEFAULT FALSE,
    responsibility_percentage DECIMAL(5, 2) DEFAULT 100.00,
    
    -- Signing
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_ip INET,
    
    -- Move in/out
    moved_in_at TIMESTAMP WITH TIME ZONE,
    moved_out_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE (lease_id, tenant_id, deleted_at)
);

CREATE INDEX idx_lease_tenants_lease_id ON lease_tenants(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lease_tenants_tenant_id ON lease_tenants(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lease_tenants_deleted_at ON lease_tenants(deleted_at);

-- ----------------------------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL REFERENCES leases(id),
    tenant_id UUID NOT NULL REFERENCES users(id),
    
    -- Payment Info
    payment_number VARCHAR(50) UNIQUE,
    payment_type payment_type NOT NULL,
    status payment_status DEFAULT 'pending',
    
    -- Amounts
    amount DECIMAL(10, 2) NOT NULL,
    fee_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (amount + fee_amount) STORED,
    
    -- Payment Details
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(100),
    external_transaction_id VARCHAR(255),
    
    -- Dates
    due_date DATE NOT NULL,
    paid_date TIMESTAMP WITH TIME ZONE,
    cleared_date TIMESTAMP WITH TIME ZONE,
    
    -- Period covered (for rent payments)
    period_start_date DATE,
    period_end_date DATE,
    
    -- Processing Info
    processor VARCHAR(50),
    processing_fee DECIMAL(10, 2) DEFAULT 0,
    
    -- Refund Info
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Documentation
    notes TEXT,
    receipt_url VARCHAR(500),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_fees_positive CHECK (fee_amount >= 0 AND processing_fee >= 0),
    CONSTRAINT payments_refund_valid CHECK (
        refunded_amount >= 0 AND 
        refunded_amount <= (amount + fee_amount)
    ),
    CONSTRAINT payments_period_valid CHECK (
        (period_start_date IS NULL AND period_end_date IS NULL) OR
        (period_end_date >= period_start_date)
    )
);

CREATE INDEX idx_payments_organization_id ON payments(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_lease_id ON payments(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_status ON payments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_payment_type ON payments(payment_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_due_date ON payments(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_paid_date ON payments(paid_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_period ON payments(period_start_date, period_end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at);

-- ----------------------------------------------------------------------------
-- MAINTENANCE_REQUESTS
-- ----------------------------------------------------------------------------
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    
    -- Request Info
    request_number VARCHAR(50) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category maintenance_category NOT NULL,
    priority maintenance_priority NOT NULL DEFAULT 'normal',
    status maintenance_status DEFAULT 'submitted',
    
    -- Parties Involved
    reported_by_id UUID NOT NULL REFERENCES users(id),
    assigned_to_id UUID REFERENCES users(id),
    
    -- Timestamps (Critical for tracking)
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Response Time Metrics (auto-calculated)
    acknowledgment_time_minutes INTEGER,
    assignment_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    
    -- Access Info
    entry_permission_granted BOOLEAN DEFAULT FALSE,
    preferred_access_date DATE,
    preferred_access_time TIME,
    access_instructions TEXT,
    
    -- Tenant Info
    tenant_phone VARCHAR(20),
    tenant_available BOOLEAN DEFAULT TRUE,
    
    -- Cost Info
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    approved_budget DECIMAL(10, 2),
    
    -- Resolution
    resolution_notes TEXT,
    completion_notes TEXT,
    
    -- Quality Tracking
    tenant_satisfaction_rating INTEGER,
    tenant_feedback TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT maintenance_requests_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT maintenance_requests_description_not_empty CHECK (LENGTH(TRIM(description)) > 0),
    CONSTRAINT maintenance_requests_cost_positive CHECK (
        (estimated_cost IS NULL OR estimated_cost >= 0) AND
        (actual_cost IS NULL OR actual_cost >= 0) AND
        (approved_budget IS NULL OR approved_budget >= 0)
    ),
    CONSTRAINT maintenance_requests_rating_valid CHECK (
        tenant_satisfaction_rating IS NULL OR 
        (tenant_satisfaction_rating BETWEEN 1 AND 5)
    )
);

CREATE INDEX idx_maintenance_requests_organization_id ON maintenance_requests(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_property_id ON maintenance_requests(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_unit_id ON maintenance_requests(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_reported_by_id ON maintenance_requests(reported_by_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_assigned_to_id ON maintenance_requests(assigned_to_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_priority ON maintenance_requests(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_category ON maintenance_requests(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_submitted_at ON maintenance_requests(submitted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_requests_deleted_at ON maintenance_requests(deleted_at);

-- ----------------------------------------------------------------------------
-- DOCUMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Associations (polymorphic - at least one required)
    property_id UUID REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    lease_id UUID REFERENCES leases(id),
    maintenance_request_id UUID REFERENCES maintenance_requests(id),
    violation_id UUID,  -- Forward reference, will add FK later
    inspection_id UUID, -- Forward reference, will add FK later
    
    -- Document Info
    document_type document_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- File Info
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64), -- SHA-256 for deduplication
    
    -- Storage
    storage_provider VARCHAR(50) DEFAULT 'local',
    storage_bucket VARCHAR(255),
    storage_key VARCHAR(500),
    
    -- URL & Access
    url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Media-specific (for photos/videos)
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    
    -- Timestamps (Critical for documentation)
    captured_at TIMESTAMP WITH TIME ZONE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Uploaded by
    uploaded_by_id UUID NOT NULL REFERENCES users(id),
    
    -- Version Control
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT documents_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT documents_file_name_not_empty CHECK (LENGTH(TRIM(file_name)) > 0),
    CONSTRAINT documents_has_association CHECK (
        property_id IS NOT NULL OR 
        unit_id IS NOT NULL OR 
        lease_id IS NOT NULL OR 
        maintenance_request_id IS NOT NULL OR
        violation_id IS NOT NULL OR
        inspection_id IS NOT NULL
    )
);

CREATE INDEX idx_documents_organization_id ON documents(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_property_id ON documents(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_unit_id ON documents(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_lease_id ON documents(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_maintenance_request_id ON documents(maintenance_request_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_violation_id ON documents(violation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_inspection_id ON documents(inspection_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_document_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploaded_by_id ON documents(uploaded_by_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_file_hash ON documents(file_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);

-- ----------------------------------------------------------------------------
-- MESSAGES
-- ----------------------------------------------------------------------------
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Thread Info
    thread_id UUID,
    parent_message_id UUID REFERENCES messages(id),
    
    -- Participants
    sender_id UUID NOT NULL REFERENCES users(id),
    
    -- Message Content
    subject VARCHAR(500),
    body TEXT NOT NULL,
    
    -- Associations (context)
    property_id UUID REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    lease_id UUID REFERENCES leases(id),
    maintenance_request_id UUID REFERENCES maintenance_requests(id),
    
    -- Message Type
    is_system_message BOOLEAN DEFAULT FALSE,
    is_automated BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT messages_body_not_empty CHECK (LENGTH(TRIM(body)) > 0)
);

CREATE INDEX idx_messages_organization_id ON messages(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_thread_id ON messages(thread_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_sender_id ON messages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_property_id ON messages(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_maintenance_request_id ON messages(maintenance_request_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at);

-- ----------------------------------------------------------------------------
-- MESSAGE_RECIPIENTS (for read receipts & delivery tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE message_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id),
    
    -- Status tracking
    status message_status DEFAULT 'sent',
    
    -- Timestamps (Critical for tracking)
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (message_id, recipient_id)
);

CREATE INDEX idx_message_recipients_message_id ON message_recipients(message_id);
CREATE INDEX idx_message_recipients_recipient_id ON message_recipients(recipient_id);
CREATE INDEX idx_message_recipients_status ON message_recipients(status);
CREATE INDEX idx_message_recipients_read_at ON message_recipients(read_at);

-- ----------------------------------------------------------------------------
-- INSPECTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    lease_id UUID REFERENCES leases(id),
    
    -- Inspection Info
    inspection_number VARCHAR(50) UNIQUE,
    inspection_type inspection_type NOT NULL,
    status inspection_status DEFAULT 'scheduled',
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    actual_date DATE,
    actual_time TIME,
    
    -- Parties Involved
    inspector_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID REFERENCES users(id),
    
    -- Inspection Details
    summary TEXT,
    overall_condition VARCHAR(50),
    
    -- Findings
    findings JSONB DEFAULT '[]',
    issues_found BOOLEAN DEFAULT FALSE,
    issues_count INTEGER DEFAULT 0,
    
    -- Financial Impact
    estimated_repair_cost DECIMAL(10, 2),
    tenant_responsible_amount DECIMAL(10, 2),
    
    -- Documentation
    notes TEXT,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Signatures
    inspector_signature_url VARCHAR(500),
    inspector_signed_at TIMESTAMP WITH TIME ZONE,
    tenant_signature_url VARCHAR(500),
    tenant_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT inspections_cost_positive CHECK (
        (estimated_repair_cost IS NULL OR estimated_repair_cost >= 0) AND
        (tenant_responsible_amount IS NULL OR tenant_responsible_amount >= 0)
    )
);

CREATE INDEX idx_inspections_organization_id ON inspections(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_property_id ON inspections(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_unit_id ON inspections(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_lease_id ON inspections(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_tenant_id ON inspections(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_type ON inspections(inspection_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_status ON inspections(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_deleted_at ON inspections(deleted_at);

-- ----------------------------------------------------------------------------
-- VIOLATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    lease_id UUID NOT NULL REFERENCES leases(id),
    tenant_id UUID NOT NULL REFERENCES users(id),
    
    -- Violation Info
    violation_number VARCHAR(50) UNIQUE,
    violation_type violation_type NOT NULL,
    severity violation_severity NOT NULL,
    status violation_status DEFAULT 'reported',
    
    -- Details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Incident Details
    incident_date DATE NOT NULL,
    incident_time TIME,
    location TEXT,
    
    -- Reported By
    reported_by_id UUID NOT NULL REFERENCES users(id),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Escalation Tracking
    warning_count INTEGER DEFAULT 0,
    previous_violation_ids UUID[],
    is_repeat_offense BOOLEAN DEFAULT FALSE,
    
    -- Response
    tenant_acknowledged_at TIMESTAMP WITH TIME ZONE,
    tenant_response TEXT,
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    corrective_action_taken TEXT,
    
    -- Financial Impact
    fine_amount DECIMAL(10, 2) DEFAULT 0,
    fine_paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Legal Escalation
    legal_action_taken BOOLEAN DEFAULT FALSE,
    legal_action_date DATE,
    legal_case_number VARCHAR(100),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT violations_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT violations_description_not_empty CHECK (LENGTH(TRIM(description)) > 0),
    CONSTRAINT violations_fine_positive CHECK (fine_amount >= 0)
);

CREATE INDEX idx_violations_organization_id ON violations(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_property_id ON violations(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_unit_id ON violations(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_lease_id ON violations(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_tenant_id ON violations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_reported_by_id ON violations(reported_by_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_type ON violations(violation_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_severity ON violations(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_status ON violations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_incident_date ON violations(incident_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_violations_deleted_at ON violations(deleted_at);

-- Now add foreign keys for documents that were forward references
ALTER TABLE documents 
    ADD CONSTRAINT fk_documents_violation_id 
    FOREIGN KEY (violation_id) REFERENCES violations(id);

ALTER TABLE documents 
    ADD CONSTRAINT fk_documents_inspection_id 
    FOREIGN KEY (inspection_id) REFERENCES inspections(id);

-- ============================================================================
-- AUDIT TRAIL TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- AUDIT_LOG (Universal audit trail)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- What changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    
    -- Who made the change
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_ip INET,
    
    -- What changed
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- When
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    request_id VARCHAR(100),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_audit_log_organization_id ON audit_log(organization_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- ============================================================================
-- METRICS & TIME-SERIES TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PAYMENT_METRICS (Time-series data for payment tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE payment_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Dimensions
    property_id UUID REFERENCES properties(id),
    unit_id UUID REFERENCES units(id),
    tenant_id UUID REFERENCES users(id),
    
    -- Time
    date DATE NOT NULL,
    month_start DATE NOT NULL,
    
    -- Metrics
    total_due DECIMAL(10, 2) DEFAULT 0,
    total_paid DECIMAL(10, 2) DEFAULT 0,
    total_outstanding DECIMAL(10, 2) DEFAULT 0,
    total_late_fees DECIMAL(10, 2) DEFAULT 0,
    
    -- Counts
    payments_on_time INTEGER DEFAULT 0,
    payments_late INTEGER DEFAULT 0,
    payments_missed INTEGER DEFAULT 0,
    
    -- Averages
    avg_days_to_pay DECIMAL(5, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (organization_id, date, property_id, unit_id, tenant_id)
);

CREATE INDEX idx_payment_metrics_organization_id ON payment_metrics(organization_id);
CREATE INDEX idx_payment_metrics_date ON payment_metrics(date DESC);
CREATE INDEX idx_payment_metrics_month_start ON payment_metrics(month_start DESC);
CREATE INDEX idx_payment_metrics_property_id ON payment_metrics(property_id);
CREATE INDEX idx_payment_metrics_tenant_id ON payment_metrics(tenant_id);

-- Optional: Convert to TimescaleDB hypertable for better performance
-- SELECT create_hypertable('payment_metrics', 'date');

-- ----------------------------------------------------------------------------
-- MAINTENANCE_METRICS (Time-series data for maintenance tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE maintenance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Dimensions
    property_id UUID REFERENCES properties(id),
    category maintenance_category,
    priority maintenance_priority,
    
    -- Time
    date DATE NOT NULL,
    month_start DATE NOT NULL,
    
    -- Counts
    requests_submitted INTEGER DEFAULT 0,
    requests_completed INTEGER DEFAULT 0,
    requests_in_progress INTEGER DEFAULT 0,
    requests_cancelled INTEGER DEFAULT 0,
    
    -- Time Metrics (in minutes)
    avg_acknowledgment_time DECIMAL(10, 2),
    avg_assignment_time DECIMAL(10, 2),
    avg_resolution_time DECIMAL(10, 2),
    
    -- Cost Metrics
    total_estimated_cost DECIMAL(10, 2) DEFAULT 0,
    total_actual_cost DECIMAL(10, 2) DEFAULT 0,
    
    -- Quality Metrics
    avg_satisfaction_rating DECIMAL(3, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (organization_id, date, property_id, category, priority)
);

CREATE INDEX idx_maintenance_metrics_organization_id ON maintenance_metrics(organization_id);
CREATE INDEX idx_maintenance_metrics_date ON maintenance_metrics(date DESC);
CREATE INDEX idx_maintenance_metrics_month_start ON maintenance_metrics(month_start DESC);
CREATE INDEX idx_maintenance_metrics_property_id ON maintenance_metrics(property_id);
CREATE INDEX idx_maintenance_metrics_category ON maintenance_metrics(category);

-- Optional: Convert to TimescaleDB hypertable
-- SELECT create_hypertable('maintenance_metrics', 'date');

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Active Leases View
-- ----------------------------------------------------------------------------
CREATE VIEW active_leases AS
SELECT 
    l.*,
    p.name AS property_name,
    p.address_line1,
    p.city,
    p.state,
    u.unit_number,
    ARRAY_AGG(DISTINCT ut.id) AS tenant_ids,
    ARRAY_AGG(DISTINCT (ut.first_name || ' ' || ut.last_name)) AS tenant_names
FROM leases l
JOIN properties p ON l.property_id = p.id
LEFT JOIN units u ON l.unit_id = u.id
LEFT JOIN lease_tenants lt ON l.id = lt.lease_id AND lt.deleted_at IS NULL
LEFT JOIN users ut ON lt.tenant_id = ut.id AND ut.deleted_at IS NULL
WHERE l.status = 'active'
    AND l.deleted_at IS NULL
    AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
GROUP BY l.id, p.id, u.id;

-- ----------------------------------------------------------------------------
-- Outstanding Payments View
-- ----------------------------------------------------------------------------
CREATE VIEW outstanding_payments AS
SELECT 
    p.*,
    l.lease_number,
    l.property_id,
    l.unit_id,
    u.first_name || ' ' || u.last_name AS tenant_name,
    u.email AS tenant_email,
    CURRENT_DATE - p.due_date AS days_overdue
FROM payments p
JOIN leases l ON p.lease_id = l.id
JOIN users u ON p.tenant_id = u.id
WHERE p.status IN ('pending', 'failed')
    AND p.due_date < CURRENT_DATE
    AND p.deleted_at IS NULL
    AND l.deleted_at IS NULL
    AND u.deleted_at IS NULL
ORDER BY p.due_date ASC;

-- ----------------------------------------------------------------------------
-- Open Maintenance Requests View
-- ----------------------------------------------------------------------------
CREATE VIEW open_maintenance_requests AS
SELECT 
    mr.*,
    p.name AS property_name,
    p.address_line1,
    p.city,
    p.state,
    u.unit_number,
    reporter.first_name || ' ' || reporter.last_name AS reported_by_name,
    reporter.email AS reported_by_email,
    assignee.first_name || ' ' || assignee.last_name AS assigned_to_name,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - mr.submitted_at)) / 60 AS minutes_open
FROM maintenance_requests mr
JOIN properties p ON mr.property_id = p.id
LEFT JOIN units u ON mr.unit_id = u.id
JOIN users reporter ON mr.reported_by_id = reporter.id
LEFT JOIN users assignee ON mr.assigned_to_id = assignee.id
WHERE mr.status NOT IN ('completed', 'cancelled', 'rejected')
    AND mr.deleted_at IS NULL
ORDER BY 
    CASE mr.priority
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    mr.submitted_at ASC;

-- ----------------------------------------------------------------------------
-- Property Occupancy View
-- ----------------------------------------------------------------------------
CREATE VIEW property_occupancy AS
SELECT 
    p.id AS property_id,
    p.name AS property_name,
    p.organization_id,
    COUNT(DISTINCT u.id) AS total_units,
    COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) AS occupied_units,
    COUNT(DISTINCT CASE WHEN u.status = 'available' THEN u.id END) AS available_units,
    COUNT(DISTINCT al.id) AS active_leases,
    COALESCE(
        ROUND(
            COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT u.id), 0) * 100, 
            2
        ), 
        0
    ) AS occupancy_rate
FROM properties p
LEFT JOIN units u ON p.id = u.property_id AND u.deleted_at IS NULL
LEFT JOIN leases al ON p.id = al.property_id 
    AND al.status = 'active' 
    AND al.deleted_at IS NULL
    AND CURRENT_DATE BETWEEN al.start_date AND al.end_date
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Updated_at trigger function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_tenants_updated_at BEFORE UPDATE ON lease_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_recipients_updated_at BEFORE UPDATE ON message_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_violations_updated_at BEFORE UPDATE ON violations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Maintenance Request Metrics Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_maintenance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate acknowledgment time
    IF NEW.acknowledged_at IS NOT NULL AND OLD.acknowledged_at IS NULL THEN
        NEW.acknowledgment_time_minutes = EXTRACT(EPOCH FROM (NEW.acknowledged_at - NEW.submitted_at)) / 60;
    END IF;
    
    -- Calculate assignment time
    IF NEW.assigned_at IS NOT NULL AND OLD.assigned_at IS NULL THEN
        NEW.assignment_time_minutes = EXTRACT(EPOCH FROM (NEW.assigned_at - NEW.submitted_at)) / 60;
    END IF;
    
    -- Calculate resolution time
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        NEW.resolution_time_minutes = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.submitted_at)) / 60;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_maintenance_request_metrics 
    BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION calculate_maintenance_metrics();

-- ----------------------------------------------------------------------------
-- Audit Log Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    audit_org_id UUID;
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
BEGIN
    -- Get organization_id if it exists
    IF TG_OP = 'DELETE' THEN
        IF OLD ? 'organization_id' THEN
            audit_org_id = (OLD->>'organization_id')::UUID;
        END IF;
        old_data = to_jsonb(OLD);
        new_data = NULL;
    ELSE
        IF NEW ? 'organization_id' THEN
            audit_org_id = (NEW->>'organization_id')::UUID;
        END IF;
        new_data = to_jsonb(NEW);
        IF TG_OP = 'UPDATE' THEN
            old_data = to_jsonb(OLD);
            -- Identify changed fields
            SELECT ARRAY_AGG(key) INTO changed_fields
            FROM jsonb_each(new_data)
            WHERE new_data->key IS DISTINCT FROM old_data->key;
        ELSE
            old_data = NULL;
        END IF;
    END IF;
    
    INSERT INTO audit_log (
        organization_id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields
    ) VALUES (
        audit_org_id,
        TG_TABLE_NAME,
        COALESCE((new_data->>'id')::UUID, (old_data->>'id')::UUID),
        TG_OP,
        old_data,
        new_data,
        changed_fields
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_leases AFTER INSERT OR UPDATE OR DELETE ON leases
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_violations AFTER INSERT OR UPDATE OR DELETE ON violations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_maintenance_requests AFTER INSERT OR UPDATE OR DELETE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant root - each organization has isolated data';
COMMENT ON TABLE users IS 'All users in the system - landlords, tenants, contractors, etc.';
COMMENT ON TABLE properties IS 'Physical properties managed by landlords';
COMMENT ON TABLE units IS 'Individual units within multi-unit properties';
COMMENT ON TABLE leases IS 'Rental agreements between landlords and tenants';
COMMENT ON TABLE lease_tenants IS 'Many-to-many relationship between leases and tenants';
COMMENT ON TABLE payments IS 'All payment transactions - rent, deposits, fees, etc.';
COMMENT ON TABLE maintenance_requests IS 'Maintenance and repair requests';
COMMENT ON TABLE documents IS 'All documents, photos, videos, receipts - polymorphic associations';
COMMENT ON TABLE messages IS 'Communication between parties';
COMMENT ON TABLE message_recipients IS 'Track delivery and read status for each message recipient';
COMMENT ON TABLE inspections IS 'Property inspections - move-in, move-out, periodic';
COMMENT ON TABLE violations IS 'Lease violations and incident tracking';
COMMENT ON TABLE audit_log IS 'Complete audit trail of all changes';
COMMENT ON TABLE payment_metrics IS 'Time-series payment tracking for analytics';
COMMENT ON TABLE maintenance_metrics IS 'Time-series maintenance tracking for analytics';

COMMENT ON COLUMN maintenance_requests.acknowledgment_time_minutes IS 'Auto-calculated: time from submission to acknowledgment';
COMMENT ON COLUMN maintenance_requests.assignment_time_minutes IS 'Auto-calculated: time from submission to assignment';
COMMENT ON COLUMN maintenance_requests.resolution_time_minutes IS 'Auto-calculated: time from submission to completion';
COMMENT ON COLUMN documents.file_hash IS 'SHA-256 hash for deduplication and integrity verification';
COMMENT ON COLUMN message_recipients.read_at IS 'Timestamp when message was read - critical for compliance';
COMMENT ON COLUMN violations.is_repeat_offense IS 'Flag for escalation tracking';

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- You can add seed data here or in a separate file

