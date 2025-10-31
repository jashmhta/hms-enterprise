# Product Design Document (PDD) - Part 2
## HMS - Hospital Management System with ERP

---

## 4. Security Design

### 4.1 Authentication & Authorization

#### 4.1.1 JWT Authentication

**Token Structure:**
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_uuid",
    "username": "dr.sharma",
    "email": "dr.sharma@example.com",
    "userType": "doctor",
    "roles": ["doctor"],
    "permissions": ["patient.view", "patient.create", ...],
    "iat": 1698825600,
    "exp": 1698829200
  },
  "signature": "..."
}
```

**Token Management:**
- Access Token: 1 hour expiry
- Refresh Token: 7 days expiry
- Refresh Token Rotation: New refresh token on each refresh
- Token Blacklist: Redis-based for logged out tokens

**Implementation:**
```typescript
// middleware/auth.middleware.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Check blacklist
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token invalidated' });
    }

    // Verify token
    const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### 4.1.2 Role-Based Access Control (RBAC)

**Permission Model:**
```
Module.Entity.Action
Examples:
- patient.create
- patient.view
- patient.update
- patient.delete
- billing.invoice.create
- billing.invoice.view
- billing.invoice.delete (admin only)
- accounting.reports.financial.view
- accounting.journal_entry.create
```

**Permission Middleware:**
```typescript
export const authorize = (...requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user.permissions;

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Usage
router.post('/patients', authenticate, authorize('patient.create'), createPatient);
router.delete('/invoices/:id', authenticate, authorize('billing.invoice.delete'), deleteInvoice);
```

### 4.2 Data Protection

#### 4.2.1 Encryption

**At Rest:**
- PostgreSQL: Transparent Data Encryption (TDE) for tablespaces
- Sensitive fields (Aadhaar, ABHA): AES-256 encryption
- S3/MinIO: Server-side encryption

**Encryption Library:**
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Database Model with Encryption:**
```typescript
// models/patient.model.ts
import { encrypt, decrypt } from '../utils/encryption';

class Patient {
  // ...

  get aadhaarNumber(): string | null {
    return this._aadhaarNumber ? decrypt(this._aadhaarNumber) : null;
  }

  set aadhaarNumber(value: string | null) {
    this._aadhaarNumber = value ? encrypt(value) : null;
  }
}
```

**In Transit:**
- TLS 1.3 for all HTTP connections
- Certificate from Let's Encrypt
- HSTS (HTTP Strict Transport Security) headers

#### 4.2.2 Data Masking

**PII Masking for Logs:**
```typescript
export function maskPII(data: any): any {
  const sensitiveFields = ['aadhaarNumber', 'pan', 'password', 'passwordHash'];

  if (typeof data !== 'object') return data;

  const masked = { ...data };

  sensitiveFields.forEach(field => {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  });

  return masked;
}

// Logger
logger.info('Patient created', maskPII(patientData));
```

### 4.3 Security Best Practices

#### 4.3.1 Input Validation

**Validation Library:** Joi or Zod

```typescript
import Joi from 'joi';

export const patientSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().max(100),
  dateOfBirth: Joi.date().max('now').required(),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  email: Joi.string().email().optional(),
  aadhaarNumber: Joi.string().pattern(/^\d{12}$/).optional(),
  // ...
});

// Middleware
export const validateBody = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        }
      });
    }

    req.body = value;
    next();
  };
};

// Usage
router.post('/patients', validateBody(patientSchema), createPatient);
```

#### 4.3.2 SQL Injection Prevention

**Use Parameterized Queries:**
```typescript
// BAD - SQL Injection vulnerable
const query = `SELECT * FROM patients WHERE mrn = '${mrn}'`;

// GOOD - Parameterized
const query = 'SELECT * FROM patient_schema.patients WHERE mrn = $1';
const result = await pool.query(query, [mrn]);
```

#### 4.3.3 XSS Prevention

**Content Security Policy (CSP) Headers:**
```typescript
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

**Output Sanitization:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedHTML = DOMPurify.sanitize(userInput);
```

