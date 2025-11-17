# Quick Start Guide

## 5-Minute Setup

### Prerequisites
- PostgreSQL 14+ installed
- psql command-line tool
- Basic SQL knowledge

### Step 1: Create Database
```bash
createdb propertymanagement
```

### Step 2: Deploy Schema
```bash
cd database
psql -d propertymanagement -f 01_schema.sql
psql -d propertymanagement -f 02_indexes_optimization.sql
```

### Step 3: Verify Installation
```bash
psql -d propertymanagement -c "\dt"
```

You should see all tables listed.

## Create Your First Organization

```sql
INSERT INTO organizations (name, slug, email, phone)
VALUES (
    'Demo Property Management',
    'demo-pm',
    'admin@demo-pm.com',
    '555-0100'
);
```

## Create Your First User (Landlord)

```sql
INSERT INTO users (
    organization_id,
    email,
    first_name,
    last_name,
    role,
    status
)
SELECT 
    id,
    'john.landlord@example.com',
    'John',
    'Landlord',
    'landlord',
    'active'
FROM organizations 
WHERE slug = 'demo-pm';
```

## Create Your First Property

```sql
INSERT INTO properties (
    organization_id,
    owner_id,
    name,
    property_type,
    address_line1,
    city,
    state,
    postal_code,
    bedrooms,
    bathrooms
)
SELECT 
    o.id,
    u.id,
    '123 Main Street Apartment Complex',
    'multi_family',
    '123 Main Street',
    'San Francisco',
    'CA',
    '94102',
    0, -- building itself
    0
FROM organizations o
JOIN users u ON o.id = u.organization_id
WHERE o.slug = 'demo-pm' 
  AND u.role = 'landlord'
LIMIT 1;
```

## Create Units

```sql
INSERT INTO units (
    property_id,
    unit_number,
    bedrooms,
    bathrooms,
    square_footage,
    monthly_rent,
    security_deposit
)
SELECT 
    id,
    unnest(ARRAY['101', '102', '201', '202', '301', '302']),
    2,
    1.5,
    850,
    2500.00,
    5000.00
FROM properties 
WHERE name = '123 Main Street Apartment Complex';
```

## Create a Tenant

```sql
INSERT INTO users (
    organization_id,
    email,
    first_name,
    last_name,
    role,
    status,
    phone
)
SELECT 
    id,
    'jane.tenant@example.com',
    'Jane',
    'Tenant',
    'tenant',
    'active',
    '555-0200'
FROM organizations 
WHERE slug = 'demo-pm';
```

## Create a Lease

```sql
INSERT INTO leases (
    organization_id,
    property_id,
    unit_id,
    landlord_id,
    lease_number,
    status,
    start_date,
    end_date,
    monthly_rent,
    security_deposit,
    rent_due_day
)
SELECT 
    o.id,
    p.id,
    u.id,
    landlord.id,
    'LEASE-2025-001',
    'active',
    '2025-01-01',
    '2025-12-31',
    2500.00,
    5000.00,
    1
FROM organizations o
JOIN properties p ON o.id = p.organization_id
JOIN units u ON p.id = u.property_id
JOIN users landlord ON o.id = landlord.organization_id AND landlord.role = 'landlord'
WHERE o.slug = 'demo-pm'
  AND u.unit_number = '101'
LIMIT 1;
```

## Associate Tenant with Lease

```sql
INSERT INTO lease_tenants (
    lease_id,
    tenant_id,
    is_primary,
    responsibility_percentage
)
SELECT 
    l.id,
    t.id,
    true,
    100.00
FROM leases l
JOIN users t ON l.organization_id = t.organization_id
WHERE l.lease_number = 'LEASE-2025-001'
  AND t.email = 'jane.tenant@example.com';
```

## Create a Payment

```sql
INSERT INTO payments (
    organization_id,
    lease_id,
    tenant_id,
    payment_number,
    payment_type,
    status,
    amount,
    payment_method,
    due_date,
    period_start_date,
    period_end_date
)
SELECT 
    l.organization_id,
    l.id,
    lt.tenant_id,
    'PAY-2025-001',
    'rent',
    'completed',
    2500.00,
    'ach',
    '2025-01-01',
    '2025-01-01',
    '2025-01-31'
FROM leases l
JOIN lease_tenants lt ON l.id = lt.lease_id
WHERE l.lease_number = 'LEASE-2025-001';
```

## Create a Maintenance Request

```sql
INSERT INTO maintenance_requests (
    organization_id,
    property_id,
    unit_id,
    request_number,
    title,
    description,
    category,
    priority,
    reported_by_id
)
SELECT 
    l.organization_id,
    l.property_id,
    l.unit_id,
    'MAINT-2025-001',
    'Kitchen Sink Leaking',
    'The kitchen sink has a small leak under the basin. Water is dripping slowly.',
    'plumbing',
    'normal',
    lt.tenant_id
FROM leases l
JOIN lease_tenants lt ON l.id = lt.lease_id
WHERE l.lease_number = 'LEASE-2025-001';
```

## Test Queries

### View All Active Leases
```sql
SELECT * FROM active_leases;
```

### View Outstanding Payments
```sql
SELECT * FROM outstanding_payments;
```

### View Open Maintenance Requests
```sql
SELECT * FROM open_maintenance_requests;
```

### View Property Occupancy
```sql
SELECT * FROM property_occupancy;
```

## Sample Queries for Your Data

### Get Tenant's Payment History
```sql
SELECT 
    p.payment_number,
    p.payment_type,
    p.amount,
    p.status,
    p.due_date,
    p.paid_date
FROM payments p
JOIN users t ON p.tenant_id = t.id
WHERE t.email = 'jane.tenant@example.com'
ORDER BY p.due_date DESC;
```

### Get Property Dashboard
```sql
SELECT 
    p.name,
    COUNT(DISTINCT u.id) AS total_units,
    COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) AS occupied,
    COUNT(DISTINCT l.id) AS active_leases
FROM properties p
LEFT JOIN units u ON p.id = u.property_id
LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
WHERE p.name = '123 Main Street Apartment Complex'
GROUP BY p.id;
```

### Get Landlord's Monthly Revenue
```sql
SELECT 
    SUM(monthly_rent) AS total_monthly_revenue
FROM leases
WHERE status = 'active'
  AND deleted_at IS NULL
  AND landlord_id = (
      SELECT id FROM users 
      WHERE email = 'john.landlord@example.com'
  );
```

## Next Steps

1. **Explore Sample Queries**: Check `03_sample_queries.sql`
2. **Read Full Documentation**: See `README.md`
3. **Plan Migrations**: Review `MIGRATION_STRATEGY.md`
4. **Add Indexes**: Customize `02_indexes_optimization.sql` for your queries
5. **Set Up Backups**: Configure automated backups
6. **Enable Monitoring**: Set up pg_stat_statements

## Common Issues

### Permission Denied
```bash
# Grant permissions
psql -d propertymanagement -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;"
```

### Extension Not Found
```bash
# Install contrib package
sudo apt-get install postgresql-contrib
```

### Connection Refused
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql
```

## Clean Up (Development Only)

To start fresh:
```sql
DROP DATABASE propertymanagement;
CREATE DATABASE propertymanagement;
```

## Production Considerations

Before deploying to production:
1. Change all default passwords
2. Set up SSL/TLS
3. Configure firewall rules
4. Enable connection pooling
5. Set up monitoring
6. Configure automated backups
7. Test disaster recovery
8. Review security settings

## Getting Help

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Sample queries: `03_sample_queries.sql`
- Full documentation: `README.md`
- Migration guide: `MIGRATION_STRATEGY.md`
