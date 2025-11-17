-- ============================================================================
-- SAMPLE QUERIES FOR COMMON OPERATIONS
-- ============================================================================

-- ============================================================================
-- TENANT QUERIES
-- ============================================================================

-- Get complete tenant payment history with status
SELECT 
    p.payment_number,
    p.payment_type,
    p.amount,
    p.total_amount,
    p.status,
    p.due_date,
    p.paid_date,
    CASE 
        WHEN p.paid_date IS NULL AND p.due_date < CURRENT_DATE THEN 'OVERDUE'
        WHEN p.paid_date IS NULL THEN 'PENDING'
        WHEN p.paid_date <= p.due_date THEN 'ON TIME'
        ELSE 'LATE'
    END AS payment_timing,
    CASE 
        WHEN p.paid_date > p.due_date THEN p.paid_date - p.due_date
        ELSE 0
    END AS days_late,
    l.lease_number,
    prop.name AS property_name,
    u.unit_number
FROM payments p
JOIN leases l ON p.lease_id = l.id
JOIN properties prop ON l.property_id = prop.id
LEFT JOIN units u ON l.unit_id = u.id
WHERE p.tenant_id = :tenant_id
    AND p.deleted_at IS NULL
ORDER BY p.due_date DESC;

-- Get tenant's active lease with all details
SELECT 
    l.*,
    prop.name AS property_name,
    prop.address_line1,
    prop.city,
    prop.state,
    prop.postal_code,
    u.unit_number,
    landlord.first_name || ' ' || landlord.last_name AS landlord_name,
    landlord.email AS landlord_email,
    landlord.phone AS landlord_phone
FROM leases l
JOIN properties prop ON l.property_id = prop.id
LEFT JOIN units u ON l.unit_id = u.id
JOIN users landlord ON l.landlord_id = landlord.id
JOIN lease_tenants lt ON l.id = lt.lease_id
WHERE lt.tenant_id = :tenant_id
    AND l.status = 'active'
    AND l.deleted_at IS NULL
    AND lt.deleted_at IS NULL;

-- Get tenant's open maintenance requests with timeline
SELECT 
    mr.request_number,
    mr.title,
    mr.description,
    mr.category,
    mr.priority,
    mr.status,
    mr.submitted_at,
    mr.acknowledged_at,
    mr.started_at,
    CASE 
        WHEN mr.acknowledged_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (mr.acknowledged_at - mr.submitted_at)) / 60 
    END AS acknowledgment_minutes,
    contractor.first_name || ' ' || contractor.last_name AS assigned_to,
    contractor.phone AS contractor_phone,
    COUNT(d.id) AS document_count
FROM maintenance_requests mr
LEFT JOIN users contractor ON mr.assigned_to_id = contractor.id
LEFT JOIN documents d ON mr.id = d.maintenance_request_id AND d.deleted_at IS NULL
WHERE mr.reported_by_id = :tenant_id
    AND mr.status NOT IN ('completed', 'cancelled')
    AND mr.deleted_at IS NULL
GROUP BY mr.id, contractor.id
ORDER BY 
    CASE mr.priority
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    mr.submitted_at DESC;

-- Get tenant's violation history
SELECT 
    v.violation_number,
    v.violation_type,
    v.severity,
    v.status,
    v.title,
    v.description,
    v.incident_date,
    v.reported_at,
    v.warning_count,
    v.is_repeat_offense,
    v.fine_amount,
    v.fine_paid_at,
    v.resolved_at,
    reporter.first_name || ' ' || reporter.last_name AS reported_by,
    prop.name AS property_name,
    u.unit_number
FROM violations v
JOIN properties prop ON v.property_id = prop.id
LEFT JOIN units u ON v.unit_id = u.id
JOIN users reporter ON v.reported_by_id = reporter.id
WHERE v.tenant_id = :tenant_id
    AND v.deleted_at IS NULL
ORDER BY v.incident_date DESC;

-- ============================================================================
-- LANDLORD QUERIES
-- ============================================================================