#### 4.3.4 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/v1/auth/login', authLimiter);
```

#### 4.3.5 CORS Configuration

```typescript
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 4.4 Audit Trail

**Comprehensive Logging:**
```typescript
export async function createAuditLog(data: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  await pool.query(
    `INSERT INTO user_schema.audit_logs
    (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      data.userId,
      data.action,
      data.entityType,
      data.entityId,
      data.oldValue ? JSON.stringify(maskPII(data.oldValue)) : null,
      data.newValue ? JSON.stringify(maskPII(data.newValue)) : null,
      data.ipAddress,
      data.userAgent
    ]
  );
}

// Middleware
export const auditMiddleware = (action: string, entityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(data) {
      res.send = originalSend;

      // Log audit
      createAuditLog({
        userId: req.user?.id,
        action,
        entityType,
        entityId: req.params.id,
        newValue: req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).catch(console.error);

      return res.send(data);
    };

    next();
  };
};
```

---

## 5. Integration Design

### 5.1 ABDM Integration

#### 5.1.1 ABHA Creation Flow

```mermaid
sequenceDiagram
    participant User as Receptionist
    participant HMS as HMS Frontend
    participant API as HMS API
    participant ABDM as ABDM Gateway

    User->>HMS: Enter Aadhaar
    HMS->>API: POST /integrations/abdm/abha/create
    API->>ABDM: POST /v1/registration/aadhaar/generateOtp
    ABDM-->>API: transactionId
    API-->>HMS: transactionId
    HMS-->>User: OTP sent to mobile

    User->>HMS: Enter OTP
    HMS->>API: POST /integrations/abdm/abha/verify-otp
    API->>ABDM: POST /v1/registration/aadhaar/verifyOTP
    ABDM-->>API: ABHA Number, Details
    API->>API: Create/Update Patient
    API-->>HMS: Patient with ABHA
    HMS-->>User: ABHA created successfully
```

**Implementation:**
```typescript
// services/abdm.service.ts
import axios from 'axios';

const ABDM_BASE_URL = process.env.ABDM_API_URL || 'https://abhasbx.abdm.gov.in/abha/api';

export class ABDMService {
  private async getAccessToken(): Promise<string> {
    // Implementation to get ABDM access token
    const response = await axios.post(`${ABDM_BASE_URL}/v1/auth/init`, {
      clientId: process.env.ABDM_CLIENT_ID,
      clientSecret: process.env.ABDM_CLIENT_SECRET
    });
    return response.data.accessToken;
  }

