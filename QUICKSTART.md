# HMS Enterprise - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker & Docker Compose

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/hms-enterprise.git
cd hms-enterprise

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start infrastructure with Docker
docker-compose up -d postgres redis minio

# 4. Initialize database
psql postgresql://hmsuser:hmspassword@localhost:5432/hms -f database/init-scripts/01-create-schemas.sql
psql postgresql://hmsuser:hmspassword@localhost:5432/hms -f database/init-scripts/02-create-tables.sql
psql postgresql://hmsuser:hmspassword@localhost:5432/hms -f database/init-scripts/03-seed-data.sql

# 5. Install dependencies for all services
npm run install:all

# 6. Start all services
npm run dev
```

### Alternative: Full Docker Setup

```bash
# Start everything with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f user-service
```

## 📂 Project Structure

```
hms-enterprise/
├── services/               # 11 Microservices
│   ├── user-service/      # Authentication & RBAC
│   ├── patient-service/   # Patient management & ABHA
│   ├── billing-service/   # Invoicing & payments
│   └── ...
├── frontend/              # React + TypeScript + MUI
├── database/              # SQL schemas & migrations
├── infrastructure/        # Docker, K8s, Terraform
├── shared/                # Common types & utilities
└── docs/                  # Comprehensive documentation
```

## 🔧 Development

### Running Individual Services

```bash
# User Service (Port 3001)
cd services/user-service
npm install
npm run dev

# Patient Service (Port 3002)
cd services/patient-service
npm install
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Test specific service
cd services/user-service && npm test

# Watch mode
npm run test:watch
```

## 📚 Documentation

- **Full Documentation**: See `docs/` folder
- **API Documentation**: http://localhost:3000/api-docs (when running)
- **Architecture**: `docs/PRODUCT_DESIGN_DOCUMENT.md`
- **Implementation Guide**: `docs/IMPLEMENTATION_GUIDE.md`

## 🌐 Service Ports

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Entry point |
| User Service | 3001 | Auth & RBAC |
| Patient Service | 3002 | Patient management |
| Appointment Service | 3003 | Scheduling |
| Clinical Service | 3004 | EMR |
| Billing Service | 3005 | Invoicing |
| Accounting Service | 3006 | Accounting |
| Partner Service | 3007 | Outsourced providers |
| B2B Service | 3008 | Corporate clients |
| Camp Service | 3009 | Health camps |
| Integration Service | 3010 | ABDM, Payment |
| Notification Service | 3011 | SMS, Email |
| Frontend | 5173 | React App |

## 🔐 Default Credentials

```
Username: admin
Password: admin123 (Change after first login!)
```

## 🛠️ Building for Production

```bash
# Build all services
npm run build

# Build Docker images
docker-compose build

# Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/
```

## 📞 Support

- Issues: GitHub Issues
- Documentation: `/docs` folder
- Email: support@hms-enterprise.com

---

**Built with ❤️ by the HMS Development Team**
