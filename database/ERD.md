# Entity Relationship Diagram

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORGANIZATIONS (Multi-tenant Root)               │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ id, name, slug, email, phone, address, settings                │    │
│  └────────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────────────┘
                           │
                           │ organization_id (all tables)
          ┌────────────────┼────────────────┬──────────────┐
          │                │                │              │
          ▼                ▼                ▼              ▼
┏━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━┓  ┏━━━━━━━━━━━┓
┃    USERS      ┃  ┃  PROPERTIES  ┃  ┃  MESSAGES  ┃  ┃ AUDIT_LOG ┃
┃───────────────┃  ┃──────────────┃  ┃────────────┃  ┃───────────┃
┃ id            ┃  ┃ id           ┃  ┃ id         ┃  ┃ Universal ┃
┃ email         ┃  ┃ name         ┃  ┃ subject    ┃  ┃ change    ┃
┃ first_name    ┃  ┃ address      ┃  ┃ body       ┃  ┃ tracking  ┃
┃ last_name     ┃  ┃ owner_id ────┼──┃ sender_id  ┃  ┃           ┃
┃ role (ENUM)   ┃  ┃ property_type┃  ┗━━━━━━━━━━━━┛  ┗━━━━━━━━━━━┛
┃  - landlord   ┃  ┗━━━━━━━━━━━━━━┛        │
┃  - tenant     ┃         │                ▼
┃  - contractor ┃         │     ┏━━━━━━━━━━━━━━━━━━━━━┓
┗━━━━━━━━━━━━━━━┛         │     ┃ MESSAGE_RECIPIENTS  ┃
          │               │     ┃─────────────────────┃
          │               │     ┃ message_id          ┃
          │               ▼     ┃ recipient_id        ┃
          │     ┏━━━━━━━━━━━━━━━┃ status              ┃
          │     ┃     UNITS     ┃ delivered_at ⏰     ┃
          │     ┃───────────────┃ read_at ⏰          ┃
          │     ┃ id            ┗━━━━━━━━━━━━━━━━━━━━━┛
          │     ┃ property_id
          │     ┃ unit_number
          │     ┃ monthly_rent
          │     ┃ status
          │     ┗━━━━━━━━━━━━━━━┓
          │               │     │
          │               ▼     │
          │     ┏━━━━━━━━━━━━━━━┓│
          │     ┃    LEASES     ┃│
          │     ┃───────────────┃│
          │     ┃ id            ┃│
          │     ┃ property_id   ┃│
          │     ┃ unit_id       ┃│
          │     ┃ landlord_id ──┼┼──── links to USERS
          │     ┃ start_date    ┃│
          │     ┃ end_date      ┃│
          │     ┃ monthly_rent  ┃│
          │     ┃ status        ┃│
          │     ┗━━━━━━━━━━━━━━━┛│
          │           │    │     │
          │           │    │     │
    ┌─────┼───────────┘    │     │
    │     │                ▼     │
    │     │   ┏━━━━━━━━━━━━━━━━━━━━━━━━┓
    │     │   ┃   LEASE_TENANTS (M:M)  ┃
    │     │   ┃────────────────────────┃
    │     │   ┃ lease_id               ┃
    │     └───┃ tenant_id              ┃
    │         ┃ is_primary             ┃
    │         ┃ signed_at ⏰           ┃
    │         ┃ moved_in_at ⏰         ┃
    │         ┗━━━━━━━━━━━━━━━━━━━━━━━━┛
    │                │
    │                │
    ▼                ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          PAYMENTS               ┃
┃─────────────────────────────────┃
┃ id                              ┃
┃ lease_id                        ┃
┃ tenant_id                       ┃
┃ payment_type (rent, deposit...) ┃
┃ amount                          ┃
┃ status                          ┃
┃ due_date                        ┃
┃ paid_date ⏰                    ┃
┃ cleared_date ⏰                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
    │
    ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      PAYMENT_METRICS            ┃