  async generateAadhaarOTP(aadhaarNumber: string): Promise<string> {
    const token = await this.getAccessToken();

    const response = await axios.post(
      `${ABDM_BASE_URL}/v1/registration/aadhaar/generateOtp`,
      { aadhaar: aadhaarNumber },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data.txnId;
  }

  async verifyOTPAndCreateABHA(txnId: string, otp: string): Promise<ABHADetails> {
    const token = await this.getAccessToken();

    const response = await axios.post(
      `${ABDM_BASE_URL}/v1/registration/aadhaar/verifyOTP`,
      { txnId, otp },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return {
      abhaNumber: response.data.healthIdNumber,
      abhaAddress: response.data.healthId,
      name: response.data.name,
      gender: response.data.gender,
      dateOfBirth: response.data.yearOfBirth,
      mobile: response.data.mobile
    };
  }

  async linkHealthRecords(abhaAddress: string, records: HealthRecord[]): Promise<void> {
    // Implementation for health record linking
  }
}
```

#### 5.1.2 Health Record Sharing (Consent Management)

**Flow:**
1. Patient requests health records via ABDM app
2. Consent request received at HMS
3. HMS validates consent and shares encrypted records
4. Records decrypted by requesting facility

### 5.2 Payment Gateway Integration

#### 5.2.1 Razorpay Integration

**Payment Flow:**
```mermaid
sequenceDiagram
    participant User as Patient/Staff
    participant HMS as HMS Frontend
    participant API as HMS API
    participant RZP as Razorpay

    User->>HMS: Initiate Payment
    HMS->>API: POST /integrations/payment/initiate
    API->>RZP: Create Order
    RZP-->>API: order_id
    API-->>HMS: order_id, key_id
    HMS->>RZP: Open Checkout (Razorpay JS)
    User->>RZP: Complete Payment
    RZP-->>HMS: Payment Success
    HMS->>API: POST /integrations/payment/verify
    API->>RZP: Verify Payment Signature
    RZP-->>API: Verified
    API->>API: Create Payment Record
    API-->>HMS: Payment Recorded
    HMS-->>User: Receipt
```

**Implementation:**
```typescript
// services/payment.service.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';

export class PaymentService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!
    });
  }

  async createOrder(invoiceId: string, amount: number): Promise<RazorpayOrder> {
    const order = await this.razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: invoiceId,
      notes: {
        invoiceId
      }
    });

    return {
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID!
    };
  }

  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  }

  async capturePayment(paymentId: string, amount: number): Promise<void> {
    await this.razorpay.payments.capture(paymentId, amount * 100, 'INR');
  }
}
```

### 5.3 SMS/Email Integration

#### 5.3.1 Notification Templates

```typescript
// templates/notification.templates.ts
export const NotificationTemplates = {
  APPOINTMENT_CONFIRMATION: {
    sms: (data: any) =>
      `Dear ${data.patientName}, your appointment with Dr. ${data.doctorName} is confirmed for ${data.date} at ${data.time}. Token: ${data.token}. -${data.hospitalName}`,
    email: {
      subject: 'Appointment Confirmation',
      html: (data: any) => `
        <h2>Appointment Confirmed</h2>
        <p>Dear ${data.patientName},</p>
        <p>Your appointment details:</p>
        <ul>
          <li>Doctor: Dr. ${data.doctorName}</li>
          <li>Date: ${data.date}</li>
          <li>Time: ${data.time}</li>
          <li>Token: ${data.token}</li>
        </ul>
        <p>Please arrive 10 minutes early.</p>
      `
    }
  },
  PAYMENT_RECEIPT: {
    sms: (data: any) =>
      `Payment of Rs. ${data.amount} received for Invoice ${data.invoiceNumber}. Thank you! -${data.hospitalName}`,
    email: {
      subject: 'Payment Receipt',
      html: (data: any) => `
        <h2>Payment Receipt</h2>
        <p>Payment Details:</p>
        <ul>
          <li>Invoice: ${data.invoiceNumber}</li>
          <li>Amount: Rs. ${data.amount}</li>
          <li>Mode: ${data.paymentMode}</li>
          <li>Date: ${data.date}</li>
        </ul>
        <p>Thank you for your payment!</p>
      `
    }
  }
};
```

#### 5.3.2 Notification Service

```typescript
// services/notification.service.ts
import axios from 'axios';
import nodemailer from 'nodemailer';

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  async sendSMS(mobile: string, message: string): Promise<void> {
    // MSG91 / Twilio integration
    await axios.post('https://api.msg91.com/api/v5/flow/', {
      authkey: process.env.MSG91_AUTH_KEY,
      mobiles: mobile,
      message: message
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });
  }

  async sendNotification(type: string, recipient: any, data: any): Promise<void> {
    const template = NotificationTemplates[type];
    if (!template) return;

    // Send SMS
    if (recipient.mobile && template.sms) {
      await this.sendSMS(recipient.mobile, template.sms(data));
    }

    // Send Email
    if (recipient.email && template.email) {
      await this.sendEmail(
        recipient.email,
        template.email.subject,
        template.email.html(data)
      );
    }
  }
}
```

### 5.4 GST E-Invoice Integration

```typescript
// services/einvoice.service.ts
import axios from 'axios';
import crypto from 'crypto';

export class EInvoiceService {
  private readonly GST_API_URL = process.env.GST_EINVOICE_API_URL;

