-- ============================================================================
-- DATABASE MONITORING & STATISTICS QUERIES
-- ============================================================================
-- Use these queries to monitor database health, performance, and usage

-- ============================================================================
-- DATABASE SIZE & GROWTH
-- ============================================================================

-- Overall database size
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = current_database();

-- Table sizes (top 20)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                   pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC
LIMIT 20;

-- Index sizes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Growth rate (requires historical tracking)
SELECT 
    tablename,
    pg_size_pretty(current_size) AS current_size,
    pg_size_pretty(current_size - COALESCE(previous_size, 0)) AS growth,
    ROUND(
        CASE 
            WHEN COALESCE(previous_size, 0) > 0 
            THEN ((current_size - previous_size)::DECIMAL / previous_size * 100)
            ELSE 0 
        END, 
        2
    ) AS growth_percentage
FROM (
    SELECT 
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) AS current_size,
        NULL::BIGINT AS previous_size  -- Replace with query from historical table
    FROM pg_tables
    WHERE schemaname = 'public'
) AS sizes
ORDER BY growth_percentage DESC
LIMIT 10;

-- ============================================================================
-- QUERY PERFORMANCE
-- ============================================================================

-- Top 20 slowest queries (requires pg_stat_statements extension)
-- Enable with: CREATE EXTENSION pg_stat_statements;
SELECT 
    ROUND(mean_exec_time::NUMERIC, 2) AS avg_ms,
    ROUND(total_exec_time::NUMERIC, 2) AS total_ms,
    calls,
    ROUND((100 * total_exec_time / SUM(total_exec_time) OVER ())::NUMERIC, 2) AS pct_total,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Currently running queries
SELECT 
    pid,
    now() - query_start AS duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
    AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Long-running queries (over 5 minutes)
SELECT 
    pid,
    now() - query_start AS duration,
    state,
    query,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE state = 'active'
    AND now() - query_start > INTERVAL '5 minutes'
    AND query NOT LIKE '%pg_stat_activity%';

-- Queries waiting on locks
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.query AS blocked_query,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.query AS blocking_query,
    now() - blocked_activity.query_start AS blocked_duration
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================================================
-- INDEX USAGE & HEALTH
-- ============================================================================

-- Unused indexes (never scanned)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND schemaname = 'public'
    AND indexrelid IS NOT NULL
ORDER BY pg_relation_size(indexrelid) DESC;

-- Index hit rate (should be > 99%)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_tup_read > 0 
        THEN ROUND((idx_tup_fetch::DECIMAL / idx_tup_read * 100), 2)
        ELSE 0 
    END AS hit_rate_pct
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- Tables with sequential scans (may need indexes)
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    CASE 
        WHEN seq_scan > 0 
        THEN ROUND((seq_tup_read::DECIMAL / seq_scan), 0)
        ELSE 0 
    END AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
    AND schemaname = 'public'
ORDER BY seq_tup_read DESC
LIMIT 20;

-- Cache hit ratio (should be > 99%)
SELECT 
    schemaname,
    tablename,
    heap_blks_read,
    heap_blks_hit,
    CASE 
        WHEN (heap_blks_hit + heap_blks_read) > 0 
        THEN ROUND((heap_blks_hit::DECIMAL / (heap_blks_hit + heap_blks_read) * 100), 2)
        ELSE 0 
    END AS cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public'
    AND (heap_blks_hit + heap_blks_read) > 0
ORDER BY cache_hit_ratio ASC
LIMIT 20;

-- ============================================================================
-- TABLE STATISTICS
-- ============================================================================

-- Row counts for all tables
SELECT 
    schemaname,
    tablename,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    ROUND((n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0) * 100), 2) AS dead_row_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Tables needing vacuum (dead row percentage > 10%)
SELECT 
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    ROUND((n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0) * 100), 2) AS dead_row_pct,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_dead_tup > 0
    AND (n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0) * 100) > 10
ORDER BY dead_row_pct DESC;

-- Table bloat estimate
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    ROUND((n_dead_tup::DECIMAL / NULLIF(n_live_tup + n_dead_tup, 0) * 100), 2) AS bloat_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC
LIMIT 20;