┃    (Time-series analytics)      ┃
┃─────────────────────────────────┃
┃ date, property_id, tenant_id    ┃
┃ total_due, total_paid           ┃
┃ payments_on_time, late, missed  ┃
┃ avg_days_to_pay                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃    MAINTENANCE_REQUESTS         ┃
┃─────────────────────────────────┃
┃ id                              ┃
┃ property_id                     ┃
┃ unit_id                         ┃
┃ title, description              ┃
┃ category, priority              ┃
┃ status                          ┃
┃ reported_by_id                  ┃
┃ assigned_to_id (contractor)     ┃
┃ submitted_at ⏰                 ┃
┃ acknowledged_at ⏰              ┃
┃ started_at ⏰                   ┃
┃ completed_at ⏰                 ┃
┃ acknowledgment_time_minutes ⚡  ┃
┃ resolution_time_minutes ⚡      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
    │
    ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃    MAINTENANCE_METRICS          ┃
┃    (Time-series analytics)      ┃
┃─────────────────────────────────┃
┃ date, property_id, category     ┃
┃ requests_submitted, completed   ┃
┃ avg_acknowledgment_time         ┃
┃ avg_resolution_time             ┃
┃ total_cost                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃        INSPECTIONS              ┃
┃─────────────────────────────────┃
┃ id                              ┃
┃ property_id, unit_id, lease_id  ┃
┃ inspection_type                 ┃
┃  - move_in                      ┃
┃  - move_out                     ┃
┃  - periodic                     ┃
┃ inspector_id, tenant_id         ┃
┃ scheduled_date                  ┃
┃ actual_date                     ┃
┃ findings (JSONB)                ┃
┃ inspector_signed_at ⏰          ┃
┃ tenant_signed_at ⏰             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃         VIOLATIONS              ┃
┃─────────────────────────────────┃
┃ id                              ┃
┃ property_id, unit_id, lease_id  ┃
┃ tenant_id                       ┃
┃ violation_type, severity        ┃
┃ title, description              ┃
┃ incident_date                   ┃
┃ reported_by_id                  ┃
┃ reported_at ⏰                  ┃
┃ warning_count 🔢                ┃
┃ is_repeat_offense 🚨            ┃
┃ tenant_acknowledged_at ⏰       ┃
┃ resolved_at ⏰                  ┃
┃ fine_amount                     ┃
┃ legal_action_taken              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃         DOCUMENTS               ┃
┃    (Polymorphic associations)   ┃
┃─────────────────────────────────┃
┃ id                              ┃
┃ document_type                   ┃
┃  - lease_agreement              ┃
┃  - photo 📷                     ┃
┃  - video 🎥                     ┃
┃  - receipt                      ┃
┃  - inspection_report            ┃
┃ property_id (optional)          ┃
┃ unit_id (optional)              ┃
┃ lease_id (optional)             ┃
┃ maintenance_request_id (opt)    ┃
┃ violation_id (optional)         ┃
┃ inspection_id (optional)        ┃
┃ file_name, file_path            ┃
┃ file_hash (SHA-256)             ┃
┃ captured_at ⏰                  ┃
┃ uploaded_at ⏰                  ┃
┃ uploaded_by_id                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Relationship Types

### One-to-Many (1:N)
- Organizations → Users
- Organizations → Properties
- Properties → Units
- Properties → Maintenance Requests
- Leases → Payments
- Users → Maintenance Requests (reported_by)
- Messages → Message Recipients

### Many-to-Many (M:N)
- Leases ↔ Tenants (via lease_tenants)

### Polymorphic (Many-to-One, Multiple Parents)
- Documents → Properties | Units | Leases | Maintenance | Violations | Inspections

## Key Relationships Explained

### Users ↔ Properties
- **owner_id**: Landlord who owns the property
- **property_manager_id**: Optional property manager

### Properties ↔ Units
- One property can have many units
- Single-family homes typically have 0 units
- Multi-family properties have multiple units

### Leases ↔ Tenants
- **Many-to-Many** relationship via lease_tenants
- Supports roommate scenarios
- Tracks individual tenant signing and move-in dates

### Payments ↔ Leases
- Each payment linked to specific lease
- Also tracks which tenant made payment
- Supports partial payments from multiple tenants