-- Get landlord dashboard summary
SELECT 
    COUNT(DISTINCT p.id) AS total_properties,
    COUNT(DISTINCT u.id) AS total_units,
    COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) AS occupied_units,
    COUNT(DISTINCT CASE WHEN u.status = 'available' THEN u.id END) AS available_units,
    COUNT(DISTINCT al.id) AS active_leases,
    COALESCE(SUM(al.monthly_rent), 0) AS total_monthly_rent,
    COUNT(DISTINCT op.id) AS overdue_payments,
    COALESCE(SUM(op.total_amount), 0) AS overdue_amount,
    COUNT(DISTINCT omr.id) AS open_maintenance_requests,
    COUNT(DISTINCT CASE WHEN omr.priority = 'emergency' THEN omr.id END) AS emergency_requests
FROM properties p
LEFT JOIN units u ON p.id = u.property_id AND u.deleted_at IS NULL
LEFT JOIN leases al ON p.id = al.property_id 
    AND al.status = 'active' 
    AND al.deleted_at IS NULL
    AND CURRENT_DATE BETWEEN al.start_date AND al.end_date
LEFT JOIN payments op ON al.id = op.lease_id 
    AND op.status IN ('pending', 'failed')
    AND op.due_date < CURRENT_DATE
    AND op.deleted_at IS NULL
LEFT JOIN maintenance_requests omr ON p.id = omr.property_id 
    AND omr.status NOT IN ('completed', 'cancelled')
    AND omr.deleted_at IS NULL
WHERE p.owner_id = :landlord_id
    AND p.deleted_at IS NULL;

-- Get property-by-property performance
SELECT 
    p.id,
    p.name AS property_name,
    p.address_line1,
    p.city,
    p.state,
    COUNT(DISTINCT u.id) AS total_units,
    COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) AS occupied_units,
    ROUND(
        COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END)::DECIMAL / 
        NULLIF(COUNT(DISTINCT u.id), 0) * 100, 
        2
    ) AS occupancy_rate,
    COUNT(DISTINCT al.id) AS active_leases,
    COALESCE(SUM(al.monthly_rent), 0) AS monthly_rent_total,
    COUNT(DISTINCT mr.id) AS open_maintenance_count,
    COALESCE(AVG(mr.resolution_time_minutes), 0)::INTEGER AS avg_resolution_minutes,
    COUNT(DISTINCT v.id) AS active_violations
FROM properties p
LEFT JOIN units u ON p.id = u.property_id AND u.deleted_at IS NULL
LEFT JOIN leases al ON p.id = al.property_id 
    AND al.status = 'active' 
    AND al.deleted_at IS NULL
    AND CURRENT_DATE BETWEEN al.start_date AND al.end_date
LEFT JOIN maintenance_requests mr ON p.id = mr.property_id 
    AND mr.status = 'completed'
    AND mr.completed_at >= CURRENT_DATE - INTERVAL '30 days'
    AND mr.deleted_at IS NULL
LEFT JOIN violations v ON p.id = v.property_id 
    AND v.status NOT IN ('resolved')
    AND v.deleted_at IS NULL
WHERE p.owner_id = :landlord_id
    AND p.deleted_at IS NULL
GROUP BY p.id
ORDER BY p.name;

-- Get upcoming lease expirations
SELECT 
    l.lease_number,
    l.end_date,
    l.end_date - CURRENT_DATE AS days_until_expiration,
    l.auto_renewal,
    p.name AS property_name,
    u.unit_number,
    l.monthly_rent,
    ARRAY_AGG(t.first_name || ' ' || t.last_name) AS tenant_names,
    ARRAY_AGG(t.email) AS tenant_emails,
    ARRAY_AGG(t.phone) AS tenant_phones
FROM leases l
JOIN properties p ON l.property_id = p.id
LEFT JOIN units u ON l.unit_id = u.id
JOIN lease_tenants lt ON l.id = lt.lease_id AND lt.deleted_at IS NULL
JOIN users t ON lt.tenant_id = t.id AND t.deleted_at IS NULL
WHERE l.landlord_id = :landlord_id
    AND l.status = 'active'
    AND l.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
    AND l.deleted_at IS NULL
GROUP BY l.id, p.id, u.id
ORDER BY l.end_date ASC;

