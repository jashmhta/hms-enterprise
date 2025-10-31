# Product Design Document (PDD)
## HMS - Hospital Management System with ERP

**Version:** 1.0
**Date:** November 2024
**Document Type:** Technical Specification
**Status:** Detailed Design

---

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Database Design](#2-database-design)
3. [API Specifications](#3-api-specifications)
4. [Security Design](#4-security-design)
5. [Integration Design](#5-integration-design)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Performance Specifications](#8-performance-specifications)
9. [Testing Strategy](#9-testing-strategy)
10. [Development Workflow](#10-development-workflow)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Web App     │  │  Mobile App  │  │  Partner Portal    │   │
│  │  (React)     │  │  (Flutter)   │  │  (React)           │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST
┌────────────────────────────┴────────────────────────────────────┐
│                       API Gateway Layer                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Kong API Gateway / NGINX                                 │   │
│  │  - Authentication        - Rate Limiting                  │   │
│  │  - Load Balancing        - Request Routing                │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                     Microservices Layer                          │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Patient   │  │Appointment│  │ Clinical │  │   Billing    │ │
│  │ Service   │  │  Service  │  │ Service  │  │   Service    │ │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│  ┌─────┴─────┐  ┌─────┴─────┐  ┌────┴─────┐  ┌──────┴───────┐ │
│  │Accounting │  │  Partner  │  │   B2B    │  │    Camp      │ │
│  │ Service   │  │  Service  │  │ Service  │  │   Service    │ │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│  ┌─────┴─────┐  ┌─────┴─────┐  ┌────┴─────────────────────┐   │
│  │   User    │  │Integration│  │    Notification          │   │
│  │  Service  │  │  Service  │  │       Service            │   │
│  └───────────┘  └───────────┘  └──────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                      Event Bus (Redis Pub/Sub)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Event: PatientRegistered, InvoiceCreated,               │   │
│  │         PaymentReceived, OutsourcedServiceCompleted      │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                         Data Layer                               │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐   │
│  │ PostgreSQL │  │   Redis    │  │  MinIO/  │  │  Elastic │   │
│  │  (Primary) │  │  (Cache)   │  │   S3     │  │  Search  │   │
│  └────────────┘  └────────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                    External Integrations                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   ABDM   │  │ Payment  │  │  SMS/    │  │  E-Invoice   │   │
│  │   APIs   │  │ Gateway  │  │  Email   │  │  (GST)       │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Microservices Design

#### 1.2.1 Patient Service
**Responsibilities:**
- Patient registration and demographics
- ABHA integration
- Patient search and history
- Medical record number (MRN) generation

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (patient schema)
**Ports:** 3001

**Key APIs:**
- POST /api/patients - Create patient
- GET /api/patients/:id - Get patient details
- PUT /api/patients/:id - Update patient
- GET /api/patients/search?q={query} - Search patients
- POST /api/patients/abha - Create/verify ABHA
- GET /api/patients/:id/visits - Get visit history

#### 1.2.2 Appointment Service
**Responsibilities:**
- Appointment scheduling
- Doctor availability management
- Queue management
- Token generation

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (appointment schema)
**Cache:** Redis (for real-time queue status)
**Ports:** 3002

**Key APIs:**
- POST /api/appointments - Book appointment
- GET /api/appointments/:id - Get appointment details
- PUT /api/appointments/:id - Update appointment
- DELETE /api/appointments/:id - Cancel appointment
- GET /api/appointments/slots?doctorId={id}&date={date} - Available slots
- GET /api/queue/status - Current queue status

#### 1.2.3 Clinical Service
**Responsibilities:**
- Electronic Health Records (EHR)
- Prescriptions
- Investigation orders
- Clinical templates
- Visit notes

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (clinical schema)
**File Storage:** MinIO/S3
**Ports:** 3003

**Key APIs:**
- POST /api/visits - Create visit
- GET /api/visits/:id - Get visit details
- PUT /api/visits/:id - Update visit
- POST /api/prescriptions - Create prescription
- POST /api/investigations - Order investigation
- GET /api/patients/:id/medical-history - Medical history

#### 1.2.4 Billing Service
**Responsibilities:**
- Invoice generation
- Payment processing
- Service pricing
- Payment mode handling
- Receipt generation

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (billing schema)
**Message Queue:** Bull (Redis)
**Ports:** 3004

**Key APIs:**
- POST /api/invoices - Create invoice
- GET /api/invoices/:id - Get invoice
- POST /api/payments - Record payment
- GET /api/invoices/:id/receipt - Generate receipt (PDF)
- GET /api/services - Get service price list
- POST /api/invoices/:id/email - Email invoice

**Events Published:**
- InvoiceCreated
- PaymentReceived
- InvoiceUpdated

#### 1.2.5 Accounting Service
**Responsibilities:**
- Chart of accounts
- Journal entries
- Ledger management
- Financial reports
- Double-entry bookkeeping
- GST calculations

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (accounting schema)
**Library:** Custom double-entry engine (inspired by medici/ale)
**Ports:** 3005

**Key APIs:**
- POST /api/accounts - Create account
- GET /api/accounts - List accounts
- POST /api/journal-entries - Create journal entry
- GET /api/ledger/:accountId - Get ledger
- GET /api/reports/trial-balance - Trial balance
- GET /api/reports/profit-loss - P&L statement
- GET /api/reports/balance-sheet - Balance sheet
- GET /api/gst/summary?month={month} - GST summary

**Events Consumed:**
- InvoiceCreated → Create revenue entry
- PaymentReceived → Create cash/bank entry
- OutsourcedServiceCompleted → Create expense entry

#### 1.2.6 Partner Service
**Responsibilities:**
- Outsourced service provider management
- Service-provider mapping
- Cost and payout configuration
- Reconciliation with provider bills

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (partner schema)
**Ports:** 3006

**Key APIs:**
- POST /api/partners - Create partner
- GET /api/partners - List partners
- POST /api/partner-services - Map service to partner
- GET /api/partner-services/:partnerId - Partner services
- POST /api/partner-bills - Record partner bill
- GET /api/reconciliation/:partnerId?month={month} - Reconciliation report

**Events Published:**
- OutsourcedServiceCompleted

#### 1.2.7 B2B Service
**Responsibilities:**
- Corporate client management
- Contract and discount rules
- Auto-apply discounts
- Monthly invoice consolidation
- Receivables tracking

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (b2b schema)
**Ports:** 3007

**Key APIs:**
- POST /api/b2b/clients - Create corporate client
- GET /api/b2b/clients - List clients
- POST /api/b2b/contracts - Create contract
- GET /api/b2b/invoices/generate?clientId={id}&month={month} - Generate monthly invoice
- GET /api/b2b/receivables - Aging report

#### 1.2.8 Camp Service
**Responsibilities:**
- Health camp management
- Camp-specific billing
- Camp inventory
- Camp reports

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (camp schema)
**Ports:** 3008

**Key APIs:**
- POST /api/camps - Create camp
- GET /api/camps - List camps
- GET /api/camps/:id - Camp details
- POST /api/camps/:id/patients - Register patient to camp
- GET /api/camps/:id/reports/financial - Camp P&L

#### 1.2.9 User Service
**Responsibilities:**
- User authentication
- Authorization (RBAC)
- User management
- Role and permission management

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (user schema)
**Cache:** Redis (for session/JWT blacklist)
**Ports:** 3009

**Key APIs:**
- POST /api/auth/login - Login
- POST /api/auth/refresh - Refresh token
- POST /api/auth/logout - Logout
- POST /api/users - Create user
- GET /api/users/:id - Get user
- PUT /api/users/:id - Update user
- POST /api/roles - Create role
- GET /api/permissions - List all permissions

#### 1.2.10 Integration Service
**Responsibilities:**
- ABDM API integration
- Payment gateway integration
- SMS/Email API integration
- GST e-invoice API integration

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (integration logs)
**Message Queue:** Bull (for retry logic)
**Ports:** 3010

**Key APIs:**
- POST /api/integrations/abdm/abha/create - Create ABHA
- POST /api/integrations/abdm/abha/verify - Verify ABHA
- POST /api/integrations/payment/initiate - Initiate payment
- POST /api/integrations/payment/verify - Verify payment
- POST /api/integrations/sms/send - Send SMS
- POST /api/integrations/email/send - Send email
- POST /api/integrations/gst/generate-irn - Generate e-invoice IRN

#### 1.2.11 Notification Service
**Responsibilities:**
- Centralized notification handling
- SMS notifications
- Email notifications
- Push notifications (future)
- WhatsApp notifications (future)

**Technology:** Node.js + Express + TypeScript
**Database:** PostgreSQL (notification logs)
**Message Queue:** Bull (async processing)
**Ports:** 3011

**Events Consumed:**
- AppointmentBooked → Send appointment confirmation
- InvoiceCreated → Send invoice email
- PaymentReceived → Send receipt SMS

### 1.3 Communication Patterns

#### 1.3.1 Synchronous Communication (REST)
**Use Cases:**
- Real-time operations (patient registration, billing)
- User-facing APIs
- Operations requiring immediate response

**Implementation:**
- HTTP/HTTPS with JSON
- Standard REST conventions
- Response format:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2024-11-01T10:30:00Z"
}
```

#### 1.3.2 Asynchronous Communication (Event Bus)
**Use Cases:**
- Inter-service communication
- Background processing
- Eventual consistency scenarios

**Implementation:**
- Redis Pub/Sub for event bus
- Event format:
```json
{
  "eventId": "uuid",
  "eventType": "InvoiceCreated",
  "timestamp": "2024-11-01T10:30:00Z",
  "source": "billing-service",
  "data": { ... }
}
```

**Key Events:**
- PatientRegistered
- AppointmentBooked
- AppointmentCancelled
- VisitCreated
- InvoiceCreated
- PaymentReceived
- OutsourcedServiceCompleted
- B2BInvoiceGenerated

#### 1.3.3 Message Queue (Background Jobs)
**Use Cases:**
- PDF generation
- Email sending
- Report generation
- External API calls (with retry)

**Implementation:**
- Bull (Redis-based queue)
- Job priority levels
- Retry strategy (exponential backoff)
- Dead letter queue

---

## 2. Database Design

### 2.1 Database Strategy

**Approach:** Database-per-service (logical separation)
**Database:** PostgreSQL 14+
**Schema Organization:** One PostgreSQL instance with multiple schemas (one per service)

**Rationale:**
- Cost-effective for small-medium deployments
- ACID compliance for financial data
- Easy backup and disaster recovery
- Can migrate to separate instances if needed

**Schemas:**
- `patient_schema`
- `appointment_schema`
- `clinical_schema`
- `billing_schema`
- `accounting_schema`
- `partner_schema`
- `b2b_schema`
- `camp_schema`
- `user_schema`
- `integration_schema`

### 2.2 Core Database Schema

#### 2.2.1 Patient Schema

```sql
-- patient_schema.patients
CREATE TABLE patient_schema.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn VARCHAR(20) UNIQUE NOT NULL, -- Medical Record Number
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
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
    abha_number VARCHAR(17) UNIQUE, -- 14 digits + hyphens
    abha_address VARCHAR(100),
    health_id_verified BOOLEAN DEFAULT FALSE,

    -- Identifiers
    aadhaar_number VARCHAR(12), -- Encrypted
    pan_number VARCHAR(10),

    -- Medical
    allergies TEXT[],
    chronic_conditions TEXT[],

    -- Metadata
    photo_url VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_schema.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_patients_mrn ON patient_schema.patients(mrn);
CREATE INDEX idx_patients_mobile ON patient_schema.patients(mobile);
CREATE INDEX idx_patients_abha ON patient_schema.patients(abha_number);
CREATE INDEX idx_patients_name ON patient_schema.patients(first_name, last_name);

-- patient_schema.patient_documents
CREATE TABLE patient_schema.patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patient_schema.patients(id) ON DELETE CASCADE,
    document_type VARCHAR(50), -- 'report', 'prescription', 'image', 'other'
    document_name VARCHAR(200),
    file_url VARCHAR(500),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES user_schema.users(id)
);
```

#### 2.2.2 Appointment Schema

```sql
-- appointment_schema.appointments
CREATE TABLE appointment_schema.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL, -- References patient_schema.patients(id)
    doctor_id UUID NOT NULL, -- References user_schema.users(id)

    -- Appointment details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 15,
    appointment_type VARCHAR(50), -- 'consultation', 'follow-up', 'procedure'

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'
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

CREATE INDEX idx_appointments_patient ON appointment_schema.appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointment_schema.appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointment_schema.appointments(appointment_date, appointment_time);
CREATE INDEX idx_appointments_status ON appointment_schema.appointments(status);

-- appointment_schema.doctor_schedules
CREATE TABLE appointment_schema.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL,
    day_of_week INTEGER, -- 0 = Sunday, 6 = Saturday
    start_time TIME,
    end_time TIME,
    slot_duration_minutes INTEGER DEFAULT 15,
    max_appointments INTEGER,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### 2.2.3 Clinical Schema

```sql
-- clinical_schema.visits
CREATE TABLE clinical_schema.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    appointment_id UUID, -- References appointment_schema.appointments(id)

    -- Visit details
    visit_date DATE NOT NULL,
    visit_type VARCHAR(50), -- 'opd', 'emergency', 'follow-up'

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

CREATE INDEX idx_visits_patient ON clinical_schema.visits(patient_id);
CREATE INDEX idx_visits_doctor ON clinical_schema.visits(doctor_id);
CREATE INDEX idx_visits_date ON clinical_schema.visits(visit_date);

-- clinical_schema.prescriptions
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

-- clinical_schema.prescription_items
CREATE TABLE clinical_schema.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES clinical_schema.prescriptions(id) ON DELETE CASCADE,

    -- Medicine
    medicine_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100), -- '500mg', '5ml'
    frequency VARCHAR(100), -- 'Twice daily', 'TDS'
    duration VARCHAR(100), -- '7 days', '2 weeks'
    route VARCHAR(50), -- 'Oral', 'Topical'
    instructions TEXT,

    sequence_number INTEGER
);

-- clinical_schema.investigations
CREATE TABLE clinical_schema.investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES clinical_schema.visits(id),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,

    -- Investigation
    investigation_type VARCHAR(100), -- 'lab', 'imaging', 'other'
    investigation_name VARCHAR(200) NOT NULL,
    service_id UUID, -- References billing_schema.services(id)

    -- Status
    status VARCHAR(50) DEFAULT 'ordered', -- 'ordered', 'sample-collected', 'in-progress', 'completed', 'cancelled'
    ordered_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Report
    report_url VARCHAR(500),
    report_findings TEXT,

    -- Outsourced
    is_outsourced BOOLEAN DEFAULT FALSE,
    partner_id UUID -- References partner_schema.partners(id)
);
```

#### 2.2.4 Billing Schema

```sql
-- billing_schema.services
CREATE TABLE billing_schema.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code VARCHAR(50) UNIQUE NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    service_category VARCHAR(100), -- 'consultation', 'lab', 'imaging', 'procedure'

    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL,
    discount_allowed BOOLEAN DEFAULT TRUE,

    -- Tax
    hsn_sac_code VARCHAR(20),
    gst_rate DECIMAL(5, 2) DEFAULT 0, -- 0, 5, 12, 18
    is_gst_exempt BOOLEAN DEFAULT FALSE,

    -- Outsourced
    is_outsourced BOOLEAN DEFAULT FALSE,
    partner_id UUID, -- References partner_schema.partners(id)
    partner_cost DECIMAL(10, 2),

    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_code ON billing_schema.services(service_code);
CREATE INDEX idx_services_category ON billing_schema.services(service_category);

-- billing_schema.invoices
CREATE TABLE billing_schema.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,

    -- Patient
    patient_id UUID NOT NULL,
    patient_name VARCHAR(200),
    patient_mobile VARCHAR(15),

    -- Related entities
    visit_id UUID, -- References clinical_schema.visits(id)
    doctor_id UUID,

    -- B2B
    is_b2b BOOLEAN DEFAULT FALSE,
    b2b_client_id UUID, -- References b2b_schema.clients(id)

    -- Camp
    camp_id UUID, -- References camp_schema.camps(id)

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
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'

    -- E-Invoice
    irn VARCHAR(100), -- Invoice Reference Number from GST portal
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

CREATE INDEX idx_invoices_number ON billing_schema.invoices(invoice_number);
CREATE INDEX idx_invoices_patient ON billing_schema.invoices(patient_id);
CREATE INDEX idx_invoices_date ON billing_schema.invoices(invoice_date);
CREATE INDEX idx_invoices_b2b ON billing_schema.invoices(b2b_client_id) WHERE is_b2b = TRUE;

-- billing_schema.invoice_items
CREATE TABLE billing_schema.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES billing_schema.invoices(id) ON DELETE CASCADE,

    -- Service
    service_id UUID REFERENCES billing_schema.services(id),
    service_name VARCHAR(200) NOT NULL,
    service_code VARCHAR(50),

    -- Pricing
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    taxable_amount DECIMAL(10, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) DEFAULT 0,
    cgst_amount DECIMAL(10, 2) DEFAULT 0,
    sgst_amount DECIMAL(10, 2) DEFAULT 0,
    igst_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,

    -- Outsourced
    is_outsourced BOOLEAN DEFAULT FALSE,
    partner_id UUID,
    partner_cost DECIMAL(10, 2),

    sequence_number INTEGER
);

-- billing_schema.payments
CREATE TABLE billing_schema.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES billing_schema.invoices(id),

    -- Payment details
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(12, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL, -- 'cash', 'card', 'upi', 'bank_transfer', 'cheque'

    -- Mode-specific
    transaction_id VARCHAR(100), -- For UPI/card
    cheque_number VARCHAR(50),
    cheque_date DATE,
    bank_name VARCHAR(100),

    -- Payment gateway
    gateway_name VARCHAR(50), -- 'razorpay', 'paytm', 'cashfree'
    gateway_payment_id VARCHAR(100),
    gateway_order_id VARCHAR(100),

    -- Metadata
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX idx_payments_invoice ON billing_schema.payments(invoice_id);
CREATE INDEX idx_payments_date ON billing_schema.payments(payment_date);
```

#### 2.2.5 Accounting Schema

```sql
-- accounting_schema.chart_of_accounts
CREATE TABLE accounting_schema.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    account_subtype VARCHAR(50), -- 'current_asset', 'fixed_asset', 'accounts_payable', etc.
    parent_account_id UUID REFERENCES accounting_schema.chart_of_accounts(id),

    -- Balance
    normal_balance VARCHAR(10), -- 'debit' or 'credit'
    current_balance DECIMAL(15, 2) DEFAULT 0,

    -- Metadata
    description TEXT,
    is_system_account BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coa_code ON accounting_schema.chart_of_accounts(account_code);
CREATE INDEX idx_coa_type ON accounting_schema.chart_of_accounts(account_type);

-- Predefined System Accounts
-- 1000: Assets
-- 1100: Current Assets
-- 1110: Cash
-- 1120: Bank
-- 1130: Accounts Receivable
-- 1140: Accounts Receivable - B2B
-- 2000: Liabilities
-- 2100: Current Liabilities
-- 2110: Accounts Payable
-- 2120: Accounts Payable - Partners
-- 2130: GST Payable
-- 2140: TDS Payable
-- 3000: Equity
-- 4000: Revenue
-- 4100: Service Revenue
-- 4110: Consultation Revenue
-- 4120: Lab Revenue
-- 4130: Imaging Revenue
-- 4140: Procedure Revenue
-- 5000: Expenses
-- 5100: Cost of Services
-- 5110: Outsourced Lab Costs
-- 5120: Outsourced Imaging Costs
-- 5200: Operating Expenses
-- 5210: Doctor Payments
-- 5220: Staff Salaries
-- 5230: Rent
-- 5240: Utilities

-- accounting_schema.journal_entries
CREATE TABLE accounting_schema.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(50), -- 'standard', 'invoice', 'payment', 'adjustment'

    -- Reference
    reference_type VARCHAR(50), -- 'invoice', 'payment', 'partner_bill', 'salary', 'manual'
    reference_id UUID, -- ID of referenced entity
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

CREATE INDEX idx_je_number ON accounting_schema.journal_entries(entry_number);
CREATE INDEX idx_je_date ON accounting_schema.journal_entries(entry_date);
CREATE INDEX idx_je_reference ON accounting_schema.journal_entries(reference_type, reference_id);

-- accounting_schema.journal_entry_lines
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

CREATE INDEX idx_jel_entry ON accounting_schema.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON accounting_schema.journal_entry_lines(account_id);
CREATE INDEX idx_jel_date_account ON accounting_schema.journal_entry_lines(account_id, (SELECT entry_date FROM accounting_schema.journal_entries WHERE id = journal_entry_id));

-- accounting_schema.gst_invoices
CREATE TABLE accounting_schema.gst_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL, -- References billing_schema.invoices(id)
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,

    -- Party
    party_type VARCHAR(20), -- 'patient', 'b2b_client', 'partner'
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
    gstr1_period VARCHAR(10), -- 'MM-YYYY'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gst_invoices_number ON accounting_schema.gst_invoices(invoice_number);
CREATE INDEX idx_gst_invoices_date ON accounting_schema.gst_invoices(invoice_date);
CREATE INDEX idx_gst_invoices_period ON accounting_schema.gst_invoices(gstr1_period);
```

#### 2.2.6 Partner Schema

```sql
-- partner_schema.partners
CREATE TABLE partner_schema.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code VARCHAR(20) UNIQUE NOT NULL,
    partner_name VARCHAR(200) NOT NULL,
    partner_type VARCHAR(50) NOT NULL, -- 'lab', 'imaging', 'pharmacy', 'consultant'

    -- Contact
    contact_person VARCHAR(100),
    mobile VARCHAR(15),
    email VARCHAR(100),
    address TEXT,

    -- Business
    gstin VARCHAR(15),
    pan VARCHAR(10),

    -- Payment terms
    payment_terms VARCHAR(100), -- 'Net 30', 'Immediate'
    payment_frequency VARCHAR(50), -- 'monthly', 'weekly', 'per_transaction'

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

-- partner_schema.partner_services
CREATE TABLE partner_schema.partner_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partner_schema.partners(id) ON DELETE CASCADE,
    service_id UUID, -- References billing_schema.services(id)

    -- Pricing
    cost_to_partner DECIMAL(10, 2) NOT NULL,
    payout_type VARCHAR(20) DEFAULT 'fixed', -- 'fixed', 'percentage'
    payout_value DECIMAL(10, 2) NOT NULL, -- Amount or percentage

    -- Metadata
    effective_from DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE
);

-- partner_schema.partner_bills
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
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'
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

-- partner_schema.partner_transactions
CREATE TABLE partner_schema.partner_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partner_schema.partners(id),

    -- Related entities
    invoice_id UUID, -- References billing_schema.invoices(id)
    invoice_item_id UUID, -- References billing_schema.invoice_items(id)
    investigation_id UUID, -- References clinical_schema.investigations(id)

    -- Service
    service_id UUID,
    service_name VARCHAR(200),

    -- Transaction
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50), -- 'service_completed', 'bill_received', 'payment_made'

    -- Amounts
    service_charge DECIMAL(10, 2), -- What we charged patient
    partner_cost DECIMAL(10, 2), -- What we owe partner
    margin DECIMAL(10, 2), -- Our margin

    -- Status
    is_billed BOOLEAN DEFAULT FALSE,
    partner_bill_id UUID REFERENCES partner_schema.partner_bills(id),
    is_paid BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partner_transactions_partner ON partner_schema.partner_transactions(partner_id);
CREATE INDEX idx_partner_transactions_date ON partner_schema.partner_transactions(transaction_date);
CREATE INDEX idx_partner_transactions_invoice ON partner_schema.partner_transactions(invoice_id);
```

#### 2.2.7 B2B Schema

```sql
-- b2b_schema.clients
CREATE TABLE b2b_schema.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code VARCHAR(20) UNIQUE NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    client_type VARCHAR(50), -- 'corporate', 'insurance', 'government'

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
    payment_terms VARCHAR(100), -- 'Net 30', 'Net 45'
    credit_limit DECIMAL(12, 2),

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- b2b_schema.client_contracts
CREATE TABLE b2b_schema.client_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES b2b_schema.clients(id) ON DELETE CASCADE,
    contract_number VARCHAR(50) UNIQUE NOT NULL,

    -- Contract details
    contract_name VARCHAR(200),
    contract_type VARCHAR(50), -- 'employee_health', 'health_checkup', 'wellness_program'
    start_date DATE NOT NULL,
    end_date DATE,

    -- Pricing
    discount_type VARCHAR(20), -- 'flat', 'percentage'
    discount_value DECIMAL(10, 2),

    -- Scope
    applicable_services UUID[], -- Array of service IDs
    applicable_all_services BOOLEAN DEFAULT FALSE,

    -- Limits
    max_amount_per_employee DECIMAL(12, 2),
    max_visits_per_employee INTEGER,

    -- Metadata
    contract_document_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- b2b_schema.client_employees
CREATE TABLE b2b_schema.client_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES b2b_schema.clients(id),

    -- Employee details
    employee_id VARCHAR(50) NOT NULL, -- Client's employee ID
    employee_name VARCHAR(200),
    designation VARCHAR(100),
    department VARCHAR(100),
    mobile VARCHAR(15),
    email VARCHAR(100),

    -- Mapping
    patient_id UUID, -- References patient_schema.patients(id)

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

-- b2b_schema.b2b_invoices
CREATE TABLE b2b_schema.b2b_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    b2b_invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES b2b_schema.clients(id),

    -- Invoice period
    invoice_period VARCHAR(10), -- 'MM-YYYY'
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
    payment_status VARCHAR(20) DEFAULT 'unpaid',
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

-- b2b_schema.b2b_invoice_items
CREATE TABLE b2b_schema.b2b_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    b2b_invoice_id UUID REFERENCES b2b_schema.b2b_invoices(id) ON DELETE CASCADE,

    -- Related
    patient_invoice_id UUID, -- References billing_schema.invoices(id)
    patient_name VARCHAR(200),
    employee_id VARCHAR(50),
    service_date DATE,

    -- Amount
    gross_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    net_amount DECIMAL(10, 2),

    sequence_number INTEGER
);
```

#### 2.2.8 Camp Schema

```sql
-- camp_schema.camps
CREATE TABLE camp_schema.camps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_code VARCHAR(20) UNIQUE NOT NULL,
    camp_name VARCHAR(200) NOT NULL,
    camp_type VARCHAR(50), -- 'diabetes_screening', 'eye_checkup', 'dental', 'general'

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
    organized_by VARCHAR(200), -- 'Self', 'Corporate', 'NGO'
    organizer_contact VARCHAR(100),

    -- Financial
    budget DECIMAL(12, 2),
    package_price DECIMAL(10, 2), -- Per participant

    -- Status
    status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'in-progress', 'completed', 'cancelled'

    -- Metadata
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- camp_schema.camp_registrations
CREATE TABLE camp_schema.camp_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID REFERENCES camp_schema.camps(id) ON DELETE CASCADE,
    patient_id UUID, -- References patient_schema.patients(id)

    -- Registration
    registration_number VARCHAR(50),
    registration_date DATE NOT NULL,

    -- Attendance
    attended BOOLEAN DEFAULT FALSE,
    attendance_time TIMESTAMPTZ,

    -- Services
    services_availed TEXT[],

    -- Billing
    invoice_id UUID, -- References billing_schema.invoices(id)

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- camp_schema.camp_expenses
CREATE TABLE camp_schema.camp_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID REFERENCES camp_schema.camps(id) ON DELETE CASCADE,

    -- Expense
    expense_date DATE NOT NULL,
    expense_category VARCHAR(100), -- 'venue', 'equipment', 'staff', 'marketing', 'consumables'
    expense_description TEXT,
    amount DECIMAL(10, 2) NOT NULL,

    -- Payment
    paid_to VARCHAR(200),
    payment_mode VARCHAR(50),

    -- Accounting
    journal_entry_id UUID, -- References accounting_schema.journal_entries(id)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);
```

#### 2.2.9 User Schema

```sql
-- user_schema.users
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
    user_type VARCHAR(50) NOT NULL, -- 'admin', 'doctor', 'receptionist', 'accountant', 'pharmacist', 'lab_technician'

    -- For doctors
    is_doctor BOOLEAN DEFAULT FALSE,
    specialization VARCHAR(100),
    qualification VARCHAR(200),
    medical_registration_number VARCHAR(50), -- MCI registration
    hpr_id VARCHAR(50), -- Health Professional Registry ID
    consultation_fee DECIMAL(10, 2),
    revenue_share_percentage DECIMAL(5, 2), -- For visiting consultants

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

CREATE INDEX idx_users_username ON user_schema.users(username);
CREATE INDEX idx_users_email ON user_schema.users(email);
CREATE INDEX idx_users_type ON user_schema.users(user_type);

-- user_schema.roles
CREATE TABLE user_schema.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_display_name VARCHAR(100),
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predefined roles
-- 1. Super Admin
-- 2. Admin
-- 3. Doctor
-- 4. Receptionist
-- 5. Accountant
-- 6. Pharmacist
-- 7. Lab Technician
-- 8. B2B Manager

-- user_schema.permissions
CREATE TABLE user_schema.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(100) UNIQUE NOT NULL, -- 'patient.create', 'invoice.delete', 'report.financial.view'
    permission_name VARCHAR(200),
    module VARCHAR(50), -- 'patient', 'billing', 'accounting', 'clinical'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_schema.role_permissions
CREATE TABLE user_schema.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES user_schema.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES user_schema.permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, permission_id)
);

-- user_schema.user_roles
CREATE TABLE user_schema.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_schema.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES user_schema.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID,
    UNIQUE(user_id, role_id)
);

-- user_schema.audit_logs
CREATE TABLE user_schema.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'create', 'update', 'delete'
    entity_type VARCHAR(50), -- 'patient', 'invoice', 'payment'
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON user_schema.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON user_schema.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON user_schema.audit_logs(timestamp);
```

### 2.3 Database Relationships Diagram

```
patients (1) ----< (N) appointments
patients (1) ----< (N) visits
patients (1) ----< (N) invoices
patients (1) ----< (N) camp_registrations
patients (1) ---- (0-1) client_employees

users (doctor) (1) ----< (N) appointments
users (doctor) (1) ----< (N) visits

visits (1) ----< (N) prescriptions
visits (1) ----< (N) investigations

invoices (1) ----< (N) invoice_items
invoices (1) ----< (N) payments

invoice_items (N) ---- (1) services
invoice_items (N) ---- (0-1) partners

partners (1) ----< (N) partner_services
partners (1) ----< (N) partner_bills
partners (1) ----< (N) partner_transactions

clients (1) ----< (N) client_contracts
clients (1) ----< (N) client_employees
clients (1) ----< (N) b2b_invoices

camps (1) ----< (N) camp_registrations
camps (1) ----< (N) camp_expenses

users (1) ----< (N) user_roles
roles (1) ----< (N) user_roles
roles (1) ----< (N) role_permissions
permissions (1) ----< (N) role_permissions
```

### 2.4 Database Triggers and Functions

```sql
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patient_schema.patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate MRN (Medical Record Number)
CREATE OR REPLACE FUNCTION generate_mrn()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mrn IS NULL THEN
        NEW.mrn := 'MRN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('patient_mrn_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE patient_mrn_seq START 1;
CREATE TRIGGER generate_patient_mrn BEFORE INSERT ON patient_schema.patients
    FOR EACH ROW EXECUTE FUNCTION generate_mrn();

-- Update invoice balance on payment
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE billing_schema.invoices
    SET paid_amount = (SELECT COALESCE(SUM(payment_amount), 0) FROM billing_schema.payments WHERE invoice_id = NEW.invoice_id),
        balance_amount = total_amount - (SELECT COALESCE(SUM(payment_amount), 0) FROM billing_schema.payments WHERE invoice_id = NEW.invoice_id),
        payment_status = CASE
            WHEN total_amount = (SELECT COALESCE(SUM(payment_amount), 0) FROM billing_schema.payments WHERE invoice_id = NEW.invoice_id) THEN 'paid'
            WHEN (SELECT COALESCE(SUM(payment_amount), 0) FROM billing_schema.payments WHERE invoice_id = NEW.invoice_id) > 0 THEN 'partial'
            ELSE 'unpaid'
        END
    WHERE id = NEW.invoice_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoice_on_payment AFTER INSERT ON billing_schema.payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_balance();

-- Update account balance on journal entry line
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE accounting_schema.chart_of_accounts
    SET current_balance = current_balance +
        CASE
            WHEN normal_balance = 'debit' THEN NEW.debit_amount - NEW.credit_amount
            ELSE NEW.credit_amount - NEW.debit_amount
        END
    WHERE id = NEW.account_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_account_on_journal_line AFTER INSERT ON accounting_schema.journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION update_account_balance();
```

---

## 3. API Specifications

### 3.1 API Design Principles

**Standards:**
- RESTful API design
- JSON request/response format
- HTTP status codes
- Versioning: `/api/v1/*`

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2024-11-01T10:30:00Z",
    "requestId": "uuid",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**Error Format:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "mobile",
        "message": "Invalid mobile number format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-11-01T10:30:00Z",
    "requestId": "uuid"
  }
}
```

### 3.2 Authentication APIs

#### POST /api/v1/auth/login
Login user and get JWT token

**Request:**
```json
{
  "username": "dr.sharma@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "dr.sharma",
      "email": "dr.sharma@example.com",
      "firstName": "Rajesh",
      "lastName": "Sharma",
      "userType": "doctor",
      "roles": ["doctor"],
      "permissions": ["patient.view", "patient.create", ...]
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600
  }
}
```

#### POST /api/v1/auth/refresh
Refresh access token

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "expiresIn": 3600
  }
}
```

### 3.3 Patient APIs

#### POST /api/v1/patients
Create new patient

**Request:**
```json
{
  "firstName": "Amit",
  "lastName": "Kumar",
  "dateOfBirth": "1985-06-15",
  "gender": "male",
  "mobile": "9876543210",
  "email": "amit.kumar@example.com",
  "address": {
    "line1": "123 MG Road",
    "line2": "Near City Mall",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001"
  },
  "abhaNumber": "12-3456-7890-1234",
  "bloodGroup": "O+"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "mrn": "MRN20241101000123",
    "firstName": "Amit",
    "lastName": "Kumar",
    ...
    "createdAt": "2024-11-01T10:30:00Z"
  }
}
```

#### GET /api/v1/patients/:id
Get patient details

#### GET /api/v1/patients/search?q={query}
Search patients by name, MRN, mobile

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "mrn": "MRN20241101000123",
      "firstName": "Amit",
      "lastName": "Kumar",
      "mobile": "9876543210",
      "age": 39
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

### 3.4 Billing APIs

#### POST /api/v1/invoices
Create invoice

**Request:**
```json
{
  "patientId": "uuid",
  "doctorId": "uuid",
  "visitId": "uuid",
  "items": [
    {
      "serviceId": "uuid",
      "quantity": 1,
      "unitPrice": 600,
      "discountAmount": 0
    },
    {
      "serviceId": "uuid",
      "quantity": 1,
      "unitPrice": 1500,
      "discountAmount": 300
    }
  ],
  "discountPercentage": 0,
  "isB2B": false,
  "campId": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV202411010123",
    "invoiceDate": "2024-11-01",
    "subtotal": 2100,
    "discountAmount": 300,
    "taxableAmount": 1800,
    "cgstAmount": 162,
    "sgstAmount": 162,
    "totalAmount": 2124,
    "balanceAmount": 2124,
    "paymentStatus": "unpaid",
    "items": [...]
  }
}
```

#### POST /api/v1/payments
Record payment

**Request:**
```json
{
  "invoiceId": "uuid",
  "paymentDate": "2024-11-01",
  "paymentAmount": 2124,
  "paymentMode": "upi",
  "transactionId": "TXN123456789"
}
```

#### GET /api/v1/invoices/:id/receipt
Get invoice receipt (PDF)

**Response:** PDF file stream

### 3.5 Accounting APIs

#### POST /api/v1/accounting/journal-entries
Create journal entry (manual)

**Request:**
```json
{
  "entryDate": "2024-11-01",
  "description": "Rent payment for November",
  "lines": [
    {
      "accountId": "uuid",
      "debitAmount": 50000,
      "creditAmount": 0,
      "description": "Rent expense"
    },
    {
      "accountId": "uuid",
      "debitAmount": 0,
      "creditAmount": 50000,
      "description": "Bank payment"
    }
  ]
}
```

#### GET /api/v1/accounting/ledger/:accountId?from={date}&to={date}
Get ledger for account

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "uuid",
      "accountCode": "1110",
      "accountName": "Cash",
      "accountType": "asset"
    },
    "openingBalance": 50000,
    "transactions": [
      {
        "date": "2024-11-01",
        "entryNumber": "JE202411010001",
        "description": "Invoice payment",
        "debit": 2124,
        "credit": 0,
        "balance": 52124
      },
      ...
    ],
    "closingBalance": 52124
  }
}
```

#### GET /api/v1/accounting/reports/trial-balance?date={date}
Get trial balance

**Response:**
```json
{
  "success": true,
  "data": {
    "asOfDate": "2024-11-01",
    "accounts": [
      {
        "accountCode": "1110",
        "accountName": "Cash",
        "debit": 52124,
        "credit": 0
      },
      {
        "accountCode": "4100",
        "accountName": "Service Revenue",
        "debit": 0,
        "credit": 150000
      },
      ...
    ],
    "totalDebit": 500000,
    "totalCredit": 500000
  }
}
```

### 3.6 Partner APIs

#### POST /api/v1/partners
Create partner

#### GET /api/v1/partners/:id/reconciliation?month={YYYY-MM}
Get reconciliation report

**Response:**
```json
{
  "success": true,
  "data": {
    "partner": {
      "id": "uuid",
      "partnerCode": "LAB001",
      "partnerName": "ABC Lab"
    },
    "period": "2024-11",
    "transactions": [
      {
        "date": "2024-11-01",
        "invoiceNumber": "INV202411010123",
        "patientName": "Amit Kumar",
        "serviceName": "CBC Test",
        "serviceCharge": 600,
        "partnerCost": 400,
        "margin": 200,
        "status": "billed"
      },
      ...
    ],
    "summary": {
      "totalServices": 150,
      "totalServiceCharge": 90000,
      "totalPartnerCost": 60000,
      "totalMargin": 30000
    }
  }
}
```

### 3.7 B2B APIs

#### POST /api/v1/b2b/clients
Create B2B client

#### POST /api/v1/b2b/invoices/generate
Generate monthly B2B invoice

**Request:**
```json
{
  "clientId": "uuid",
  "month": "2024-11"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "b2bInvoiceNumber": "B2B202411000001",
    "clientName": "ABC Corporation",
    "period": "2024-11",
    "periodStart": "2024-11-01",
    "periodEnd": "2024-11-30",
    "grossAmount": 50000,
    "discountAmount": 10000,
    "taxableAmount": 40000,
    "gstAmount": 7200,
    "totalAmount": 47200,
    "invoiceItems": [
      {
        "employeeId": "EMP001",
        "patientName": "Employee Name",
        "serviceDate": "2024-11-05",
        "grossAmount": 5000,
        "discountAmount": 1000,
        "netAmount": 4000
      },
      ...
    ]
  }
}
```

### 3.8 Integration APIs (ABDM)

#### POST /api/v1/integrations/abdm/abha/create
Create ABHA using Aadhaar OTP

**Request:**
```json
{
  "aadhaarNumber": "1234 5678 9012",
  "mobile": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_uuid",
    "message": "OTP sent to registered mobile"
  }
}
```

#### POST /api/v1/integrations/abdm/abha/verify-otp
Verify OTP and create ABHA

**Request:**
```json
{
  "transactionId": "txn_uuid",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "abhaNumber": "12-3456-7890-1234",
    "abhaAddress": "amit.kumar@abdm",
    "name": "Amit Kumar",
    "dateOfBirth": "1985-06-15",
    "gender": "M",
    "mobile": "9876543210"
  }
}
```

---

**[Continued in next part due to length...This is 1/2 of the PDD]**