  async generateIRN(invoiceData: InvoiceData): Promise<EInvoiceResponse> {
    // Authenticate with GST portal
    const authToken = await this.authenticate();

    // Prepare invoice JSON as per GST schema
    const gstInvoice = this.prepareGSTInvoice(invoiceData);

    // Generate IRN
    const response = await axios.post(
      `${this.GST_API_URL}/v1.03/invoice`,
      gstInvoice,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      irn: response.data.Irn,
      ackNo: response.data.AckNo,
      ackDate: response.data.AckDt,
      signedInvoice: response.data.SignedInvoice,
      signedQRCode: response.data.SignedQRCode
    };
  }

  private prepareGSTInvoice(invoiceData: InvoiceData): any {
    return {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: 'B2B',
        RegRev: 'N',
        IgstOnIntra: 'N'
      },
      DocDtls: {
        Typ: 'INV',
        No: invoiceData.invoiceNumber,
        Dt: invoiceData.invoiceDate
      },
      SellerDtls: {
        Gstin: process.env.HOSPITAL_GSTIN,
        LglNm: process.env.HOSPITAL_LEGAL_NAME,
        Addr1: process.env.HOSPITAL_ADDRESS_LINE1,
        Loc: process.env.HOSPITAL_CITY,
        Pin: parseInt(process.env.HOSPITAL_PINCODE!),
        Stcd: process.env.HOSPITAL_STATE_CODE
      },
      BuyerDtls: {
        Gstin: invoiceData.buyerGSTIN || 'URP', // Unregistered Person
        LglNm: invoiceData.buyerName,
        Pos: invoiceData.buyerStateCode,
        Addr1: invoiceData.buyerAddress,
        Loc: invoiceData.buyerCity,
        Pin: invoiceData.buyerPincode,
        Stcd: invoiceData.buyerStateCode
      },
      ItemList: invoiceData.items.map((item, idx) => ({
        SlNo: String(idx + 1),
        PrdDesc: item.description,
        IsServc: 'Y',
        HsnCd: item.hsnCode,
        Qty: item.quantity,
        Unit: 'NOS',
        UnitPrice: item.unitPrice,
        TotAmt: item.totalAmount,
        Discount: item.discountAmount,
        AssAmt: item.taxableAmount,
        GstRt: item.gstRate,
        CgstAmt: item.cgstAmount,
        SgstAmt: item.sgstAmount,
        IgstAmt: item.igstAmount,
        TotItemVal: item.totalAmount
      })),
      ValDtls: {
        AssVal: invoiceData.taxableAmount,
        CgstVal: invoiceData.cgstAmount,
        SgstVal: invoiceData.sgstAmount,
        IgstVal: invoiceData.igstAmount,
        TotInvVal: invoiceData.totalAmount
      }
    };
  }
}
```

---

## 6. Frontend Architecture

### 6.1 Technology Stack

**Core:**
- React 18 with TypeScript
- Vite for build tool
- React Router v6 for routing

**State Management:**
- Zustand (lightweight alternative to Redux)
- React Query (TanStack Query) for server state

**UI Framework:**
- Material-UI (MUI) v5
- Tailwind CSS for custom styling

**Forms:**
- React Hook Form
- Zod for validation

**Others:**
- Axios for API calls
- date-fns for date handling
- Recharts for charts/graphs
- react-pdf for PDF generation

### 6.2 Folder Structure

```
hms-frontend/
├── public/
├── src/
│   ├── api/              # API client and endpoints
│   │   ├── axios.config.ts
│   │   ├── patient.api.ts
│   │   ├── billing.api.ts
│   │   └── ...
│   ├── components/       # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   └── forms/
│   │       ├── PatientForm.tsx
│   │       ├── InvoiceForm.tsx
│   │       └── ...
│   ├── pages/            # Page components
│   │   ├── Dashboard/
│   │   ├── Patients/
│   │   │   ├── PatientList.tsx
│   │   │   ├── PatientDetail.tsx
│   │   │   ├── PatientCreate.tsx
│   │   │   └── PatientEdit.tsx
│   │   ├── Appointments/
│   │   ├── Billing/
│   │   ├── Accounting/
│   │   ├── Partners/
│   │   ├── B2B/
│   │   ├── Camps/
│   │   └── Settings/
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePatients.ts
│   │   ├── useInvoices.ts
│   │   └── ...
│   ├── stores/           # Zustand stores
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── ...
│   ├── types/            # TypeScript types
│   │   ├── patient.types.ts
│   │   ├── invoice.types.ts
│   │   └── ...
│   ├── utils/            # Utility functions
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── ...
│   ├── constants/        # Constants
│   │   ├── api.constants.ts
│   │   ├── routes.constants.ts
│   │   └── ...
│   ├── App.tsx
│   ├── main.tsx
│   └── router.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 6.3 State Management Strategy

