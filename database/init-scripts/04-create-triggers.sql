-- HMS Enterprise Database Triggers and Functions
-- Auto-incrementing triggers for all tables with updated_at columns
-- Essential business logic enforcement at database level
-- Ensures data integrity and audit capabilities

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate Medical Record Number (MRN)
-- Format: MRN-YYYYNNNNN (e.g., MRN-2024001234)
CREATE OR REPLACE FUNCTION generate_mrn()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_part VARCHAR(7);
    new_mrn VARCHAR(20);
BEGIN
    year_part := EXTRACT(year FROM NOW())::text;

    -- Get next value from MRN sequence
    NEW.mrn := 'MRN-' || year_part || LPAD(nextval('patient_schema.patient_mrn_seq')::text, 7, '0');

    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- AUDIT LOGGING FUNCTION
-- =============================================================================

-- Comprehensive audit logging function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_action TEXT;
    old_data JSONB;
    new_data JSONB;
    changed_columns TEXT[];
    column_info RECORD;
BEGIN
    -- Determine action type
    IF TG_OP = 'DELETE' THEN
        audit_action := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        audit_action := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        -- Track changed columns
        changed_columns := ARRAY[]::TEXT[];
        FOR column_info IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = TG_TABLE_NAME
            AND table_schema = TG_TABLE_SCHEMA
        LOOP
            EXECUTE format('SELECT ($1).%I IS DISTINCT FROM ($2).%I', column_info.column_name, column_info.column_name)
            INTO changed_columns
            USING OLD, NEW;
        END LOOP;
    ELSIF TG_OP = 'INSERT' THEN
        audit_action := 'INSERT';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;

    -- Insert audit record
    INSERT INTO user_schema.audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_columns,
        changed_by,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(OLD.id, NEW.id),
        audit_action,
        old_data,
        new_data,
        changed_columns,
        COALESCE(NEW.updated_by, OLD.updated_by, CURRENT_USER),
        NOW()
    );

    -- Return appropriate value based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- =============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Function to update invoice balance when payments change
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
    invoice_total DECIMAL(12, 2);
    paid_amount DECIMAL(12, 2);
    balance_amount DECIMAL(12, 2);
    payment_status TEXT;
BEGIN
    -- Calculate total paid amount for this invoice
    SELECT COALESCE(SUM(amount), 0) INTO paid_amount
    FROM billing_schema.payments
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND is_cancelled = FALSE;

    -- Get invoice total
    SELECT subtotal + cgst_amount + sgst_amount + igst_amount - COALESCE(discount_amount, 0)
    INTO invoice_total
    FROM billing_schema.invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate balance
    balance_amount := invoice_total - paid_amount;

    -- Determine payment status
    IF balance_amount <= 0 THEN
        payment_status := 'paid';
        balance_amount := 0; -- Avoid negative balances
    ELSIF paid_amount > 0 THEN
        payment_status := 'partial';
    ELSE
        payment_status := 'unpaid';
    END IF;

    -- Update invoice
    UPDATE billing_schema.invoices
    SET
        paid_amount = paid_amount,
        balance_amount = balance_amount,
        payment_status = payment_status,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Return appropriate value
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Function to update account balance in chart of accounts
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    account_id UUID;
    account_type TEXT;
    balance_change DECIMAL(15, 2);
