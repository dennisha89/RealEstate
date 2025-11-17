# Property Management SaaS - Database Schema

## Overview

This directory contains the complete database schema for a comprehensive Property Management SaaS platform built on PostgreSQL 14+.

## Features

- **Multi-tenancy**: Full data isolation per organization
- **Audit Trail**: Complete change tracking for compliance
- **Soft Deletes**: Never lose data, everything is recoverable
- **Time-series Metrics**: Built-in analytics and reporting
- **Comprehensive Timestamping**: Critical for legal compliance
- **Read Receipts**: Message delivery and read tracking
- **Response Time Metrics**: Automatic SLA tracking
- **Document Management**: Photos, videos, receipts with timestamps
- **Scalable**: Optimized for 100K+ properties

## Database Technology: PostgreSQL

### Why PostgreSQL?

1. **ACID Compliance**: Essential for financial transactions
2. **Row-Level Security**: Perfect for multi-tenant isolation
3. **JSONB Support**: Flexible metadata without schema changes
4. **Advanced Indexing**: GiST, GIN, partial indexes for performance
5. **Full-Text Search**: Built-in search capabilities
6. **TimescaleDB Compatible**: Easy upgrade path for time-series data
7. **Proven Scalability**: Battle-tested for large datasets
8. **Rich Ecosystem**: Excellent tooling and extensions

## Schema Files

### Core Files

1. **01_schema.sql** - Complete database schema
   - All tables with constraints
   - Enums and custom types
   - Foreign keys and relationships
   - Basic indexes
   - Triggers and views
   - Audit infrastructure

2. **02_indexes_optimization.sql** - Performance optimization
   - Composite indexes for common queries
   - Full-text search indexes
   - JSONB indexes
   - Partial indexes for hot queries
   - Performance monitoring queries

3. **03_sample_queries.sql** - Common query patterns
   - Tenant queries (payment history, maintenance requests)
   - Landlord queries (dashboard, reports, analytics)
   - Contractor queries (assignments, performance)
   - Analytics queries (revenue, occupancy, trends)
   - Compliance queries (audit trails, communications)

4. **MIGRATION_STRATEGY.md** - Deployment guide
   - Migration tool recommendations
   - Zero-downtime deployment strategy
   - Rollback procedures
   - Testing approach
   - Monitoring guidelines

## Entity Relationship Overview

```
Organizations (Multi-tenant root)
    ├── Users (Landlords, Tenants, Contractors)
    ├── Properties
    │   └── Units (for multi-unit properties)
    │       └── Leases
    │           ├── Lease_Tenants (M:M with Users)
    │           ├── Payments
    │           ├── Inspections
    │           └── Violations
    ├── Maintenance_Requests
    │   └── Documents (polymorphic)
    ├── Messages
    │   └── Message_Recipients (read receipts)
    └── Audit_Log (universal change tracking)
```

## Core Entities

### 1. Organizations
- Multi-tenancy root entity
- Each organization's data is completely isolated
- Supports different subscription tiers

### 2. Users
- Unified user table for all roles
- Roles: landlord, tenant, contractor, property_manager, admin
- Email and phone verification
- Emergency contact information
- Security features (failed login tracking, account locking)

### 3. Properties & Units
- **Properties**: Buildings/houses
- **Units**: Individual rentable units within properties
- Support for single-family and multi-family properties
- Geolocation support for mapping
- Financial tracking (purchase price, market value, taxes)
- Amenities and features stored as JSONB

### 4. Leases
- Rental agreements between landlords and tenants
- Support for multiple tenants per lease
- Auto-renewal capability
- Comprehensive terms and conditions
- Payment terms and late fee policies

### 5. Payments
- All financial transactions (rent, deposits, fees)
- Complete audit trail with timestamps
- Support for multiple payment methods
- Refund tracking
- Period tracking for rent payments

### 6. Maintenance Requests
- Issue reporting and tracking
- Priority levels (emergency, urgent, normal, low)
- Category classification
- **Response time metrics** (auto-calculated)
  - Acknowledgment time
  - Assignment time
  - Resolution time
- Cost tracking (estimated vs actual)
- Tenant satisfaction ratings

### 7. Documents
- Universal document storage
- Polymorphic associations (can link to any entity)
- Types: leases, photos, videos, receipts, inspections
- **Critical timestamps**: captured_at, uploaded_at
- File hash for deduplication
- Version control support