**Zustand for Client State:**
```typescript
// stores/authStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: User, tokens: Tokens) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (user, tokens) => set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      updateUser: (userData) => set((state) => ({ user: state.user ? { ...state.user, ...userData } : null }))
    }),
    {
      name: 'auth-storage'
    }
  )
);
```

**React Query for Server State:**
```typescript
// hooks/usePatients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '../api/patient.api';

export function usePatients(params?: PatientQueryParams) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => patientApi.getAll(params)
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientApi.getById(id),
    enabled: !!id
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patientApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });
}
```

### 6.4 Key Components

#### Patient Search Component
```typescript
// components/patients/PatientSearch.tsx
import React, { useState } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../api/patient.api';
import { debounce } from 'lodash';

interface PatientSearchProps {
  onSelect: (patient: Patient) => void;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({ onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', 'search', searchQuery],
    queryFn: () => patientApi.search(searchQuery),
    enabled: searchQuery.length >= 3
  });

  const handleSearch = debounce((value: string) => {
    setSearchQuery(value);
  }, 300);

  return (
    <Autocomplete
      options={patients || []}
      getOptionLabel={(patient) => `${patient.firstName} ${patient.lastName} (${patient.mrn})`}
      loading={isLoading}
      onInputChange={(_, value) => handleSearch(value)}
      onChange={(_, patient) => patient && onSelect(patient)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search Patient"
          placeholder="Enter name, MRN, or mobile"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading && <CircularProgress size={20} />}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  );
};
```

#### Invoice Creation Form
```typescript
// pages/Billing/InvoiceCreate.tsx
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceSchema } from '../../schemas/invoice.schema';

export const InvoiceCreate: React.FC = () => {
  const { control, handleSubmit, watch, setValue } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      patientId: '',
      items: [{ serviceId: '', quantity: 1, unitPrice: 0, discountAmount: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const items = watch('items');

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxableAmount = subtotal - discount;
  const gstAmount = taxableAmount * 0.18;
  const total = taxableAmount + gstAmount;

  const onSubmit = async (data: InvoiceFormData) => {
    // Create invoice
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Patient selection */}
      <PatientSearch onSelect={(patient) => setValue('patientId', patient.id)} />

      {/* Service items */}
      {fields.map((field, index) => (
        <div key={field.id}>
          <ServiceSelect control={control} name={`items.${index}.serviceId`} />
          <Input control={control} name={`items.${index}.quantity`} type="number" />
          <Input control={control} name={`items.${index}.unitPrice`} type="number" />
          <Input control={control} name={`items.${index}.discountAmount`} type="number" />
          <Button onClick={() => remove(index)}>Remove</Button>
        </div>
      ))}

      <Button onClick={() => append({ serviceId: '', quantity: 1, unitPrice: 0, discountAmount: 0 })}>
        Add Item
      </Button>

      {/* Totals */}
      <div>
        <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
        <div>Discount: ₹{discount.toFixed(2)}</div>
        <div>Taxable Amount: ₹{taxableAmount.toFixed(2)}</div>
        <div>GST (18%): ₹{gstAmount.toFixed(2)}</div>
        <div>Total: ₹{total.toFixed(2)}</div>
      </div>

      <Button type="submit">Create Invoice</Button>
    </form>
  );
};
```

---

## 7. Deployment Architecture

### 7.1 Infrastructure

**Development Environment:**
```
Local Docker Compose
- PostgreSQL container
- Redis container
- MinIO container
- Each microservice in its own container
```