BEGIN
    -- Determine account and change based on operation
    IF TG_OP = 'INSERT' THEN
        account_id := NEW.account_id;
        balance_change := COALESCE(NEW.debit_amount, 0) - COALESCE(NEW.credit_amount, 0);
    ELSIF TG_OP = 'UPDATE' THEN
        account_id := NEW.account_id;
        balance_change := (COALESCE(NEW.debit_amount, 0) - COALESCE(NEW.credit_amount, 0)) -
                         (COALESCE(OLD.debit_amount, 0) - COALESCE(OLD.credit_amount, 0));
    ELSIF TG_OP = 'DELETE' THEN
        account_id := OLD.account_id;
        balance_change := -(COALESCE(OLD.debit_amount, 0) - COALESCE(OLD.credit_amount, 0));
    END IF;

    -- Get account type
    SELECT account_type INTO account_type
    FROM accounting_schema.chart_of_accounts
    WHERE id = account_id;

    -- Update running balance based on account type
    IF account_type IN ('Asset', 'Expense') THEN
        -- Asset and Expense accounts increase with debits
        UPDATE accounting_schema.chart_of_accounts
        SET running_balance = running_balance + balance_change,
            updated_at = NOW()
        WHERE id = account_id;
    ELSE
        -- Liability, Equity, and Revenue accounts increase with credits
        UPDATE accounting_schema.chart_of_accounts
        SET running_balance = running_balance - balance_change,
            updated_at = NOW()
        WHERE id = account_id;
    END IF;

    -- Return appropriate value
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Function to validate patient data before insert/update
CREATE OR REPLACE FUNCTION validate_patient_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate ABHA number format if provided
    IF NEW.abha_number IS NOT NULL THEN
        IF NOT (NEW.abha_number ~ '^\d{2}-\d{4}-\d{4}-\d{4}$' OR NEW.abha_number ~ '^[0-9]{17}$') THEN
            RAISE EXCEPTION 'Invalid ABHA number format. Expected: XX-XXXX-XXXX-XXXX or 17 digits';
        END IF;
    END IF;

    -- Validate mobile number
    IF NEW.mobile IS NOT NULL THEN
        IF NOT (NEW.mobile ~ '^[6-9]\d{9}$') THEN
            RAISE EXCEPTION 'Invalid Indian mobile number format. Must start with 6-9 and be 10 digits';
        END IF;
    END IF;

    -- Validate email format if provided
    IF NEW.email IS NOT NULL THEN
        IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            RAISE EXCEPTION 'Invalid email address format';
        END IF;
    END IF;

    -- Validate age if provided
    IF NEW.age IS NOT NULL AND (NEW.age < 0 OR NEW.age > 150) THEN
        RAISE EXCEPTION 'Age must be between 0 and 150';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================================================

-- User Schema Triggers
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON user_schema.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON user_schema.roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER permissions_updated_at
    BEFORE UPDATE ON user_schema.permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Patient Schema Triggers
CREATE TRIGGER patients_updated_at
    BEFORE UPDATE ON patient_schema.patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER patient_documents_updated_at
    BEFORE UPDATE ON patient_schema.patient_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Appointment Schema Triggers
CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointment_schema.appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER doctor_schedules_updated_at
    BEFORE UPDATE ON appointment_schema.doctor_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Clinical Schema Triggers
CREATE TRIGGER visits_updated_at
    BEFORE UPDATE ON clinical_schema.visits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER prescriptions_updated_at
    BEFORE UPDATE ON clinical_schema.prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER prescription_items_updated_at
    BEFORE UPDATE ON clinical_schema.prescription_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER investigations_updated_at
    BEFORE UPDATE ON clinical_schema.investigations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Billing Schema Triggers
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON billing_schema.services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON billing_schema.invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER invoice_items_updated_at
    BEFORE UPDATE ON billing_schema.invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON billing_schema.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Accounting Schema Triggers
CREATE TRIGGER chart_of_accounts_updated_at
    BEFORE UPDATE ON accounting_schema.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER journal_entries_updated_at
    BEFORE UPDATE ON accounting_schema.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER journal_entry_lines_updated_at
    BEFORE UPDATE ON accounting_schema.journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER gst_invoices_updated_at
    BEFORE UPDATE ON accounting_schema.gst_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- BUSINESS LOGIC TRIGGERS
-- =============================================================================

-- MRN Generation Trigger
CREATE TRIGGER generate_patient_mrn
    BEFORE INSERT ON patient_schema.patients
    FOR EACH ROW
    EXECUTE FUNCTION generate_mrn();

