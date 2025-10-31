-- ============================================
-- HMS Enterprise - Performance Indexes
-- ============================================
-- Version: 1.0
-- Purpose: Create indexes for query optimization
-- Performance Target: < 100ms for 95th percentile queries
-- ============================================

-- ==========================================
-- USER SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_users_username ON user_schema.users(username);
CREATE INDEX idx_users_email ON user_schema.users(email);
CREATE INDEX idx_users_mobile ON user_schema.users(mobile);
CREATE INDEX idx_users_type ON user_schema.users(user_type);
CREATE INDEX idx_users_active ON user_schema.users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_doctor ON user_schema.users(id) WHERE is_doctor = TRUE;

CREATE INDEX idx_role_permissions_role ON user_schema.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON user_schema.role_permissions(permission_id);

CREATE INDEX idx_user_roles_user ON user_schema.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_schema.user_roles(role_id);

CREATE INDEX idx_audit_logs_user ON user_schema.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON user_schema.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON user_schema.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON user_schema.audit_logs(action);

-- ==========================================
-- PATIENT SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_patients_mrn ON patient_schema.patients(mrn);
CREATE INDEX idx_patients_mobile ON patient_schema.patients(mobile);
CREATE INDEX idx_patients_email ON patient_schema.patients(email);
CREATE INDEX idx_patients_abha ON patient_schema.patients(abha_number);
CREATE INDEX idx_patients_name ON patient_schema.patients(first_name, last_name);
CREATE INDEX idx_patients_active ON patient_schema.patients(id) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_patients_search ON patient_schema.patients USING gin(to_tsvector('english', first_name || ' ' || COALESCE(last_name, '') || ' ' || mobile));

CREATE INDEX idx_patient_documents_patient ON patient_schema.patient_documents(patient_id);
CREATE INDEX idx_patient_documents_type ON patient_schema.patient_documents(document_type);

-- ==========================================
-- APPOINTMENT SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_appointments_patient ON appointment_schema.appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointment_schema.appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointment_schema.appointments(appointment_date, appointment_time);
CREATE INDEX idx_appointments_status ON appointment_schema.appointments(status);
CREATE INDEX idx_appointments_doctor_date ON appointment_schema.appointments(doctor_id, appointment_date, status);
CREATE INDEX idx_appointments_token ON appointment_schema.appointments(appointment_date, token_number);

CREATE INDEX idx_doctor_schedules_doctor ON appointment_schema.doctor_schedules(doctor_id);
CREATE INDEX idx_doctor_schedules_day ON appointment_schema.doctor_schedules(day_of_week);
CREATE INDEX idx_doctor_schedules_active ON appointment_schema.doctor_schedules(doctor_id, is_active) WHERE is_active = TRUE;

-- ==========================================
-- CLINICAL SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_visits_patient ON clinical_schema.visits(patient_id);
CREATE INDEX idx_visits_doctor ON clinical_schema.visits(doctor_id);
CREATE INDEX idx_visits_date ON clinical_schema.visits(visit_date DESC);
CREATE INDEX idx_visits_appointment ON clinical_schema.visits(appointment_id);
CREATE INDEX idx_visits_patient_date ON clinical_schema.visits(patient_id, visit_date DESC);

CREATE INDEX idx_prescriptions_visit ON clinical_schema.prescriptions(visit_id);
CREATE INDEX idx_prescriptions_patient ON clinical_schema.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON clinical_schema.prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_number ON clinical_schema.prescriptions(prescription_number);
CREATE INDEX idx_prescriptions_date ON clinical_schema.prescriptions(prescription_date DESC);

CREATE INDEX idx_prescription_items_prescription ON clinical_schema.prescription_items(prescription_id);

CREATE INDEX idx_investigations_patient ON clinical_schema.investigations(patient_id);
CREATE INDEX idx_investigations_doctor ON clinical_schema.investigations(doctor_id);
CREATE INDEX idx_investigations_visit ON clinical_schema.investigations(visit_id);
CREATE INDEX idx_investigations_status ON clinical_schema.investigations(status);
CREATE INDEX idx_investigations_partner ON clinical_schema.investigations(partner_id) WHERE is_outsourced = TRUE;
CREATE INDEX idx_investigations_ordered ON clinical_schema.investigations(ordered_at DESC);

-- ==========================================
-- BILLING SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_services_code ON billing_schema.services(service_code);
CREATE INDEX idx_services_category ON billing_schema.services(service_category);
CREATE INDEX idx_services_active ON billing_schema.services(id) WHERE is_active = TRUE;
CREATE INDEX idx_services_outsourced ON billing_schema.services(partner_id) WHERE is_outsourced = TRUE;

