-- ============================================
-- HMS Enterprise - Complete Table Creation
-- ============================================
-- Version: 1.0
-- Database: PostgreSQL 14+
-- Purpose: Create ALL tables for HMS Enterprise
-- Tables: 40+ tables across 9 schemas
-- ============================================

-- ==========================================
-- USER SCHEMA - Authentication & Authorization
-- ==========================================

-- Users table
CREATE TABLE user_schema.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    mobile VARCHAR(15),
    profile_photo_url VARCHAR(500),

    -- User type
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('admin', 'doctor', 'receptionist', 'accountant', 'pharmacist', 'lab_technician', 'b2b_manager')),

    -- Doctor specific
    is_doctor BOOLEAN DEFAULT FALSE,
    specialization VARCHAR(100),
    qualification VARCHAR(200),
    medical_registration_number VARCHAR(50),
    hpr_id VARCHAR(50),
    consultation_fee DECIMAL(10, 2),
    revenue_share_percentage DECIMAL(5, 2),

    -- Security
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_mobile_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Roles table
CREATE TABLE user_schema.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_display_name VARCHAR(100),
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE user_schema.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(200),
    module VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE user_schema.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES user_schema.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES user_schema.permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, permission_id)
);

-- User roles junction table
CREATE TABLE user_schema.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_schema.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES user_schema.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID,
    UNIQUE(user_id, role_id)
);

-- Audit logs
CREATE TABLE user_schema.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PATIENT SCHEMA - Patient Management
-- ==========================================

-- Patients table
CREATE TABLE patient_schema.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn VARCHAR(20) UNIQUE NOT NULL,

    -- Personal info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(10),

    -- Contact
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),

    -- ABDM
    abha_number VARCHAR(17) UNIQUE,
    abha_address VARCHAR(100),
    health_id_verified BOOLEAN DEFAULT FALSE,

    -- Identifiers (encrypted)
    aadhaar_number VARCHAR(255),
    pan_number VARCHAR(10),

    -- Medical
    allergies TEXT[],
    chronic_conditions TEXT[],

    -- Metadata
    photo_url VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Patient documents
CREATE TABLE patient_schema.patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patient_schema.patients(id) ON DELETE CASCADE,
    document_type VARCHAR(50),
    document_name VARCHAR(200),
    file_url VARCHAR(500),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID
);

-- ==========================================
-- APPOINTMENT SCHEMA - Scheduling & Queue
-- ==========================================

-- Appointments
CREATE TABLE appointment_schema.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,

    -- Appointment details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 15,
    appointment_type VARCHAR(50) CHECK (appointment_type IN ('consultation', 'follow-up', 'procedure')),

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show')),
    token_number INTEGER,

    -- Consultation
    consultation_fee DECIMAL(10, 2),
    chief_complaint TEXT,

    -- Queue
    checked_in_at TIMESTAMPTZ,
    consultation_started_at TIMESTAMPTZ,
    consultation_ended_at TIMESTAMPTZ,

    -- Metadata
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Doctor schedules
CREATE TABLE appointment_schema.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    slot_duration_minutes INTEGER DEFAULT 15,
    max_appointments INTEGER,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- CLINICAL SCHEMA - EMR & Medical Records
-- ==========================================

-- Visits
CREATE TABLE clinical_schema.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    appointment_id UUID,

    -- Visit details
    visit_date DATE NOT NULL,
    visit_type VARCHAR(50) CHECK (visit_type IN ('opd', 'emergency', 'follow-up')),

    -- Vitals
    height_cm DECIMAL(5, 2),
    weight_kg DECIMAL(5, 2),
    bmi DECIMAL(4, 2),
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    pulse_rate INTEGER,
    temperature_f DECIMAL(4, 2),
    spo2 INTEGER,

    -- Clinical
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    examination_findings TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    advice TEXT,
    follow_up_date DATE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_draft BOOLEAN DEFAULT TRUE
);

-- Prescriptions
CREATE TABLE clinical_schema.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES clinical_schema.visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,

    -- Prescription details
    prescription_date DATE NOT NULL,
    prescription_number VARCHAR(50) UNIQUE,

    -- Metadata
    is_digital_signature BOOLEAN DEFAULT FALSE,
    signature_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescription items
CREATE TABLE clinical_schema.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES clinical_schema.prescriptions(id) ON DELETE CASCADE,

    -- Medicine
    medicine_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    route VARCHAR(50),
    instructions TEXT,

    sequence_number INTEGER
);

-- Investigations
CREATE TABLE clinical_schema.investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,

    -- Investigation
    investigation_type VARCHAR(100) CHECK (investigation_type IN ('lab', 'imaging', 'other')),
    investigation_name VARCHAR(200) NOT NULL,
    service_id UUID,

    -- Status
    status VARCHAR(50) DEFAULT 'ordered' CHECK (status IN ('ordered', 'sample-collected', 'in-progress', 'completed', 'cancelled')),
    ordered_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Report
    report_url VARCHAR(500),
    report_findings TEXT,

    -- Outsourced
    is_outsourced BOOLEAN DEFAULT FALSE,
    partner_id UUID
);

