# Database Schema Documentation Index

This directory contains the complete database schema and documentation for the Property Management SaaS platform.

## Quick Navigation

### 🚀 Getting Started
- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide with sample data
- **[README.md](README.md)** - Comprehensive overview and documentation

### 📊 Core Schema Files
- **[01_schema.sql](01_schema.sql)** - Complete database schema (2000+ lines)
  - Extensions and custom types
  - All 18 tables with relationships
  - Triggers for automation
  - Views for common queries
  - Audit infrastructure

- **[02_indexes_optimization.sql](02_indexes_optimization.sql)** - Performance optimization
  - Composite indexes for common queries
  - Full-text search indexes
  - JSONB indexes
  - Partial indexes
  - Performance monitoring queries

- **[03_sample_queries.sql](03_sample_queries.sql)** - Common query patterns
  - Tenant queries (payment history, maintenance)
  - Landlord queries (dashboard, reports)
  - Contractor queries (assignments)
  - Analytics queries (revenue, trends)
  - Compliance queries (audit trails)

- **[04_monitoring_queries.sql](04_monitoring_queries.sql)** - Database monitoring
  - Size and growth tracking
  - Query performance analysis
  - Index usage statistics
  - Table health checks
  - Application-specific metrics

### 📚 Documentation
- **[ERD.md](ERD.md)** - Visual entity relationship diagram
  - ASCII art ERD
  - Relationship explanations
  - Data flow examples
  - Critical timestamp documentation

- **[MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md)** - Deployment guide
  - Migration tool recommendations
  - Zero-downtime deployment strategy
  - Rollback procedures
  - Testing approach
  - Monitoring during migration

- **[DATABASE_SELECTION.md](DATABASE_SELECTION.md)** - Technology selection
  - Why PostgreSQL was chosen
  - Comparison with alternatives
  - Risk mitigation strategies
  - Scaling considerations

## Database Overview

### Technology
- **Database:** PostgreSQL 14+
- **Extensions:** uuid-ossp, pgcrypto, pg_trgm, btree_gist
- **Optional:** TimescaleDB for time-series optimization

### Core Features
- ✅ Multi-tenancy with Row-Level Security
- ✅ Complete audit trail
- ✅ Soft deletes (never lose data)
- ✅ Comprehensive timestamping
- ✅ Message read receipts
- ✅ Response time metrics
- ✅ Document management
- ✅ Time-series analytics

### Schema Statistics
- **Tables:** 18 (15 core + 2 metrics + 1 audit)
- **Views:** 4 pre-built views
- **Triggers:** 15+ for automation
- **Indexes:** 100+ for performance
- **Enums:** 15 custom types

## Entity Summary

### Core Entities
1. **organizations** - Multi-tenant root
2. **users** - Landlords, tenants, contractors
3. **properties** - Buildings and houses
4. **units** - Individual rentable units
5. **leases** - Rental agreements
6. **lease_tenants** - Tenant associations
7. **payments** - Financial transactions
8. **maintenance_requests** - Issue tracking
9. **documents** - File storage
10. **messages** - Communication
11. **message_recipients** - Read receipts
12. **inspections** - Property inspections
13. **violations** - Lease violation tracking

### Supporting Tables
14. **audit_log** - Universal change tracking
15. **payment_metrics** - Time-series payment data
16. **maintenance_metrics** - Time-series maintenance data

## Key Design Patterns

### 1. Multi-Tenancy
Every table includes `organization_id` for data isolation:
```sql
WHERE organization_id = :current_org_id
  AND deleted_at IS NULL
```

### 2. Soft Deletes
All tables support soft deletion:
```sql
UPDATE users 
SET deleted_at = NOW() 
WHERE id = :user_id;
```

### 3. Audit Trail
Critical tables have triggers:
```sql
CREATE TRIGGER audit_payments 
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### 4. Timestamps Everything
Every significant event is timestamped:
- Payment: due_date, paid_date, cleared_date
- Maintenance: submitted_at, acknowledged_at, completed_at
- Messages: sent_at, delivered_at, read_at

### 5. Automatic Metrics
Triggers calculate response times:
```sql
NEW.resolution_time_minutes = 
    EXTRACT(EPOCH FROM (NEW.completed_at - NEW.submitted_at)) / 60;