CREATE INDEX idx_invoices_number ON billing_schema.invoices(invoice_number);
CREATE INDEX idx_invoices_patient ON billing_schema.invoices(patient_id);
CREATE INDEX idx_invoices_date ON billing_schema.invoices(invoice_date DESC);
CREATE INDEX idx_invoices_status ON billing_schema.invoices(payment_status);
CREATE INDEX idx_invoices_doctor ON billing_schema.invoices(doctor_id);
CREATE INDEX idx_invoices_visit ON billing_schema.invoices(visit_id);
CREATE INDEX idx_invoices_b2b ON billing_schema.invoices(b2b_client_id) WHERE is_b2b = TRUE;
CREATE INDEX idx_invoices_camp ON billing_schema.invoices(camp_id);
CREATE INDEX idx_invoices_irn ON billing_schema.invoices(irn);
CREATE INDEX idx_invoices_unpaid ON billing_schema.invoices(id, total_amount, balance_amount) WHERE payment_status IN ('unpaid', 'partial');

CREATE INDEX idx_invoice_items_invoice ON billing_schema.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_service ON billing_schema.invoice_items(service_id);
CREATE INDEX idx_invoice_items_partner ON billing_schema.invoice_items(partner_id) WHERE is_outsourced = TRUE;

CREATE INDEX idx_payments_invoice ON billing_schema.payments(invoice_id);
CREATE INDEX idx_payments_date ON billing_schema.payments(payment_date DESC);
CREATE INDEX idx_payments_number ON billing_schema.payments(payment_number);
CREATE INDEX idx_payments_mode ON billing_schema.payments(payment_mode);
CREATE INDEX idx_payments_gateway ON billing_schema.payments(gateway_payment_id);

-- ==========================================
-- ACCOUNTING SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_coa_code ON accounting_schema.chart_of_accounts(account_code);
CREATE INDEX idx_coa_type ON accounting_schema.chart_of_accounts(account_type);
CREATE INDEX idx_coa_parent ON accounting_schema.chart_of_accounts(parent_account_id);
CREATE INDEX idx_coa_active ON accounting_schema.chart_of_accounts(id) WHERE is_active = TRUE;

CREATE INDEX idx_je_number ON accounting_schema.journal_entries(entry_number);
CREATE INDEX idx_je_date ON accounting_schema.journal_entries(entry_date DESC);
CREATE INDEX idx_je_type ON accounting_schema.journal_entries(entry_type);
CREATE INDEX idx_je_reference ON accounting_schema.journal_entries(reference_type, reference_id);
CREATE INDEX idx_je_posted ON accounting_schema.journal_entries(id) WHERE is_posted = TRUE;

CREATE INDEX idx_jel_entry ON accounting_schema.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON accounting_schema.journal_entry_lines(account_id);
CREATE INDEX idx_jel_doctor ON accounting_schema.journal_entry_lines(doctor_id);
CREATE INDEX idx_jel_partner ON accounting_schema.journal_entry_lines(partner_id);
CREATE INDEX idx_jel_b2b ON accounting_schema.journal_entry_lines(b2b_client_id);
CREATE INDEX idx_jel_camp ON accounting_schema.journal_entry_lines(camp_id);

CREATE INDEX idx_gst_invoices_number ON accounting_schema.gst_invoices(invoice_number);
CREATE INDEX idx_gst_invoices_date ON accounting_schema.gst_invoices(invoice_date DESC);
CREATE INDEX idx_gst_invoices_period ON accounting_schema.gst_invoices(gstr1_period);
CREATE INDEX idx_gst_invoices_party ON accounting_schema.gst_invoices(party_type, party_id);
CREATE INDEX idx_gst_invoices_irn ON accounting_schema.gst_invoices(irn);

-- ==========================================
-- PARTNER SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_partners_code ON partner_schema.partners(partner_code);
CREATE INDEX idx_partners_type ON partner_schema.partners(partner_type);
CREATE INDEX idx_partners_active ON partner_schema.partners(id) WHERE is_active = TRUE;

CREATE INDEX idx_partner_services_partner ON partner_schema.partner_services(partner_id);
CREATE INDEX idx_partner_services_service ON partner_schema.partner_services(service_id);
CREATE INDEX idx_partner_services_active ON partner_schema.partner_services(partner_id, service_id) WHERE is_active = TRUE;

CREATE INDEX idx_partner_bills_number ON partner_schema.partner_bills(bill_number);
CREATE INDEX idx_partner_bills_partner ON partner_schema.partner_bills(partner_id);
CREATE INDEX idx_partner_bills_date ON partner_schema.partner_bills(bill_date DESC);
CREATE INDEX idx_partner_bills_status ON partner_schema.partner_bills(payment_status);
CREATE INDEX idx_partner_bills_period ON partner_schema.partner_bills(partner_id, bill_period_start, bill_period_end);
CREATE INDEX idx_partner_bills_unpaid ON partner_schema.partner_bills(partner_id) WHERE payment_status IN ('unpaid', 'partial');

CREATE INDEX idx_partner_transactions_partner ON partner_schema.partner_transactions(partner_id);
CREATE INDEX idx_partner_transactions_date ON partner_schema.partner_transactions(transaction_date DESC);
CREATE INDEX idx_partner_transactions_invoice ON partner_schema.partner_transactions(invoice_id);
CREATE INDEX idx_partner_transactions_investigation ON partner_schema.partner_transactions(investigation_id);
CREATE INDEX idx_partner_transactions_unbilled ON partner_schema.partner_transactions(partner_id) WHERE is_billed = FALSE;