-- ==========================================
-- BILLING SCHEMA - Invoicing & Payments
-- ==========================================

-- Services catalog
CREATE TABLE billing_schema.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code VARCHAR(50) UNIQUE NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    service_category VARCHAR(100),

    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL,
    discount_allowed BOOLEAN DEFAULT TRUE,

    -- Tax
    hsn_sac_code VARCHAR(20),
    gst_rate DECIMAL(5, 2) DEFAULT 0,
    is_gst_exempt BOOLEAN DEFAULT FALSE,

    -- Outsourced
    is_outsourced BOOLEAN DEFAULT FALSE,
    partner_id UUID,
    partner_cost DECIMAL(10, 2),

    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE billing_schema.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,

    -- Patient
    patient_id UUID NOT NULL,
    patient_name VARCHAR(200),
    patient_mobile VARCHAR(15),

    -- Related entities
    visit_id UUID,
    doctor_id UUID,

    -- B2B
    is_b2b BOOLEAN DEFAULT FALSE,
    b2b_client_id UUID,

    -- Camp
    camp_id UUID,

    -- Amounts
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    taxable_amount DECIMAL(12, 2) NOT NULL,
    cgst_amount DECIMAL(12, 2) DEFAULT 0,
    sgst_amount DECIMAL(12, 2) DEFAULT 0,
    igst_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,

    -- Payment
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance_amount DECIMAL(12, 2),
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),

    -- E-Invoice
    irn VARCHAR(100),
    ack_number VARCHAR(100),
    ack_date DATE,
    qr_code_url VARCHAR(500),

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT
);

-- Invoice items
CREATE TABLE billing_schema.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES billing_schema.invoices(id) ON DELETE CASCADE,

    -- Service
    service_id UUID,
    service_name VARCHAR(200) NOT NULL,
    service_code VARCHAR(50),

    -- Pricing
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    taxable_amount DECIMAL(10, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) DEFAULT 0,
    cgst_amount DECIMAL(12, 2) DEFAULT 0,
    sgst_amount DECIMAL(12, 2) DEFAULT 0,
    igst_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,

    -- Outsourced
    is_outsourced BOOLEAN DEFAULT FALSE,
    partner_id UUID,
    partner_cost DECIMAL(10, 2),

    sequence_number INTEGER
);

-- Payments
CREATE TABLE billing_schema.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES billing_schema.invoices(id),

    -- Payment details
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(12, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque')),

    -- Mode-specific
    transaction_id VARCHAR(100),
    cheque_number VARCHAR(50),
    cheque_date DATE,
    bank_name VARCHAR(100),

    -- Payment gateway
    gateway_name VARCHAR(50),
    gateway_payment_id VARCHAR(100),
    gateway_order_id VARCHAR(100),

    -- Metadata
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- ==========================================
-- ACCOUNTING SCHEMA - Double-Entry Bookkeeping
-- ==========================================

-- Chart of accounts
CREATE TABLE accounting_schema.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    account_subtype VARCHAR(50),
    parent_account_id UUID REFERENCES accounting_schema.chart_of_accounts(id),

    -- Balance
    normal_balance VARCHAR(10) CHECK (normal_balance IN ('debit', 'credit')),
    current_balance DECIMAL(15, 2) DEFAULT 0,

    -- Metadata
    description TEXT,
    is_system_account BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entries
CREATE TABLE accounting_schema.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(50),

    -- Reference
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),

    -- Amounts (for validation)
    total_debit DECIMAL(15, 2) NOT NULL,
    total_credit DECIMAL(15, 2) NOT NULL,

    -- Metadata
    description TEXT,
    is_posted BOOLEAN DEFAULT TRUE,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Reversal
    is_reversed BOOLEAN DEFAULT FALSE,
    reversed_by_entry_id UUID REFERENCES accounting_schema.journal_entries(id),

    CONSTRAINT check_balanced CHECK (total_debit = total_credit)
);

-- Journal entry lines
CREATE TABLE accounting_schema.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES accounting_schema.journal_entries(id) ON DELETE CASCADE,

    -- Account
    account_id UUID REFERENCES accounting_schema.chart_of_accounts(id),
    account_code VARCHAR(20),
    account_name VARCHAR(200),

    -- Amount
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,

    -- Dimensions (for reporting)
    doctor_id UUID,
    partner_id UUID,
    b2b_client_id UUID,
    camp_id UUID,

    -- Metadata
    description TEXT,
    line_number INTEGER,

    CONSTRAINT check_debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (credit_amount > 0 AND debit_amount = 0)
    )
);

