# Database Migration Strategy

## Overview
This document outlines the migration strategy for deploying the Property Management SaaS database schema to production environments.

## Recommended Migration Tools

### Option 1: Flyway (Recommended for Java/Enterprise)
- Version-based migrations
- Automatic checksums
- Rollback support
- Excellent for CI/CD pipelines

### Option 2: Liquibase
- Database-agnostic
- XML/YAML/SQL formats
- Robust rollback capabilities
- Change tracking

### Option 3: Alembic (Python)
- Python-based migrations
- Auto-generation from SQLAlchemy models
- Branch merging support

### Option 4: node-pg-migrate (Node.js)
- Simple programmatic migrations
- TypeScript support
- Automatic rollback generation

### Option 5: dbmate (Go)
- Simple and fast
- Database URL-based configuration
- Multiple database support

## Migration File Structure

```
database/
├── migrations/
│   ├── V001__initial_schema.sql
│   ├── V002__audit_triggers.sql
│   ├── V003__indexes.sql
│   ├── V004__views.sql
│   ├── V005__metrics_tables.sql
│   └── ...
├── rollback/
│   ├── R001__rollback_initial.sql
│   ├── R002__rollback_audit.sql
│   └── ...
├── seeds/
│   ├── S001__dev_organizations.sql
│   ├── S002__dev_users.sql
│   └── ...
└── README.md
```

## Environment-Specific Considerations

### Development Environment
- Use smaller indexes
- Skip some optimizations
- Include seed data
- Enable query logging

### Staging Environment
- Full schema with all indexes
- Use production-like data volumes
- Enable slow query logging

### Production Environment
- Full schema with all optimizations
- Enable connection pooling
- Configure autovacuum aggressively

## Zero-Downtime Migration Strategy

### Phase 1: Preparation (Week -2)
1. **Backup**: Create full database backup
2. **Analysis**: Run EXPLAIN ANALYZE on critical queries
3. **Benchmark**: Record current performance metrics
4. **Test**: Run migrations on staging with production data copy

### Phase 2: Pre-Migration (Week -1)
1. **Notify**: Inform users of upcoming maintenance window
2. **Review**: Final review of migration scripts
3. **Validation**: Ensure rollback scripts are ready
4. **Monitoring**: Set up enhanced monitoring

### Phase 3: Migration (Maintenance Window)
1. Enable maintenance mode
2. Take final backup
3. Run migrations
4. Verify schema
5. Run smoke tests
6. Disable maintenance mode

### Phase 4: Validation (Day 1)
1. **Monitor**: Watch for errors in logs
2. **Verify**: Check data integrity
3. **Performance**: Compare query performance
4. **User Testing**: Conduct user acceptance testing

### Phase 5: Post-Migration (Week 1)
1. **Optimize**: Adjust indexes based on query patterns
2. **Tune**: Fine-tune database parameters
3. **Document**: Update documentation with any changes
4. **Cleanup**: Remove old backup files after verification

## Rollback Strategy

### Immediate Rollback (< 1 hour)
If migration fails immediately, restore from backup taken immediately before migration.

### Delayed Rollback (> 1 hour, < 24 hours)
If issues discovered after migration:
1. Stop application
2. Restore from backup
3. Replay transaction logs up to issue point
4. Verify data integrity

### Data Migration Rollback (> 24 hours)
If schema is good but data migration had issues:
1. Run data-only rollback scripts
2. Keep schema changes
3. Fix data issues
4. Re-run data migration

## Performance Considerations

### During Migration
- Disable triggers temporarily for bulk operations
- Create indexes CONCURRENTLY to avoid locks
- Batch large updates into smaller chunks
- Monitor long-running queries

### After Migration
- Update statistics with ANALYZE
- Vacuum tables if needed
- Reindex if necessary
- Verify query performance

## Multi-Tenant Considerations

### Data Isolation
- Enable Row Level Security on all tables
- Create policies for tenant isolation
- Use connection pooling per tenant
- Implement organization_id filtering at application level

### Tenant-Specific Migrations
- Support for tenant-specific customizations
- Schema versioning per tenant
- Isolated rollback capabilities

## Disaster Recovery

### Backup Strategy
- Full backup daily
- Incremental backup via WAL archiving
- Point-in-time recovery capability
- Offsite backup replication

### Recovery Procedure
1. Stop PostgreSQL
2. Restore base backup
3. Configure recovery target
4. Apply WAL logs
5. Verify data integrity

## Compliance & Audit

### Migration Audit Requirements
- Log all schema changes
- Track who executed migrations
- Record execution time and results
- Maintain change management documentation

### Change Management Process
1. **Proposal**: Document proposed schema changes
2. **Review**: Technical review by team
3. **Approval**: Sign-off from stakeholders
4. **Testing**: Validation in test environment
5. **Scheduling**: Plan maintenance window
6. **Execution**: Run migration
7. **Verification**: Confirm success
8. **Documentation**: Update schema docs

## Monitoring During Migration

### Key Metrics to Watch
- Active connections
- Long-running queries
- Lock contention
- Table bloat
- Disk space usage

### Alerts to Configure
1. Migration duration > 30 minutes
2. Failed migration attempts
3. Disk space < 20%
4. Connection pool exhausted
5. Query response time > 1 second

## Breaking Down Initial Schema

The provided schema should be broken into migrations:

1. **V001**: Extensions and custom types
2. **V002**: Core tables (organizations, users)
3. **V003**: Property tables (properties, units)
4. **V004**: Lease tables (leases, lease_tenants)
5. **V005**: Financial tables (payments)
6. **V006**: Operations tables (maintenance_requests, inspections)
7. **V007**: Compliance tables (violations)
8. **V008**: Supporting tables (documents, messages)
9. **V009**: Audit and metrics tables
10. **V010**: Basic indexes
11. **V011**: Advanced indexes
12. **V012**: Triggers
13. **V013**: Views

## Best Practices

1. **Always test in staging first**
2. **Never deploy on Fridays**
3. **Have rollback plan ready**
4. **Monitor closely after deployment**
5. **Keep migrations small and focused**
6. **Use transactions where possible**
7. **Document all changes**
8. **Communicate with stakeholders**

## Conclusion

Following this migration strategy ensures:
- Zero or minimal downtime
- Data integrity throughout the process
- Quick rollback capability
- Comprehensive monitoring and auditing
- Scalable approach for future changes