### Maintenance Requests
- Links to property and optionally to unit
- reported_by_id → tenant who reported
- assigned_to_id → contractor assigned

### Documents (Polymorphic)
- Can attach to ANY entity
- At least one foreign key must be set
- Supports photos, videos, PDFs, etc.

### Messages ↔ Recipients
- One message can have multiple recipients
- Each recipient has own delivery/read tracking
- Critical for compliance and disputes

## Data Flow Examples

### Tenant Pays Rent
```
1. Tenant (user) → Payment record created
2. Payment links to Lease
3. Lease links to Property/Unit
4. Landlord (user) receives notification
5. Payment status updated to 'completed'
6. Audit log records transaction
7. Payment metrics updated
```

### Maintenance Request Flow
```
1. Tenant (user) creates Maintenance Request
2. Links to Property + Unit
3. Landlord receives notification (message)
4. Landlord assigns to Contractor (user)
5. Contractor acknowledges (timestamp)
6. Contractor starts work (timestamp)
7. Contractor uploads photos (documents)
8. Contractor completes work (timestamp)
9. System calculates response metrics
10. Tenant rates satisfaction
11. Maintenance metrics updated
```

### Violation Escalation
```
1. Landlord reports Violation
2. Links to Tenant, Lease, Property
3. Tenant receives notification
4. Tenant acknowledges (timestamp)
5. If repeat: warning_count incremented
6. If unresolved: escalate to legal
7. Document all communications
8. Track resolution timeline
```

## Critical Timestamps ⏰

Every table has:
- **created_at**: Record creation
- **updated_at**: Last modification
- **deleted_at**: Soft delete (if applicable)

Additional timestamps:
- **Payments**: due_date, paid_date, cleared_date
- **Maintenance**: submitted_at, acknowledged_at, started_at, completed_at
- **Messages**: sent_at, delivered_at, read_at
- **Violations**: incident_date, reported_at, acknowledged_at, resolved_at
- **Documents**: captured_at, uploaded_at
- **Leases**: start_date, end_date, signed_date, move_in_date, move_out_date

## Audit Trail 🔍

The **audit_log** table tracks:
- Every INSERT, UPDATE, DELETE
- User who made change
- IP address
- Old values → New values
- Changed fields
- Timestamp

Applied to critical tables:
- Leases
- Payments
- Violations
- Maintenance Requests

## Soft Deletes 🗑️

All tables support soft delete:
- Never physically delete records
- Set deleted_at timestamp
- Queries filter with `WHERE deleted_at IS NULL`
- Recoverable if needed
- Critical for audit trails

## Indexes Strategy 📊

### Primary Indexes
- All foreign keys
- Status columns
- Date columns

### Composite Indexes
- (tenant_id, due_date) for payment queries
- (property_id, status) for lease queries
- (organization_id, deleted_at) for multi-tenant

### Partial Indexes
- Only active records
- Only undeleted records
- Only specific statuses

### Full-Text Search
- GIN indexes on text content
- Trigram indexes for fuzzy search

## Multi-Tenancy 🏢

All tables include **organization_id**:
- Complete data isolation
- Row-Level Security enforced
- Each organization = separate tenant
- No cross-tenant data leakage
- Supports different subscription tiers

## Views for Common Queries 👁️

Pre-built views:
- **active_leases**: Current active leases with details
- **outstanding_payments**: Overdue payments
- **open_maintenance_requests**: Pending maintenance
- **property_occupancy**: Occupancy rates per property

## Legend

- ⏰ = Critical timestamp field
- ⚡ = Auto-calculated metric
- 🔢 = Counter/accumulator
- 🚨 = Alert/warning field
- 📷 = Photo storage
- 🎥 = Video storage
- 🗑️ = Soft delete support
- 🔍 = Audit trail
- 🏢 = Multi-tenant field

## Database Statistics

Total Tables: **15 core tables + 2 metrics + 1 audit**

Key Features:
- ✅ Multi-tenancy
- ✅ Audit trails
- ✅ Soft deletes
- ✅ Comprehensive timestamps
- ✅ Read receipts
- ✅ Response metrics
- ✅ Document management
- ✅ Time-series analytics