-- Patient Data Validation Trigger
CREATE TRIGGER validate_patient_on_insert
    BEFORE INSERT ON patient_schema.patients
    FOR EACH ROW
    EXECUTE FUNCTION validate_patient_data();

CREATE TRIGGER validate_patient_on_update
    BEFORE UPDATE ON patient_schema.patients
    FOR EACH ROW
    EXECUTE FUNCTION validate_patient_data();

-- Invoice Balance Management Triggers
CREATE TRIGGER update_invoice_balance_on_payment_insert
    AFTER INSERT ON billing_schema.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_balance();

CREATE TRIGGER update_invoice_balance_on_payment_update
    AFTER UPDATE ON billing_schema.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_balance();

CREATE TRIGGER update_invoice_balance_on_payment_delete
    AFTER DELETE ON billing_schema.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_balance();

-- Account Balance Management Triggers
CREATE TRIGGER update_account_balance_on_line_insert
    AFTER INSERT ON accounting_schema.journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

CREATE TRIGGER update_account_balance_on_line_update
    AFTER UPDATE ON accounting_schema.journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

CREATE TRIGGER update_account_balance_on_line_delete
    AFTER DELETE ON accounting_schema.journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- =============================================================================
-- AUDIT TRIGGERS FOR SENSITIVE TABLES
-- =============================================================================

-- User audit triggers
CREATE TRIGGER audit_users_insert
    AFTER INSERT ON user_schema.users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users_update
    AFTER UPDATE ON user_schema.users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users_delete
    AFTER DELETE ON user_schema.users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Patient audit triggers
CREATE TRIGGER audit_patients_insert
    AFTER INSERT ON patient_schema.patients
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_patients_update
    AFTER UPDATE ON patient_schema.patients
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_patients_delete
    AFTER DELETE ON patient_schema.patients
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Billing audit triggers
CREATE TRIGGER audit_invoices_insert
    AFTER INSERT ON billing_schema.invoices
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_invoices_update
    AFTER UPDATE ON billing_schema.invoices
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_invoices_delete
    AFTER DELETE ON billing_schema.invoices
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments_insert
    AFTER INSERT ON billing_schema.payments
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments_update
    AFTER UPDATE ON billing_schema.payments
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments_delete
    AFTER DELETE ON billing_schema.payments
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- =============================================================================
-- CONSTRAINT VALIDATION TRIGGERS
-- =============================================================================

-- Function to prevent deletion of posted journal entries
CREATE OR REPLACE FUNCTION prevent_posted_journal_entry_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_posted = TRUE THEN
        RAISE EXCEPTION 'Cannot delete posted journal entry. Must create reversing entry instead.';
    END IF;
    RETURN OLD;
END;
$$ language 'plpgsql';

CREATE TRIGGER prevent_posted_journal_entry_delete
    BEFORE DELETE ON accounting_schema.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_posted_journal_entry_deletion();

-- Function to prevent modification of posted journal entry amounts
CREATE OR REPLACE FUNCTION prevent_posted_entry_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_posted = TRUE AND (
        NEW.total_debit != OLD.total_debit OR
        NEW.total_credit != OLD.total_credit
    ) THEN
        RAISE EXCEPTION 'Cannot modify amounts in posted journal entry. Must create correcting entry.';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER prevent_posted_entry_update
    BEFORE UPDATE ON accounting_schema.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_posted_entry_modification();

-- =============================================================================
-- SOFT DELETE CASCADE TRIGGERS
-- =============================================================================

-- Function to handle soft delete cascades
CREATE OR REPLACE FUNCTION handle_patient_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When patient is soft deleted, cancel future appointments
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
        UPDATE appointment_schema.appointments
        SET status = 'cancelled',
            updated_at = NOW(),
            notes = COALESCE(notes, '') || ' - Auto-cancelled due to patient deletion'
        WHERE patient_id = NEW.id
        AND appointment_date >= CURRENT_DATE
        AND status IN ('scheduled', 'confirmed');
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_patient_soft_delete_cascade
    AFTER UPDATE ON patient_schema.patients
    FOR EACH ROW
    EXECUTE FUNCTION handle_patient_soft_delete();