-- ==========================================
-- B2B SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_b2b_clients_code ON b2b_schema.clients(client_code);
CREATE INDEX idx_b2b_clients_type ON b2b_schema.clients(client_type);
CREATE INDEX idx_b2b_clients_active ON b2b_schema.clients(id) WHERE is_active = TRUE;

CREATE INDEX idx_client_contracts_client ON b2b_schema.client_contracts(client_id);
CREATE INDEX idx_client_contracts_number ON b2b_schema.client_contracts(contract_number);
CREATE INDEX idx_client_contracts_dates ON b2b_schema.client_contracts(start_date, end_date);
CREATE INDEX idx_client_contracts_active ON b2b_schema.client_contracts(client_id) WHERE is_active = TRUE;

CREATE INDEX idx_client_employees_client ON b2b_schema.client_employees(client_id);
CREATE INDEX idx_client_employees_emp_id ON b2b_schema.client_employees(client_id, employee_id);
CREATE INDEX idx_client_employees_patient ON b2b_schema.client_employees(patient_id);
CREATE INDEX idx_client_employees_active ON b2b_schema.client_employees(client_id) WHERE is_active = TRUE;

CREATE INDEX idx_b2b_invoices_number ON b2b_schema.b2b_invoices(b2b_invoice_number);
CREATE INDEX idx_b2b_invoices_client ON b2b_schema.b2b_invoices(client_id);
CREATE INDEX idx_b2b_invoices_date ON b2b_schema.b2b_invoices(invoice_date DESC);
CREATE INDEX idx_b2b_invoices_period ON b2b_schema.b2b_invoices(invoice_period);
CREATE INDEX idx_b2b_invoices_status ON b2b_schema.b2b_invoices(payment_status);
CREATE INDEX idx_b2b_invoices_unpaid ON b2b_schema.b2b_invoices(client_id) WHERE payment_status IN ('unpaid', 'partial');

CREATE INDEX idx_b2b_invoice_items_invoice ON b2b_schema.b2b_invoice_items(b2b_invoice_id);
CREATE INDEX idx_b2b_invoice_items_patient_invoice ON b2b_schema.b2b_invoice_items(patient_invoice_id);

-- ==========================================
-- CAMP SCHEMA INDEXES
-- ==========================================

CREATE INDEX idx_camps_code ON camp_schema.camps(camp_code);
CREATE INDEX idx_camps_date ON camp_schema.camps(camp_date DESC);
CREATE INDEX idx_camps_status ON camp_schema.camps(status);
CREATE INDEX idx_camps_type ON camp_schema.camps(camp_type);

CREATE INDEX idx_camp_registrations_camp ON camp_schema.camp_registrations(camp_id);
CREATE INDEX idx_camp_registrations_patient ON camp_schema.camp_registrations(patient_id);
CREATE INDEX idx_camp_registrations_invoice ON camp_schema.camp_registrations(invoice_id);
CREATE INDEX idx_camp_registrations_attended ON camp_schema.camp_registrations(camp_id, attended);

CREATE INDEX idx_camp_expenses_camp ON camp_schema.camp_expenses(camp_id);
CREATE INDEX idx_camp_expenses_date ON camp_schema.camp_expenses(expense_date DESC);
CREATE INDEX idx_camp_expenses_category ON camp_schema.camp_expenses(expense_category);

-- ==========================================
-- Analyze tables for query planner
-- ==========================================

ANALYZE user_schema.users;
ANALYZE user_schema.roles;
ANALYZE user_schema.permissions;
ANALYZE patient_schema.patients;
ANALYZE appointment_schema.appointments;
ANALYZE clinical_schema.visits;
ANALYZE billing_schema.invoices;
ANALYZE accounting_schema.chart_of_accounts;
ANALYZE accounting_schema.journal_entries;
ANALYZE partner_schema.partners;
ANALYZE b2b_schema.clients;
ANALYZE camp_schema.camps;

-- ==========================================
-- Success message
-- ==========================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname IN (
        'user_schema', 'patient_schema', 'appointment_schema',
        'clinical_schema', 'billing_schema', 'accounting_schema',
        'partner_schema', 'b2b_schema', 'camp_schema'
    );

    RAISE NOTICE '';
    RAISE NOTICE '✓✓✓ PERFORMANCE INDEXES CREATED SUCCESSFULLY! ✓✓✓';
    RAISE NOTICE '';
    RAISE NOTICE 'Total indexes created: %', index_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Performance optimizations:';
    RAISE NOTICE '  ✓ Foreign key indexes for join optimization';
    RAISE NOTICE '  ✓ Date indexes for time-series queries';
    RAISE NOTICE '  ✓ Status indexes for common filters';
    RAISE NOTICE '  ✓ Composite indexes for multi-column queries';
    RAISE NOTICE '  ✓ Partial indexes for active records only';
    RAISE NOTICE '  ✓ Full-text search index for patient names';
    RAISE NOTICE '';
    RAISE NOTICE 'Query performance target: < 100ms for 95th percentile';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Run 04-create-triggers.sql for automation';
    RAISE NOTICE '';
END $$;
