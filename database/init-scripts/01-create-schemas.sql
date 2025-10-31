-- ============================================
-- HMS Enterprise - Database Schema Creation
-- ============================================
-- Version: 1.0
-- Database: PostgreSQL 14+
-- Purpose: Create all schemas for HMS microservices
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing schemas if they exist (development only)
-- Comment out for production
DROP SCHEMA IF EXISTS patient_schema CASCADE;
DROP SCHEMA IF EXISTS appointment_schema CASCADE;
DROP SCHEMA IF EXISTS clinical_schema CASCADE;
DROP SCHEMA IF EXISTS billing_schema CASCADE;
DROP SCHEMA IF EXISTS accounting_schema CASCADE;
DROP SCHEMA IF EXISTS partner_schema CASCADE;
DROP SCHEMA IF EXISTS b2b_schema CASCADE;
DROP SCHEMA IF EXISTS camp_schema CASCADE;
DROP SCHEMA IF EXISTS user_schema CASCADE;
DROP SCHEMA IF EXISTS integration_schema CASCADE;

-- Create schemas
CREATE SCHEMA patient_schema;
CREATE SCHEMA appointment_schema;
CREATE SCHEMA clinical_schema;
CREATE SCHEMA billing_schema;
CREATE SCHEMA accounting_schema;
CREATE SCHEMA partner_schema;
CREATE SCHEMA b2b_schema;
CREATE SCHEMA camp_schema;
CREATE SCHEMA user_schema;
CREATE SCHEMA integration_schema;

-- Grant permissions
GRANT USAGE ON SCHEMA patient_schema TO hmsuser;
GRANT USAGE ON SCHEMA appointment_schema TO hmsuser;
GRANT USAGE ON SCHEMA clinical_schema TO hmsuser;
GRANT USAGE ON SCHEMA billing_schema TO hmsuser;
GRANT USAGE ON SCHEMA accounting_schema TO hmsuser;
GRANT USAGE ON SCHEMA partner_schema TO hmsuser;
GRANT USAGE ON SCHEMA b2b_schema TO hmsuser;
GRANT USAGE ON SCHEMA camp_schema TO hmsuser;
GRANT USAGE ON SCHEMA user_schema TO hmsuser;
GRANT USAGE ON SCHEMA integration_schema TO hmsuser;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA patient_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA appointment_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA clinical_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA billing_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA accounting_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA partner_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA b2b_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA camp_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA user_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA integration_schema TO hmsuser;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA patient_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA appointment_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA clinical_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA billing_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA accounting_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA partner_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA b2b_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA camp_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA user_schema TO hmsuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA integration_schema TO hmsuser;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA patient_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA appointment_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA clinical_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA billing_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA accounting_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA partner_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA b2b_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA camp_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA user_schema GRANT ALL ON TABLES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA integration_schema GRANT ALL ON TABLES TO hmsuser;

ALTER DEFAULT PRIVILEGES IN SCHEMA patient_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA appointment_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA clinical_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA billing_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA accounting_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA partner_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA b2b_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA camp_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA user_schema GRANT ALL ON SEQUENCES TO hmsuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA integration_schema GRANT ALL ON SEQUENCES TO hmsuser;

-- Create sequences
CREATE SEQUENCE patient_schema.patient_mrn_seq START 1;
CREATE SEQUENCE billing_schema.invoice_seq START 1;
CREATE SEQUENCE billing_schema.payment_seq START 1;
CREATE SEQUENCE accounting_schema.journal_entry_seq START 1;
CREATE SEQUENCE partner_schema.partner_bill_seq START 1;
CREATE SEQUENCE b2b_schema.b2b_invoice_seq START 1;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ All schemas created successfully';
    RAISE NOTICE '✓ Permissions granted to hmsuser';
    RAISE NOTICE '✓ Sequences created';
    RAISE NOTICE '';
    RAISE NOTICE 'Created schemas:';
    RAISE NOTICE '  - patient_schema';
    RAISE NOTICE '  - appointment_schema';
    RAISE NOTICE '  - clinical_schema';
    RAISE NOTICE '  - billing_schema';
    RAISE NOTICE '  - accounting_schema';
    RAISE NOTICE '  - partner_schema';
    RAISE NOTICE '  - b2b_schema';
    RAISE NOTICE '  - camp_schema';
    RAISE NOTICE '  - user_schema';
    RAISE NOTICE '  - integration_schema';
END $$;