-- ============================================================================
-- CONNECTION & ACTIVITY
-- ============================================================================

-- Current connections by state
SELECT 
    state,
    COUNT(*) AS connection_count
FROM pg_stat_activity
GROUP BY state
ORDER BY connection_count DESC;

-- Connections by database
SELECT 
    datname,
    COUNT(*) AS connection_count,
    MAX(now() - query_start) AS longest_query
FROM pg_stat_activity
GROUP BY datname
ORDER BY connection_count DESC;

-- Connections by user
SELECT 
    usename,
    COUNT(*) AS connection_count,
    COUNT(CASE WHEN state = 'active' THEN 1 END) AS active,
    COUNT(CASE WHEN state = 'idle' THEN 1 END) AS idle
FROM pg_stat_activity
GROUP BY usename
ORDER BY connection_count DESC;

-- Idle in transaction (potential problems)
SELECT 
    pid,
    now() - query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
    AND now() - query_start > INTERVAL '5 minutes';

-- ============================================================================
-- REPLICATION (if applicable)
-- ============================================================================

-- Replication lag
SELECT 
    client_addr,
    state,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)) AS sending_lag,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn)) AS write_lag,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) AS flush_lag,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replay_lag
FROM pg_stat_replication;

-- ============================================================================
-- LOCKS
-- ============================================================================

-- Current locks
SELECT 
    locktype,
    database,
    relation::regclass AS table,
    mode,
    COUNT(*) AS lock_count
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY locktype, database, relation, mode
ORDER BY lock_count DESC;

-- Blocking queries
SELECT 
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocker.pid AS blocker_pid,
    blocker.query AS blocker_query
FROM pg_stat_activity blocked
JOIN pg_locks blocked_lock ON blocked.pid = blocked_lock.pid
JOIN pg_locks blocker_lock ON blocker_lock.locktype = blocked_lock.locktype
    AND blocker_lock.database = blocked_lock.database
    AND blocker_lock.relation = blocked_lock.relation
    AND blocker_lock.pid != blocked_lock.pid
JOIN pg_stat_activity blocker ON blocker.pid = blocker_lock.pid
WHERE NOT blocked_lock.granted
    AND blocker_lock.granted;

-- ============================================================================
-- APPLICATION-SPECIFIC METRICS
-- ============================================================================

-- Organizations by size (data volume)
SELECT 
    o.name,
    o.slug,
    COUNT(DISTINCT p.id) AS properties,
    COUNT(DISTINCT u.id) AS units,
    COUNT(DISTINCT l.id) AS leases,
    COUNT(DISTINCT pay.id) AS payments,
    COUNT(DISTINCT mr.id) AS maintenance_requests
FROM organizations o
LEFT JOIN properties p ON o.id = p.organization_id AND p.deleted_at IS NULL
LEFT JOIN units u ON p.id = u.property_id AND u.deleted_at IS NULL
LEFT JOIN leases l ON p.id = l.property_id AND l.deleted_at IS NULL
LEFT JOIN payments pay ON l.id = pay.lease_id AND pay.deleted_at IS NULL
LEFT JOIN maintenance_requests mr ON p.id = mr.property_id AND mr.deleted_at IS NULL
WHERE o.deleted_at IS NULL
GROUP BY o.id
ORDER BY properties DESC;

-- Daily activity metrics (last 30 days)
SELECT 
    date_trunc('day', created_at) AS day,
    COUNT(CASE WHEN table_name = 'payments' THEN 1 END) AS new_payments,
    COUNT(CASE WHEN table_name = 'maintenance_requests' THEN 1 END) AS new_maintenance,
    COUNT(CASE WHEN table_name = 'leases' THEN 1 END) AS new_leases,
    COUNT(CASE WHEN table_name = 'violations' THEN 1 END) AS new_violations
FROM audit_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND action = 'INSERT'
GROUP BY day
ORDER BY day DESC;

-- Soft-deleted records by table
SELECT 
    'users' AS table_name,
    COUNT(*) AS deleted_count,
    MAX(deleted_at) AS last_deleted