**Staging Environment:**
```
AWS (Single Region)
- ECS/EKS for services (2 replicas each)
- RDS PostgreSQL (db.t3.medium)
- ElastiCache Redis
- S3 for file storage
- ALB for load balancing
- CloudFront for frontend
```

**Production Environment:**
```
AWS (Multi-AZ)
- EKS cluster (3 worker nodes minimum)
- RDS PostgreSQL Multi-AZ (db.r5.large)
- ElastiCache Redis Cluster
- S3 with versioning and lifecycle policies
- CloudFront with custom domain
- Route53 for DNS
- AWS Certificate Manager for SSL
- CloudWatch for logging and monitoring
```

### 7.2 Docker Configuration

**Dockerfile (Service Example):**
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3001

USER node

CMD ["node", "dist/index.js"]
```

**docker-compose.yml (Development):**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: hms
      POSTGRES_USER: hmsuser
      POSTGRES_PASSWORD: hmspassword
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data

  patient-service:
    build:
      context: ./services/patient-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://hmsuser:hmspassword@postgres:5432/hms
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  # Add other services similarly

volumes:
  postgres-data:
  redis-data:
  minio-data:
```

### 7.3 Kubernetes Deployment

**Deployment (patient-service):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: patient-service
  namespace: hms
spec:
  replicas: 3
  selector:
    matchLabels:
      app: patient-service
  template:
    metadata:
      labels:
        app: patient-service
    spec:
      containers:
      - name: patient-service
        image: hms/patient-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: connection-string
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: patient-service
  namespace: hms
spec:
  selector:
    app: patient-service
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

### 7.4 CI/CD Pipeline

**GitHub Actions Workflow:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Run build
        run: npm run build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: hms/patient-service
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name hms-cluster --region ap-south-1
          kubectl set image deployment/patient-service patient-service=${{ steps.login-ecr.outputs.registry }}/hms/patient-service:${{ github.sha }}
          kubectl rollout status deployment/patient-service
```

---

## 8. Performance Specifications

### 8.1 Performance Targets

**Response Time:**
- API endpoints (95th percentile): < 200ms
- Database queries: < 100ms
- Page load time: < 3 seconds
- Report generation: < 5 seconds (small), < 30 seconds (large)

**Throughput:**
- Patient registrations: 100/minute
- Billing/invoicing: 50/minute
- Concurrent users: 200+

**Availability:**
- System uptime: 99.9% (8.76 hours downtime/year)
- Database replication lag: < 1 second

### 8.2 Optimization Strategies

#### 8.2.1 Database Optimization

**Indexing:**
```sql
-- Composite indexes for common queries
CREATE INDEX idx_patients_search ON patient_schema.patients(first_name, last_name, mobile);
CREATE INDEX idx_invoices_date_status ON billing_schema.invoices(invoice_date, payment_status);
CREATE INDEX idx_appointments_doctor_date ON appointment_schema.appointments(doctor_id, appointment_date);

-- Partial indexes
CREATE INDEX idx_active_patients ON patient_schema.patients(id) WHERE is_active = TRUE;
CREATE INDEX idx_unpaid_invoices ON billing_schema.invoices(id) WHERE payment_status IN ('unpaid', 'partial');
```

**Query Optimization:**
```typescript
// BAD - N+1 query problem
const invoices = await Invoice.findAll();
for (const invoice of invoices) {
  const items = await InvoiceItem.findAll({ where: { invoiceId: invoice.id } });
}

// GOOD - Eager loading
const invoices = await Invoice.findAll({
  include: [{ model: InvoiceItem }]
});
```

**Connection Pooling:**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

#### 8.2.2 Caching Strategy

**Redis Caching:**
```typescript
// services/cache.service.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Usage
const cacheService = new CacheService();

// Cache frequently accessed data
export async function getPatient(id: string): Promise<Patient> {
  const cacheKey = `patient:${id}`;

  // Try cache first
  const cached = await cacheService.get<Patient>(cacheKey);
  if (cached) return cached;

  // Fetch from database
  const patient = await patientRepository.findById(id);

  // Cache for 5 minutes
  await cacheService.set(cacheKey, patient, 300);

  return patient;
}