-- Get rent collection report (monthly)
SELECT 
    DATE_TRUNC('month', p.due_date) AS month,
    COUNT(*) AS total_payments,
    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) AS completed_payments,
    COUNT(CASE WHEN p.status IN ('pending', 'failed') AND p.due_date < CURRENT_DATE THEN 1 END) AS overdue_payments,
    SUM(p.total_amount) AS total_expected,
    SUM(CASE WHEN p.status = 'completed' THEN p.total_amount ELSE 0 END) AS total_collected,
    SUM(CASE WHEN p.status IN ('pending', 'failed') THEN p.total_amount ELSE 0 END) AS total_outstanding,
    ROUND(
        SUM(CASE WHEN p.status = 'completed' THEN p.total_amount ELSE 0 END) / 
        NULLIF(SUM(p.total_amount), 0) * 100,
        2
    ) AS collection_rate
FROM payments p
JOIN leases l ON p.lease_id = l.id
JOIN properties prop ON l.property_id = prop.id
WHERE prop.owner_id = :landlord_id
    AND p.payment_type = 'rent'
    AND p.due_date >= CURRENT_DATE - INTERVAL '12 months'
    AND p.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', p.due_date)
ORDER BY month DESC;

-- ============================================================================
-- MAINTENANCE CONTRACTOR QUERIES
-- ============================================================================

-- Get assigned maintenance requests with property details
SELECT 
    mr.request_number,
    mr.title,
    mr.category,
    mr.priority,
    mr.status,
    mr.submitted_at,
    mr.assigned_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - mr.assigned_at)) / 3600 AS hours_since_assigned,
    p.name AS property_name,
    p.address_line1,
    p.city,
    p.state,
    u.unit_number,
    mr.access_instructions,
    mr.tenant_phone,
    mr.estimated_cost,
    reporter.first_name || ' ' || reporter.last_name AS reported_by,
    reporter.email AS reporter_email
FROM maintenance_requests mr
JOIN properties p ON mr.property_id = p.id
LEFT JOIN units u ON mr.unit_id = u.id
JOIN users reporter ON mr.reported_by_id = reporter.id
WHERE mr.assigned_to_id = :contractor_id
    AND mr.status NOT IN ('completed', 'cancelled')
    AND mr.deleted_at IS NULL
ORDER BY 
    CASE mr.priority
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    mr.submitted_at ASC;

-- Get contractor performance metrics (last 30 days)
SELECT 
    COUNT(*) AS total_completed,
    AVG(mr.resolution_time_minutes)::INTEGER AS avg_resolution_minutes,
    AVG(mr.tenant_satisfaction_rating)::DECIMAL(3,2) AS avg_satisfaction,
    SUM(mr.actual_cost) AS total_cost,
    COUNT(CASE WHEN mr.priority = 'emergency' THEN 1 END) AS emergency_count,
    COUNT(CASE WHEN mr.tenant_satisfaction_rating >= 4 THEN 1 END) AS satisfied_count
FROM maintenance_requests mr
WHERE mr.assigned_to_id = :contractor_id
    AND mr.status = 'completed'
    AND mr.completed_at >= CURRENT_DATE - INTERVAL '30 days'
    AND mr.deleted_at IS NULL;

-- ============================================================================
-- ANALYTICS QUERIES
-- ============================================================================

-- Monthly revenue trend
SELECT 
    TO_CHAR(p.paid_date, 'YYYY-MM') AS month,
    COUNT(*) AS payment_count,
    SUM(CASE WHEN p.payment_type = 'rent' THEN p.amount ELSE 0 END) AS rent_revenue,
    SUM(CASE WHEN p.payment_type = 'late_fee' THEN p.amount ELSE 0 END) AS late_fee_revenue,
    SUM(p.amount) AS total_revenue
FROM payments p
WHERE p.organization_id = :org_id
    AND p.status = 'completed'
    AND p.paid_date >= CURRENT_DATE - INTERVAL '12 months'
    AND p.deleted_at IS NULL
GROUP BY TO_CHAR(p.paid_date, 'YYYY-MM')
ORDER BY month DESC;

-- Maintenance cost analysis by property
SELECT 
    p.id,
    p.name AS property_name,
    COUNT(mr.id) AS request_count,
    AVG(mr.resolution_time_minutes)::INTEGER AS avg_resolution_minutes,
    SUM(mr.actual_cost) AS total_cost,
    AVG(mr.actual_cost)::DECIMAL(10,2) AS avg_cost_per_request,
    mr.category,
    COUNT(*) AS category_count
FROM properties p
LEFT JOIN maintenance_requests mr ON p.id = mr.property_id 
    AND mr.status = 'completed'
    AND mr.completed_at >= CURRENT_DATE - INTERVAL '12 months'
    AND mr.deleted_at IS NULL