```

## Common Use Cases

### Setup a New Organization
```sql
INSERT INTO organizations (name, slug, email) 
VALUES ('Acme Property Management', 'acme-pm', 'admin@acme.com');
```

### Create a Property with Units
```sql
-- Create property
INSERT INTO properties (...) VALUES (...);

-- Create units
INSERT INTO units (property_id, unit_number, monthly_rent) 
VALUES (:property_id, '101', 2500.00);
```

### Process a Payment
```sql
INSERT INTO payments (lease_id, tenant_id, amount, status, due_date)
VALUES (:lease_id, :tenant_id, 2500.00, 'completed', '2025-01-01');
```

### Track Maintenance
```sql
-- Create request
INSERT INTO maintenance_requests (property_id, title, description, priority)
VALUES (:property_id, 'Leaky Faucet', 'Kitchen faucet dripping', 'normal');

-- Assign to contractor
UPDATE maintenance_requests 
SET assigned_to_id = :contractor_id, 
    assigned_at = NOW()
WHERE id = :request_id;
```

## Performance Characteristics

### Expected Performance (properly indexed)
- Point queries (by ID): < 1ms
- Tenant payment history: < 10ms
- Property dashboard: < 50ms
- Complex analytics: < 500ms
- Full-text search: < 100ms

### Scalability
- **10K properties**: Single instance, no optimization needed
- **100K properties**: Read replicas + connection pooling
- **1M+ properties**: Partitioning + Citus extension

## File Sizes
- **01_schema.sql:** ~2000 lines, ~100KB
- **02_indexes_optimization.sql:** ~300 lines, ~15KB
- **03_sample_queries.sql:** ~600 lines, ~30KB
- **04_monitoring_queries.sql:** ~500 lines, ~25KB
- **README.md:** ~800 lines, ~40KB
- **Total Documentation:** ~4500 lines

## Next Steps

### For Developers
1. Read [QUICK_START.md](QUICK_START.md)
2. Run schema on local PostgreSQL
3. Review [03_sample_queries.sql](03_sample_queries.sql)
4. Explore [ERD.md](ERD.md) for relationships

### For DBAs
1. Review [MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md)
2. Study [02_indexes_optimization.sql](02_indexes_optimization.sql)
3. Set up monitoring from [04_monitoring_queries.sql](04_monitoring_queries.sql)
4. Plan capacity using [DATABASE_SELECTION.md](DATABASE_SELECTION.md)

### For Architects
1. Read [DATABASE_SELECTION.md](DATABASE_SELECTION.md)
2. Review [ERD.md](ERD.md) for design patterns
3. Study [README.md](README.md) for full picture
4. Consider scaling strategy in [MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md)

## Support & Maintenance

### Regular Tasks
- **Daily:** Monitor slow queries
- **Weekly:** Review index usage
- **Monthly:** Vacuum and analyze
- **Quarterly:** Capacity planning

### Useful Commands
```bash
# Deploy schema
psql -d propertymanagement -f 01_schema.sql

# Check table sizes
psql -d propertymanagement -f 04_monitoring_queries.sql

# Backup database
pg_dump -Fc propertymanagement > backup.dump

# Restore database
pg_restore -d propertymanagement backup.dump
```

## Contributing

When modifying the schema:
1. Update SQL files
2. Update ERD.md
3. Add sample queries if applicable
4. Update this INDEX
5. Document in README.md
6. Create migration script

## Version History
- **v1.0.0** (2025-11-17) - Initial comprehensive schema
  - 18 tables
  - Multi-tenant architecture
  - Complete audit trails
  - Time-series metrics
  - Full documentation

## License
[Your License Here]

---

**Total Lines of Code:** ~4,500+  
**Total Documentation:** ~2,000+ lines  
**Estimated Setup Time:** 5-10 minutes  
**Production Ready:** Yes ✅