// Invalidate on update
export async function updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
  const updated = await patientRepository.update(id, data);

  // Invalidate cache
  await cacheService.del(`patient:${id}`);

  return updated;
}
```

**Cache Strategies:**
- Doctor schedules: 30 minutes TTL
- Service price list: 1 hour TTL
- Patient basic info: 15 minutes TTL
- Queue status: 1 minute TTL
- Reports: 10 minutes TTL

#### 8.2.3 API Response Optimization

**Pagination:**
```typescript
export async function getPatients(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<Patient>> {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  const [patients, total] = await Promise.all([
    patientRepository.findMany({
      where: params.search ? {
        OR: [
          { firstName: { contains: params.search } },
          { lastName: { contains: params.search } },
          { mobile: { contains: params.search } }
        ]
      } : {},
      skip: offset,
      take: limit
    }),
    patientRepository.count()
  ]);

  return {
    data: patients,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
```

**Field Selection:**
```typescript
// Allow clients to specify which fields they need
GET /api/v1/patients?fields=id,firstName,lastName,mobile

export async function getPatients(fields?: string[]): Promise<Patient[]> {
  const select = fields ? fields.reduce((obj, field) => ({ ...obj, [field]: true }), {}) : undefined;

  return await patientRepository.findMany({ select });
}
```

---

## 9. Testing Strategy

### 9.1 Testing Pyramid

```
                 /\
                /  \
               /  E2E\          10%
              /______\
             /        \
            / Integration\      30%
           /____________\
          /              \
         /   Unit Tests   \     60%
        /________________\
```

### 9.2 Unit Testing

**Jest + SuperTest:**
```typescript
// tests/services/patient.service.test.ts
import { PatientService } from '../services/patient.service';
import { PatientRepository } from '../repositories/patient.repository';

jest.mock('../repositories/patient.repository');

describe('PatientService', () => {
  let patientService: PatientService;
  let patientRepository: jest.Mocked<PatientRepository>;

  beforeEach(() => {
    patientRepository = new PatientRepository() as jest.Mocked<PatientRepository>;
    patientService = new PatientService(patientRepository);
  });

  describe('createPatient', () => {
    it('should create a patient successfully', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        mobile: '9876543210'
      };

      const expectedPatient = {
        id: 'uuid',
        mrn: 'MRN20241101000001',
        ...patientData
      };

      patientRepository.create.mockResolvedValue(expectedPatient);

      const result = await patientService.createPatient(patientData);

      expect(result).toEqual(expectedPatient);
      expect(patientRepository.create).toHaveBeenCalledWith(patientData);
    });

    it('should throw error if mobile number is duplicate', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        mobile: '9876543210'
      };

      patientRepository.create.mockRejectedValue(new Error('Duplicate mobile number'));

      await expect(patientService.createPatient(patientData)).rejects.toThrow('Duplicate mobile number');
    });
  });
});
```

### 9.3 Integration Testing

```typescript
// tests/integration/billing.test.ts
import request from 'supertest';
import app from '../app';
import { setupTestDatabase, teardownTestDatabase } from './helpers/db';