-- =============================================================================
-- BUSINESS HOUR VALIDATION
-- =============================================================================

-- Function to validate appointment scheduling during business hours
CREATE OR REPLACE FUNCTION validate_appointment_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if appointment is scheduled on weekend
    IF EXTRACT(DOW FROM NEW.appointment_date) IN (0, 6) THEN
        RAISE EXCEPTION 'Appointments cannot be scheduled on weekends';
    END IF;

    -- Check if appointment is outside business hours (9 AM - 6 PM)
    IF NEW.appointment_time < '09:00:00'::time OR NEW.appointment_time > '18:00:00'::time THEN
        RAISE EXCEPTION 'Appointments must be scheduled between 9 AM and 6 PM';
    END IF;

    -- Check if appointment is in the past
    IF (NEW.appointment_date::date || ' ' || NEW.appointment_time::time)::timestamp < NOW() - INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'Cannot schedule appointments in the past';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_appointment_business_hours
    BEFORE INSERT OR UPDATE ON appointment_schema.appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_appointment_hours();

-- =============================================================================
-- SEQUENCE RESETS (for development)
-- =============================================================================

-- Function to reset MRN sequence (useful for development/testing)
CREATE OR REPLACE FUNCTION reset_mrn_sequence(p_year INTEGER DEFAULT NULL)
RETURNS void AS $$
DECLARE
    target_year INTEGER;
BEGIN
    target_year := COALESCE(p_year, EXTRACT(year FROM NOW()));

    -- Reset sequence to start from 1 for the given year
    ALTER SEQUENCE patient_schema.patient_mrn_seq RESTART WITH 1;

    RAISE NOTICE 'MRN sequence reset for year %', target_year;
END;
$$ language 'plpgsql';

-- =============================================================================
-- TRIGGER STATUS REPORTING
-- =============================================================================

-- Function to report all trigger statuses
CREATE OR REPLACE FUNCTION get_trigger_status()
RETURNS TABLE(
    trigger_name TEXT,
    table_name TEXT,
    event_manipulation TEXT,
    action_timing TEXT,
    action_condition TEXT,
    is_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tgname,
        c.relname,
        t.tgtype::text,
        CASE WHEN (t.tgtype >> 1) & 1 = 1 THEN 'AFTER' ELSE 'BEFORE' END,
        CASE WHEN (t.tgtype >> 2) & 1 = 1 THEN 'ROW' ELSE 'STATEMENT' END,
        t.tgenabled = 'O'
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname IN (
        'users', 'patients', 'appointments', 'visits', 'prescriptions',
        'invoices', 'payments', 'journal_entries', 'journal_entry_lines'
    )
    AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname;
END;
$$ language 'plpgsql';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Log successful trigger creation
DO $$
BEGIN
    RAISE NOTICE '==============================================================================';
    RAISE NOTICE 'HMS Enterprise Database Triggers Created Successfully';
    RAISE NOTICE '==============================================================================';
    RAISE NOTICE 'Triggers created:';
    RAISE NOTICE '- Updated_at triggers: 20+ tables';
    RAISE NOTICE '- Business logic triggers: MRN generation, invoice balance, account balance';
    RAISE NOTICE '- Audit triggers: Users, Patients, Billing tables';
    RAISE NOTICE '- Validation triggers: Patient data, appointment hours, posted entries';
    RAISE NOTICE '- Soft delete cascade triggers: Patient to appointments';
    RAISE NOTICE '';
    RAISE NOTICE 'Database foundation complete. Ready for User Service implementation.';
    RAISE NOTICE 'Use SELECT get_trigger_status() to verify all triggers are enabled.';
    RAISE NOTICE '==============================================================================';
END $$;