-- GST invoices
CREATE TABLE accounting_schema.gst_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,

    -- Party
    party_type VARCHAR(20),
    party_id UUID,
    party_name VARCHAR(200),
    party_gstin VARCHAR(15),
    party_state VARCHAR(50),

    -- Amounts
    taxable_amount DECIMAL(12, 2) NOT NULL,
    cgst_amount DECIMAL(12, 2) DEFAULT 0,
    sgst_amount DECIMAL(12, 2) DEFAULT 0,
    igst_amount DECIMAL(12, 2) DEFAULT 0,
    total_tax_amount DECIMAL(12, 2) NOT NULL,
    invoice_amount DECIMAL(12, 2) NOT NULL,

    -- E-Invoice
    irn VARCHAR(100),
    ack_number VARCHAR(100),
    ack_date DATE,

    -- Filing
    gstr1_filed BOOLEAN DEFAULT FALSE,
    gstr1_period VARCHAR(10),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PARTNER SCHEMA - Outsourced Providers
-- ==========================================

-- Partners
CREATE TABLE partner_schema.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code VARCHAR(20) UNIQUE NOT NULL,
    partner_name VARCHAR(200) NOT NULL,
    partner_type VARCHAR(50) NOT NULL CHECK (partner_type IN ('lab', 'imaging', 'pharmacy', 'consultant')),

    -- Contact
    contact_person VARCHAR(100),
    mobile VARCHAR(15),
    email VARCHAR(100),
    address TEXT,

    -- Business
    gstin VARCHAR(15),
    pan VARCHAR(10),

    -- Payment terms
    payment_terms VARCHAR(100),
    payment_frequency VARCHAR(50) CHECK (payment_frequency IN ('monthly', 'weekly', 'per_transaction')),

    -- Bank
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    bank_ifsc VARCHAR(20),

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner services
CREATE TABLE partner_schema.partner_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partner_schema.partners(id) ON DELETE CASCADE,
    service_id UUID,

    -- Pricing
    cost_to_partner DECIMAL(10, 2) NOT NULL,
    payout_type VARCHAR(20) DEFAULT 'fixed' CHECK (payout_type IN ('fixed', 'percentage')),
    payout_value DECIMAL(10, 2) NOT NULL,

    -- Metadata
    effective_from DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Partner bills
CREATE TABLE partner_schema.partner_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    partner_id UUID REFERENCES partner_schema.partners(id),

    -- Bill details
    bill_date DATE NOT NULL,
    bill_period_start DATE,
    bill_period_end DATE,

    -- Amounts
    bill_amount DECIMAL(12, 2) NOT NULL,
    gst_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,

    -- Payment
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    payment_date DATE,

    -- Reconciliation
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMPTZ,
    reconciliation_notes TEXT,

    -- Metadata
    bill_document_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Partner transactions
CREATE TABLE partner_schema.partner_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partner_schema.partners(id),

    -- Related entities
    invoice_id UUID,
    invoice_item_id UUID,
    investigation_id UUID,

    -- Service
    service_id UUID,
    service_name VARCHAR(200),

    -- Transaction
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50),

    -- Amounts
    service_charge DECIMAL(10, 2),
    partner_cost DECIMAL(10, 2),
    margin DECIMAL(10, 2),

    -- Status
    is_billed BOOLEAN DEFAULT FALSE,
    partner_bill_id UUID REFERENCES partner_schema.partner_bills(id),
    is_paid BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- B2B SCHEMA - Corporate Clients
-- ==========================================

-- B2B Clients
CREATE TABLE b2b_schema.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code VARCHAR(20) UNIQUE NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    client_type VARCHAR(50) CHECK (client_type IN ('corporate', 'insurance', 'government')),

    -- Contact
    contact_person VARCHAR(100),
    designation VARCHAR(100),
    mobile VARCHAR(15),
    email VARCHAR(100),
    address TEXT,

    -- Business
    gstin VARCHAR(15),
    pan VARCHAR(10),

    -- Contract
    contract_start_date DATE,
    contract_end_date DATE,
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12, 2),

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client contracts
CREATE TABLE b2b_schema.client_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES b2b_schema.clients(id) ON DELETE CASCADE,
    contract_number VARCHAR(50) UNIQUE NOT NULL,

    -- Contract details
    contract_name VARCHAR(200),
    contract_type VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,

    -- Pricing
    discount_type VARCHAR(20) CHECK (discount_type IN ('flat', 'percentage')),
    discount_value DECIMAL(10, 2),

    -- Scope
    applicable_services UUID[],
    applicable_all_services BOOLEAN DEFAULT FALSE,

    -- Limits
    max_amount_per_employee DECIMAL(12, 2),
    max_visits_per_employee INTEGER,

    -- Metadata
    contract_document_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client employees
