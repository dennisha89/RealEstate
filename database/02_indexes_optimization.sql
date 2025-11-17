-- ============================================================================
-- INDEX OPTIMIZATION & PERFORMANCE TUNING
-- ============================================================================

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Query: Find all active leases for a property
CREATE INDEX idx_leases_property_active ON leases(property_id, status) 
    WHERE deleted_at IS NULL AND status = 'active';

-- Query: Find all payments for a tenant in a date range
CREATE INDEX idx_payments_tenant_date_range ON payments(tenant_id, due_date DESC) 
    WHERE deleted_at IS NULL;

-- Query: Find all open maintenance requests for a property by priority
CREATE INDEX idx_maintenance_property_priority ON maintenance_requests(property_id, priority, status) 
    WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled');

-- Query: Find all unread messages for a recipient
CREATE INDEX idx_message_recipients_unread ON message_recipients(recipient_id, status) 
    WHERE status IN ('sent', 'delivered');

-- Query: Find recent violations for a tenant
CREATE INDEX idx_violations_tenant_recent ON violations(tenant_id, incident_date DESC) 
    WHERE deleted_at IS NULL;

-- Query: Find documents by type for a property
CREATE INDEX idx_documents_property_type ON documents(property_id, document_type) 
    WHERE deleted_at IS NULL;

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================================

-- Full-text search on property descriptions
CREATE INDEX idx_properties_description_fts ON properties 
    USING GIN (to_tsvector('english', COALESCE(description, '') || ' ' || COALESCE(notes, '')))
    WHERE deleted_at IS NULL;

-- Full-text search on maintenance requests
CREATE INDEX idx_maintenance_requests_fts ON maintenance_requests 
    USING GIN (to_tsvector('english', title || ' ' || description))
    WHERE deleted_at IS NULL;

-- Full-text search on messages
CREATE INDEX idx_messages_fts ON messages 
    USING GIN (to_tsvector('english', COALESCE(subject, '') || ' ' || body))
    WHERE deleted_at IS NULL;

-- Trigram index for fuzzy searching on property names/addresses
CREATE INDEX idx_properties_name_trgm ON properties USING GIN (name gin_trgm_ops);
CREATE INDEX idx_properties_address_trgm ON properties USING GIN (address_line1 gin_trgm_ops);

-- Trigram index for user names
CREATE INDEX idx_users_name_trgm ON users USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);

-- ============================================================================
-- JSONB INDEXES
-- ============================================================================

-- Index on specific JSONB fields (example: property features)
CREATE INDEX idx_properties_features_amenities ON properties 
    USING GIN (features jsonb_path_ops);

-- Index on payment metadata
CREATE INDEX idx_payments_metadata ON payments 
    USING GIN (metadata jsonb_path_ops);

-- Index on maintenance request metadata
CREATE INDEX idx_maintenance_requests_metadata ON maintenance_requests 
    USING GIN (metadata jsonb_path_ops);

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC QUERIES
-- ============================================================================

-- Index for finding expiring leases in the next 30 days
CREATE INDEX idx_leases_expiring_soon ON leases(end_date) 
    WHERE status = 'active' 
        AND deleted_at IS NULL 
        AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

-- Index for overdue payments
CREATE INDEX idx_payments_overdue ON payments(due_date, tenant_id) 
    WHERE status IN ('pending', 'failed') 
        AND due_date < CURRENT_DATE 
        AND deleted_at IS NULL;

-- Index for emergency maintenance requests
CREATE INDEX idx_maintenance_emergency ON maintenance_requests(submitted_at DESC) 
    WHERE priority = 'emergency' 
        AND status NOT IN ('completed', 'cancelled') 
        AND deleted_at IS NULL;

-- Index for unresolved violations
CREATE INDEX idx_violations_unresolved ON violations(severity, incident_date DESC) 
    WHERE status NOT IN ('resolved') 
        AND deleted_at IS NULL;

-- ============================================================================
-- STATISTICS & PERFORMANCE
-- ============================================================================

-- Update statistics for better query planning
ANALYZE organizations;
ANALYZE users;
ANALYZE properties;
ANALYZE units;
ANALYZE leases;
ANALYZE lease_tenants;
ANALYZE payments;
ANALYZE maintenance_requests;
ANALYZE documents;
ANALYZE messages;
ANALYZE message_recipients;
ANALYZE inspections;
ANALYZE violations;

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Query to find unused indexes (run periodically)
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
*/

-- Query to find missing indexes (analyze slow queries)
/*
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
    AND schemaname = 'public'
ORDER BY seq_tup_read DESC
LIMIT 20;
*/

-- Query to find table sizes
/*
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/

-- ============================================================================
-- VACUUM & MAINTENANCE
-- ============================================================================

-- Enable autovacuum (should be on by default, but verify)
-- ALTER TABLE payments SET (autovacuum_enabled = true);
-- ALTER TABLE maintenance_requests SET (autovacuum_enabled = true);
-- ALTER TABLE audit_log SET (autovacuum_enabled = true);

-- For high-write tables, adjust autovacuum settings
ALTER TABLE audit_log SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE payments SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