FROM users WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'properties', COUNT(*), MAX(deleted_at) FROM properties WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'units', COUNT(*), MAX(deleted_at) FROM units WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'leases', COUNT(*), MAX(deleted_at) FROM leases WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'payments', COUNT(*), MAX(deleted_at) FROM payments WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'maintenance_requests', COUNT(*), MAX(deleted_at) FROM maintenance_requests WHERE deleted_at IS NOT NULL
ORDER BY deleted_count DESC;

-- Payment status distribution
SELECT 
    status,
    COUNT(*) AS count,
    SUM(total_amount) AS total_amount,
    pg_size_pretty(SUM(total_amount)::BIGINT) AS formatted_amount
FROM payments
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY count DESC;

-- Maintenance request response times
SELECT 
    priority,
    COUNT(*) AS total_requests,
    ROUND(AVG(acknowledgment_time_minutes), 2) AS avg_ack_minutes,
    ROUND(AVG(resolution_time_minutes), 2) AS avg_resolution_minutes,
    ROUND(AVG(tenant_satisfaction_rating), 2) AS avg_satisfaction
FROM maintenance_requests
WHERE status = 'completed'
    AND completed_at >= CURRENT_DATE - INTERVAL '90 days'
    AND deleted_at IS NULL
GROUP BY priority
ORDER BY 
    CASE priority
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END;

-- ============================================================================
-- HEALTH CHECKS
-- ============================================================================

-- Database health summary
SELECT 
    'Database Size' AS metric,
    pg_size_pretty(pg_database_size(current_database())) AS value
UNION ALL
SELECT 
    'Total Tables',
    COUNT(*)::TEXT
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Total Indexes',
    COUNT(*)::TEXT
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Active Connections',
    COUNT(*)::TEXT
FROM pg_stat_activity
WHERE state = 'active'
UNION ALL
SELECT 
    'Total Connections',
    COUNT(*)::TEXT
FROM pg_stat_activity
UNION ALL
SELECT 
    'Cache Hit Ratio',
    ROUND(
        SUM(heap_blks_hit)::DECIMAL / 
        NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0) * 100, 
        2
    )::TEXT || '%'
FROM pg_statio_user_tables;

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================

-- Tables that might benefit from VACUUM FULL
SELECT 
    'Consider VACUUM FULL on ' || tablename AS recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_dead_tup > 10000
    AND (n_dead_tup::DECIMAL / NULLIF(n_live_tup, 0) * 100) > 20
ORDER BY n_dead_tup DESC;

-- Indexes that might be redundant or unused
SELECT 
    'Consider dropping unused index: ' || indexname AS recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND pg_relation_size(indexrelid) > 1024 * 1024  -- Larger than 1MB
ORDER BY pg_relation_size(indexrelid) DESC;

-- Tables missing indexes (high seq scans with low index scans)
SELECT 
    'Consider adding index to: ' || tablename AS recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND seq_scan > 1000
    AND idx_scan < seq_scan / 10
ORDER BY seq_scan DESC;

-- ============================================================================
-- EXPORT FOR MONITORING TOOLS
-- ============================================================================

-- JSON export for monitoring dashboards
SELECT json_build_object(
    'timestamp', now(),
    'database_size_bytes', pg_database_size(current_database()),
    'table_count', (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'),
    'active_connections', (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'),
    'cache_hit_ratio', (
        SELECT ROUND(
            SUM(heap_blks_hit)::DECIMAL / 
            NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0) * 100, 
            2
        )
        FROM pg_statio_user_tables
    ),
    'largest_table', (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
        LIMIT 1
    ),
    'slow_queries', (
        SELECT COUNT(*) 
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND now() - query_start > INTERVAL '1 minute'
    )
) AS metrics;

-- ============================================================================
-- SCHEDULED MAINTENANCE COMMANDS
-- ============================================================================

-- Run these commands periodically (via cron or scheduled jobs)

-- Update statistics (run daily)
-- ANALYZE VERBOSE;

-- Vacuum specific tables (run weekly)
-- VACUUM ANALYZE payments;
-- VACUUM ANALYZE maintenance_requests;
-- VACUUM ANALYZE audit_log;

-- Reindex (run monthly on specific tables if needed)
-- REINDEX TABLE payments;

-- Clean up old audit logs (if retention policy exists)
-- DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '2 years';