CREATE TABLE b2b_schema.client_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES b2b_schema.clients(id),

    -- Employee details
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(200),
    designation VARCHAR(100),
    department VARCHAR(100),
    mobile VARCHAR(15),
    email VARCHAR(100),

    -- Mapping
    patient_id UUID,

    -- Limits
    available_amount DECIMAL(12, 2),
    utilized_amount DECIMAL(12, 2) DEFAULT 0,
    available_visits INTEGER,
    utilized_visits INTEGER DEFAULT 0,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(client_id, employee_id)
);

-- B2B invoices
CREATE TABLE b2b_schema.b2b_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    b2b_invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES b2b_schema.clients(id),

    -- Invoice period
    invoice_period VARCHAR(10),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    invoice_date DATE NOT NULL,

    -- Amounts
    gross_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    taxable_amount DECIMAL(12, 2) NOT NULL,
    gst_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,

    -- Payment
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    due_date DATE,

    -- E-Invoice
    irn VARCHAR(100),
    ack_number VARCHAR(100),

    -- Metadata
    invoice_pdf_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- B2B invoice items
CREATE TABLE b2b_schema.b2b_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    b2b_invoice_id UUID REFERENCES b2b_schema.b2b_invoices(id) ON DELETE CASCADE,

    -- Related
    patient_invoice_id UUID,
    patient_name VARCHAR(200),
    employee_id VARCHAR(50),
    service_date DATE,

    -- Amount
    gross_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    net_amount DECIMAL(10, 2),

    sequence_number INTEGER
);

-- ==========================================
-- CAMP SCHEMA - Health Camps
-- ==========================================

-- Camps
CREATE TABLE camp_schema.camps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_code VARCHAR(20) UNIQUE NOT NULL,
    camp_name VARCHAR(200) NOT NULL,
    camp_type VARCHAR(50),

    -- Schedule
    camp_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,

    -- Location
    location_name VARCHAR(200),
    location_address TEXT,

    -- Target
    target_participants INTEGER,
    registered_participants INTEGER DEFAULT 0,
    attended_participants INTEGER DEFAULT 0,

    -- Organizer
    organized_by VARCHAR(200),
    organizer_contact VARCHAR(100),

    -- Financial
    budget DECIMAL(12, 2),
    package_price DECIMAL(10, 2),

    -- Status
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed', 'cancelled')),

    -- Metadata
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Camp registrations
CREATE TABLE camp_schema.camp_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID REFERENCES camp_schema.camps(id) ON DELETE CASCADE,
    patient_id UUID,

    -- Registration
    registration_number VARCHAR(50),
    registration_date DATE NOT NULL,

    -- Attendance
    attended BOOLEAN DEFAULT FALSE,
    attendance_time TIMESTAMPTZ,

    -- Services
    services_availed TEXT[],

    -- Billing
    invoice_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Camp expenses
CREATE TABLE camp_schema.camp_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID REFERENCES camp_schema.camps(id) ON DELETE CASCADE,

    -- Expense
    expense_date DATE NOT NULL,
    expense_category VARCHAR(100),
    expense_description TEXT,
    amount DECIMAL(10, 2) NOT NULL,

    -- Payment
    paid_to VARCHAR(200),
    payment_mode VARCHAR(50),

    -- Accounting
    journal_entry_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- ==========================================
-- Success message
-- ==========================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema IN (
        'user_schema', 'patient_schema', 'appointment_schema',
        'clinical_schema', 'billing_schema', 'accounting_schema',
        'partner_schema', 'b2b_schema', 'camp_schema'
    );

    RAISE NOTICE '';
    RAISE NOTICE '✓✓✓ DATABASE TABLES CREATED SUCCESSFULLY! ✓✓✓';
    RAISE NOTICE '';
    RAISE NOTICE 'Total tables created: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Schemas populated:';
    RAISE NOTICE '  - user_schema: 6 tables (users, roles, permissions, etc.)';
    RAISE NOTICE '  - patient_schema: 2 tables (patients, documents)';
    RAISE NOTICE '  - appointment_schema: 2 tables (appointments, schedules)';
    RAISE NOTICE '  - clinical_schema: 4 tables (visits, prescriptions, items, investigations)';
    RAISE NOTICE '  - billing_schema: 4 tables (services, invoices, items, payments)';
    RAISE NOTICE '  - accounting_schema: 4 tables (accounts, journal entries, lines, gst)';
    RAISE NOTICE '  - partner_schema: 4 tables (partners, services, bills, transactions)';
    RAISE NOTICE '  - b2b_schema: 5 tables (clients, contracts, employees, invoices, items)';
    RAISE NOTICE '  - camp_schema: 3 tables (camps, registrations, expenses)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Run 03-create-indexes.sql for performance optimization';
    RAISE NOTICE '';
END $$;