### 8. Messages & Message Recipients
- Communication platform between parties
- Thread support for conversations
- **Read receipts**: delivered_at, read_at timestamps
- Context linking (property, lease, maintenance request)
- System and automated message support

### 9. Inspections
- Move-in, move-out, periodic inspections
- JSONB findings for flexibility
- Digital signatures
- Financial impact tracking
- Photo/video documentation

### 10. Violations
- Lease violation tracking
- Severity levels (minor, moderate, serious, critical)
- **Escalation tracking**: warning count, repeat offenses
- Fine management
- Legal action tracking
- Resolution workflow

### 11. Audit Log
- Universal change tracking
- Records: who, what, when, from where
- Stores old and new values
- Changed fields identification
- Critical for compliance and dispute resolution

### 12. Metrics Tables
- **Payment Metrics**: Time-series payment tracking
- **Maintenance Metrics**: Response time analytics
- Supports TimescaleDB for better performance
- Pre-aggregated data for fast reporting

## Key Design Decisions

### 1. Multi-Tenancy Architecture
**Row-Level Security (RLS)** approach:
- All tables have `organization_id`
- RLS policies enforce data isolation
- Application sets session variable
- No risk of cross-tenant data leakage

### 2. Soft Deletes
- All tables have `deleted_at` timestamp
- Never physically delete data
- Queries use `WHERE deleted_at IS NULL`
- Critical for audit trails and legal compliance

### 3. Audit Trail Strategy
- Universal `audit_log` table
- Triggers on critical tables
- Captures old and new values as JSONB
- Includes user, IP, and timestamp information

### 4. Timestamp Everything
- All transactions have timestamps
- Message read receipts tracked
- Document capture time vs upload time
- Maintenance request lifecycle timestamps
- Critical for legal disputes

### 5. Response Time Metrics
- Auto-calculated in maintenance_requests
- Triggers update metrics on status changes
- Enables SLA monitoring
- Performance tracking for contractors

### 6. Flexible Metadata
- JSONB fields for extensibility
- No schema changes for new attributes
- Indexed for performance
- Supports complex filtering

### 7. Polymorphic Documents
- Single documents table
- Can associate with any entity
- Reduces duplication
- Simplified management

## Index Strategy

### Primary Indexes
- All foreign keys indexed
- Status fields indexed
- Date fields indexed (for range queries)
- Soft delete fields included

### Composite Indexes
- Common query patterns optimized
- Example: `(tenant_id, due_date)` for payment queries

### Partial Indexes
- Only index relevant rows
- Example: Only active leases
- Significant space savings

### Full-Text Search
- GIN indexes on text content
- Trigram indexes for fuzzy search
- Fast search without external tools

## Performance Optimization

### For 100K+ Properties

1. **Partitioning** (future enhancement)
   ```sql
   -- Partition payments by date
   CREATE TABLE payments_2025_01 PARTITION OF payments
   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
   ```

2. **Connection Pooling**
   - Use PgBouncer or similar
   - Recommended: 100-200 connections

3. **Read Replicas**
   - Reports run on replicas
   - Write operations on primary
   - Reduces primary database load

4. **TimescaleDB Extension**
   - Convert metrics tables to hypertables
   - Better performance for time-series queries
   - Automatic data retention policies

5. **Caching**
   - Redis for session data
   - Cache frequent queries
   - Invalidate on writes

## Security Considerations

### 1. Row-Level Security
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
    FOR ALL
    TO application_user
    USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

### 2. Password Storage
- Never store plain text passwords
- Use `pgcrypto` extension
- Application should handle hashing (bcrypt/argon2)

### 3. SQL Injection Prevention
- Always use parameterized queries
- Never concatenate user input
- Validate input at application layer

### 4. Encryption at Rest
- Enable PostgreSQL encryption
- Encrypt backups
- Secure key management

### 5. Network Security
- SSL/TLS for all connections
- Firewall rules restricting access
- VPN for administrative access

## Common Query Patterns

### Get Tenant Payment History
```sql
SELECT * FROM payments 
WHERE tenant_id = ? 
  AND deleted_at IS NULL 
ORDER BY due_date DESC;
```

### Get Active Leases for Property
```sql
SELECT * FROM leases 
WHERE property_id = ? 
  AND status = 'active' 
  AND CURRENT_DATE BETWEEN start_date AND end_date
  AND deleted_at IS NULL;
```