describe('Billing API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/invoices', () => {
    it('should create invoice and update accounting', async () => {
      // Create test patient
      const patient = await createTestPatient();

      // Create invoice
      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          patientId: patient.id,
          items: [
            { serviceId: 'service-1', quantity: 1, unitPrice: 500 }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceNumber).toBeDefined();

      // Verify accounting entry created
      const journalEntries = await getJournalEntriesForInvoice(response.body.data.id);
      expect(journalEntries.length).toBeGreaterThan(0);
    });
  });
});
```

### 9.4 E2E Testing

**Playwright:**
```typescript
// tests/e2e/patient-registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Patient Registration Flow', () => {
  test('should register new patient with ABHA', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="username"]', 'receptionist');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to patient registration
    await page.click('text=Patients');
    await page.click('text=Add New Patient');

    // Fill patient details
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="mobile"]', '9876543210');
    await page.fill('[name="dateOfBirth"]', '1985-06-15');

    // Create ABHA
    await page.click('text=Create ABHA');
    await page.fill('[name="aadhaarNumber"]', '123456789012');
    await page.click('text=Send OTP');

    // Wait for OTP (in test, mock this)
    await page.fill('[name="otp"]', '123456');
    await page.click('text=Verify');

    // Wait for ABHA creation
    await expect(page.locator('text=ABHA created successfully')).toBeVisible();

    // Submit form
    await page.click('button:has-text("Register Patient")');

    // Verify success
    await expect(page.locator('text=Patient registered successfully')).toBeVisible();

    // Verify MRN generated
    const mrn = await page.locator('[data-testid="patient-mrn"]').textContent();
    expect(mrn).toMatch(/MRN\d{14}/);
  });
});
```

---

## 10. Development Workflow

### 10.1 Git Branching Strategy

```
main (production-ready)
  └── develop (integration branch)
        ├── feature/patient-abha-integration
        ├── feature/b2b-invoicing
        ├── bugfix/invoice-calculation
        └── hotfix/payment-gateway-issue
```

**Branch Naming:**
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Production hotfixes
- `release/*` - Release branches

### 10.2 Code Review Process

**Pull Request Checklist:**
- [ ] Code follows project style guide
- [ ] Unit tests written and passing
- [ ] Integration tests updated (if applicable)
- [ ] Documentation updated
- [ ] No console.log or debug statements
- [ ] TypeScript types properly defined
- [ ] Error handling implemented
- [ ] Security considerations addressed
- [ ] Performance impact assessed

### 10.3 Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/hms.git
cd hms

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start databases
docker-compose up -d postgres redis minio

# Run database migrations
npm run migrate

# Seed database (optional)
npm run seed

# Start development server
npm run dev

# Run tests
npm test
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage

# Build
npm run build

# Lint
npm run lint
npm run lint:fix
```

---

## 11. Documentation Standards

### 11.1 API Documentation

**OpenAPI/Swagger:**
```typescript
/**
 * @openapi
 * /api/v1/patients:
 *   post:
 *     summary: Create a new patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePatientRequest'
 *     responses:
 *       200:
 *         description: Patient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/patients', authenticate, authorize('patient.create'), validateBody(patientSchema), createPatient);
```

### 11.2 Code Documentation

```typescript
/**
 * Service for managing patient-related operations
 * Handles patient registration, ABHA integration, and medical records
 */
export class PatientService {
  /**
   * Creates a new patient with optional ABHA integration
   *
   * @param data - Patient registration data
   * @param options - Additional options for patient creation
   * @param options.createABHA - Whether to create ABHA if Aadhaar provided
   * @returns Promise resolving to created patient with MRN
   * @throws {ValidationError} If patient data is invalid
   * @throws {DuplicateError} If mobile number already exists
   *
   * @example
   * ```typescript
   * const patient = await patientService.createPatient({
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   mobile: '9876543210',
   *   aadhaarNumber: '123456789012'
   * }, { createABHA: true });
   * ```
   */
  async createPatient(data: CreatePatientDTO, options?: PatientCreationOptions): Promise<Patient> {
    // Implementation
  }
}
```

---

## 12. Appendix

### 12.1 Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hms
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL_DEFAULT=300

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=32-byte-hex-key

# ABDM
ABDM_API_URL=https://abhasbx.abdm.gov.in/abha/api
ABDM_CLIENT_ID=your-client-id
ABDM_CLIENT_SECRET=your-client-secret

# Payment Gateway
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret

# SMS/Email
MSG91_AUTH_KEY=your-auth-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password

# GST E-Invoice
GST_EINVOICE_API_URL=https://einvoice1.gst.gov.in
GST_USERNAME=your-username
GST_PASSWORD=your-password
HOSPITAL_GSTIN=your-gstin

# File Storage
S3_BUCKET=hms-documents
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
VITE_RAZORPAY_KEY_ID=your-key-id
```

---

**End of Product Design Document (Part 2)**