WHERE p.organization_id = :org_id
    AND p.deleted_at IS NULL
GROUP BY p.id, mr.category
ORDER BY total_cost DESC NULLS LAST;

-- Tenant payment reliability score
SELECT 
    t.id,
    t.first_name || ' ' || t.last_name AS tenant_name,
    t.email,
    COUNT(p.id) AS total_payments,
    COUNT(CASE WHEN p.paid_date <= p.due_date THEN 1 END) AS on_time_payments,
    COUNT(CASE WHEN p.paid_date > p.due_date THEN 1 END) AS late_payments,
    COUNT(CASE WHEN p.status IN ('pending', 'failed') AND p.due_date < CURRENT_DATE THEN 1 END) AS missed_payments,
    ROUND(
        COUNT(CASE WHEN p.paid_date <= p.due_date THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(p.id), 0) * 100,
        2
    ) AS on_time_percentage,
    AVG(CASE WHEN p.paid_date > p.due_date THEN p.paid_date - p.due_date END) AS avg_days_late,
    SUM(CASE WHEN p.payment_type = 'late_fee' THEN p.amount ELSE 0 END) AS total_late_fees
FROM users t
LEFT JOIN payments p ON t.id = p.tenant_id AND p.deleted_at IS NULL
WHERE t.role = 'tenant'
    AND t.organization_id = :org_id
    AND t.deleted_at IS NULL
GROUP BY t.id
HAVING COUNT(p.id) > 0
ORDER BY on_time_percentage DESC;

-- Occupancy rate over time
SELECT 
    DATE_TRUNC('month', d.date) AS month,
    COUNT(DISTINCT u.id) AS total_units,
    COUNT(DISTINCT CASE WHEN l.id IS NOT NULL THEN u.id END) AS occupied_units,
    ROUND(
        COUNT(DISTINCT CASE WHEN l.id IS NOT NULL THEN u.id END)::DECIMAL / 
        NULLIF(COUNT(DISTINCT u.id), 0) * 100,
        2
    ) AS occupancy_rate
FROM generate_series(
    CURRENT_DATE - INTERVAL '12 months',
    CURRENT_DATE,
    '1 month'::INTERVAL
) AS d(date)
CROSS JOIN units u
LEFT JOIN leases l ON u.id = l.unit_id 
    AND l.status = 'active'
    AND d.date BETWEEN l.start_date AND l.end_date
    AND l.deleted_at IS NULL
WHERE u.organization_id = :org_id
    AND u.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', d.date)
ORDER BY month DESC;

-- ============================================================================
-- COMPLIANCE & AUDIT QUERIES
-- ============================================================================

-- Get audit trail for a specific record
SELECT 
    al.action,
    al.changed_fields,
    al.old_values,
    al.new_values,
    al.created_at,
    u.first_name || ' ' || u.last_name AS changed_by,
    al.user_email,
    al.user_ip
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.table_name = :table_name
    AND al.record_id = :record_id
ORDER BY al.created_at DESC;

-- Get all communications between landlord and tenant
SELECT 
    m.subject,
    m.body,
    m.sent_at,
    sender.first_name || ' ' || sender.last_name AS sender_name,
    sender.role AS sender_role,
    mr.status AS recipient_status,
    mr.delivered_at,
    mr.read_at,
    recipient.first_name || ' ' || recipient.last_name AS recipient_name
FROM messages m
JOIN users sender ON m.sender_id = sender.id
JOIN message_recipients mr ON m.id = mr.message_id
JOIN users recipient ON mr.recipient_id = recipient.id
WHERE m.lease_id = :lease_id
    AND m.deleted_at IS NULL
ORDER BY m.sent_at DESC;

-- Document timestamp verification
SELECT 
    d.title,
    d.document_type,
    d.uploaded_at,
    d.captured_at,
    d.file_name,
    d.file_hash,
    uploader.first_name || ' ' || uploader.last_name AS uploaded_by,
    p.name AS property_name,
    l.lease_number
FROM documents d
JOIN users uploader ON d.uploaded_by_id = uploader.id
LEFT JOIN properties p ON d.property_id = p.id
LEFT JOIN leases l ON d.lease_id = l.id
WHERE d.organization_id = :org_id
    AND d.captured_at IS NOT NULL
    AND d.deleted_at IS NULL
ORDER BY d.captured_at DESC;