### Get Open Maintenance Requests
```sql
SELECT * FROM maintenance_requests 
WHERE property_id = ? 
  AND status NOT IN ('completed', 'cancelled')
  AND deleted_at IS NULL
ORDER BY priority, submitted_at;
```

See **03_sample_queries.sql** for comprehensive examples.

## Deployment

### Initial Setup

1. **Install PostgreSQL 14+**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-14
   
   # macOS
   brew install postgresql@14
   ```

2. **Install Extensions**
   ```bash
   sudo apt-get install postgresql-contrib
   ```

3. **Create Database**
   ```bash
   createdb propertymanagement
   ```

4. **Run Schema**
   ```bash
   psql -d propertymanagement -f 01_schema.sql
   psql -d propertymanagement -f 02_indexes_optimization.sql
   ```

### Production Deployment

See **MIGRATION_STRATEGY.md** for detailed deployment guide.

## Backup Strategy

### Daily Full Backup
```bash
pg_dump -Fc propertymanagement > backup_$(date +%Y%m%d).dump
```

### Continuous WAL Archiving
```conf
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

### Point-in-Time Recovery
```bash
pg_basebackup -D /backup/pitr -Fp -Xs -P
```

## Monitoring

### Key Metrics to Monitor

1. **Connection count**
2. **Query performance** (slow query log)
3. **Table bloat**
4. **Index usage**
5. **Cache hit ratio**
6. **Replication lag** (if using replicas)
7. **Disk space**

### Recommended Tools

- **pgAdmin**: GUI administration
- **pg_stat_statements**: Query performance
- **pgBadger**: Log analyzer
- **Datadog/New Relic**: APM monitoring
- **Grafana**: Custom dashboards

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review slow query log
   - Check for unused indexes
   - Monitor table sizes

2. **Monthly**
   - Update statistics (ANALYZE)
   - Review and optimize queries
   - Clean up old audit logs

3. **Quarterly**
   - Review and update indexes
   - Performance testing
   - Capacity planning

## Scaling Considerations

### Horizontal Scaling
- Read replicas for reporting
- Connection pooling
- Application-level sharding by organization

### Vertical Scaling
- Increase CPU/RAM as needed
- SSD/NVMe for storage
- Dedicated IOPS for large deployments

### Citus Extension (future)
- Distributed PostgreSQL
- Shard by organization_id
- Maintains PostgreSQL compatibility

## Compliance Features

### Legal Requirements Supported

1. **Audit Trail**: Complete change history
2. **Timestamping**: All events timestamped
3. **Read Receipts**: Communication tracking
4. **Document Retention**: Never delete documents
5. **Response Time Tracking**: SLA compliance
6. **Data Isolation**: Multi-tenant security

### GDPR Compliance

- User data export capability
- Right to deletion (soft delete with anonymization)
- Audit log retention policies
- Data processing documentation

## Testing

### Unit Tests
Test individual queries and constraints

### Integration Tests
Test full workflows (create lease → payment → maintenance)

### Performance Tests
- Load test with production-like data
- Query performance benchmarks
- Concurrent user simulation

### Data Integrity Tests
- Foreign key constraints
- Check constraints
- Trigger functionality

## Troubleshooting

### Slow Queries
1. Check `pg_stat_statements`
2. Run EXPLAIN ANALYZE
3. Add missing indexes
4. Update statistics

### High CPU Usage
1. Identify long-running queries
2. Check for missing indexes
3. Review autovacuum settings
4. Consider connection pooling

### Disk Space Issues
1. Check table bloat
2. Run VACUUM FULL
3. Archive old audit logs
4. Implement data retention policies

## Future Enhancements

1. **TimescaleDB Integration**: Better time-series performance
2. **Full-Text Search Enhancement**: More sophisticated search
3. **Partitioning**: For very large tables
4. **Materialized Views**: Pre-computed reports
5. **Event Sourcing**: Complete state reconstruction
6. **GraphQL API**: Flexible query interface

## Contributing

When adding new tables or fields:
1. Update schema files
2. Create migration scripts
3. Add indexes for new foreign keys
4. Update sample queries
5. Document in README
6. Add to audit triggers if sensitive

## Support

For questions or issues:
1. Check sample queries
2. Review migration strategy
3. Consult PostgreSQL documentation
4. Check performance monitoring queries

## License

[Your License Here]

## Version History

- **v1.0.0** (2025-11-17): Initial schema design
  - Complete multi-tenant architecture
  - All core entities implemented
  - Audit trail and metrics
  - Comprehensive indexing strategy
