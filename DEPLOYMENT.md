# HMS Enterprise - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Hospital Management System (HMS) Enterprise in production environments.

## Architecture

The HMS Enterprise is built as a microservices architecture with the following components:

### Services
- **User Service** (Port 3001) - Authentication, authorization, and user management
- **Patient Service** (Port 3002) - Patient registration and ABDM integration
- **Appointment Service** (Port 3003) - Appointment scheduling and calendar management
- **Clinical Service** (Port 3004) - Clinical workflows, EMR, and medical records
- **Frontend** (Port 3000) - React-based web application
- **PostgreSQL** (Port 5432) - Primary database
- **Redis** (Port 6379) - Caching and event bus
- **Nginx** (Ports 80/443) - Reverse proxy and load balancer

### Infrastructure
- **Prometheus** (Port 9090) - Metrics collection and monitoring
- **Grafana** (Port 3001) - Visualization and dashboards
- **Filebeat** - Log shipping and centralized logging

## Prerequisites

### System Requirements
- **CPU**: 4 cores minimum (8 cores recommended)
- **Memory**: 8GB minimum (16GB recommended)
- **Storage**: 100GB minimum (500GB recommended for production)
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Docker**: 20.10+ with Docker Compose 2.0+

### Software Dependencies
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt-get update
sudo apt-get install -y curl wget jq git
```

## Configuration

### Environment Variables
Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit the `.env` file with your specific configuration:

```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=hms_enterprise
DB_USER=hms_user
DB_PASSWORD=your_secure_password

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Service Ports
USER_SERVICE_PORT=3001
PATIENT_SERVICE_PORT=3002
APPOINTMENT_SERVICE_PORT=3003
CLINICAL_SERVICE_PORT=3004
FRONTEND_PORT=3000

# Security
JWT_PRIVATE_KEY=$(openssl genrsa -out private.pem 4096)
JWT_PUBLIC_KEY=$(openssl rsa -in private.pem -pubout -out public.pem)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# ABDM Configuration (for Indian healthcare compliance)
ABDM_CLIENT_ID=your_abdm_client_id
ABDM_CLIENT_SECRET=your_abdm_client_secret
ABDM_BASE_URL=https://healthids.abdm.gov.in/api

# Monitoring
GRAFANA_PASSWORD=your_grafana_password

# External Services
ELASTICSEARCH_HOST=localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_elasticsearch_password
```

### SSL/TLS Configuration
For production deployments, configure SSL certificates:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem

# Or use Let's Encrypt for production certificates
sudo apt-get install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

## Deployment Process

### 1. Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd hms-enterprise

# Copy and configure environment file
cp .env.example .env
# Edit .env with your configuration

# Make scripts executable
chmod +x scripts/*.sh
```

### 2. Automated Deployment
Use the provided deployment script:

```bash
# Full deployment (production)
./scripts/deploy.sh deploy

# Development deployment
DEPLOYMENT_ENV=development ./scripts/deploy.sh deploy
```

The deployment script will:
- Check prerequisites
- Create backup of existing deployment (production only)
- Build and deploy all services
- Wait for services to be healthy
- Run database migrations
- Perform health checks
- Generate deployment summary

### 3. Manual Deployment Steps
If you prefer manual deployment:

```bash
# Build custom images
docker-compose -f docker-compose.prod.yml build --no-cache

# Start infrastructure services
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for database to be ready
until docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U hms_user -d hms_enterprise; do
  echo "Waiting for database..."
  sleep 5
done

# Start application services
docker-compose -f docker-compose.prod.yml up -d user-service patient-service appointment-service clinical-service

# Start frontend and reverse proxy
docker-compose -f docker-compose.prod.yml up -d frontend nginx

# Start monitoring services
docker-compose -f docker-compose.prod.yml up -d prometheus grafana filebeat
```

## Database Setup

### Database Initialization
The database is automatically initialized using the scripts in `database/init-scripts/`:

1. `01-create-schemas.sql` - Creates all database schemas
2. `02-create-tables.sql` - Creates all tables and relationships
3. `03-create-indexes.sql` - Creates performance indexes
4. `04-create-triggers.sql` - Creates business logic triggers

### Manual Database Operations
```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U hms_user -d hms_enterprise

# Run migrations manually
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U hms_user -d hms_enterprise -f /docker-entrypoint-initdb.d/01-create-schemas.sql

# Create backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U hms_user hms_enterprise > backup.sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U hms_user hms_enterprise < backup.sql
```

## Testing

### End-to-End Testing
Run comprehensive tests to verify the deployment:

```bash
# Run all tests
./scripts/test-end-to-end.sh all

# Run specific tests
./scripts/test-end-to-end.sh registration
./scripts/test-end-to-end.sh login
./scripts/test-end-to-end.sh patient
./scripts/test-end-to-end.sh appointment
./scripts/test-end-to-end.sh clinical
./scripts/test-end-to-end.sh frontend
```

### Health Checks
```bash
# Check service status
./scripts/deploy.sh status

# Run health checks
./scripts/deploy.sh health

# Check logs
./scripts/deploy.sh logs [service-name]
```

## Monitoring and Observability

### Metrics and Monitoring
- **Prometheus**: http://your-domain.com:9090
- **Grafana**: http://your-domain.com:3001 (admin/your_grafana_password)
- **Health Checks**: http://your-domain.com/api/health

### Logging
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f user-service
docker-compose -f docker-compose.prod.yml logs -f patient-service
docker-compose -f docker-compose.prod.yml logs -f postgres

# View Nginx logs
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log
```

### Key Metrics to Monitor
- Service response times
- Database connection pool usage
- Redis memory usage
- Error rates (4xx, 5xx)
- Authentication success/failure rates
- Patient registration volumes
- appointment booking rates

## Security Configuration

### Network Security
- All services communicate within a private Docker network
- Only Nginx is exposed to the internet
- Database and Redis are not accessible from outside

### Application Security
- JWT tokens with RS256 encryption
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Security headers (HSTS, XSS protection, etc.)

### SSL/TLS
- HTTPS enforced in production
- TLS 1.2 and 1.3 only
- Strong cipher suites
- Certificate rotation automated

## Performance Optimization

### Database Performance
- Optimized indexes for common queries
- Connection pooling (pgBouncer recommended for high load)
- Query timeout configuration
- Regular vacuum and analyze operations

### Caching Strategy
- Redis for session storage
- Application-level caching for frequently accessed data
- CDN for static assets (recommended for production)

### Resource Scaling
```bash
# Scale specific services
docker-compose -f docker-compose.prod.yml up -d --scale user-service=3 --scale patient-service=2

# Monitor resource usage
docker stats
```

## Backup and Recovery

### Automated Backups
```bash
# Create backup directory
mkdir -p /opt/hms-backups

# Setup cron job for daily backups
echo "0 2 * * * /path/to/scripts/backup.sh" | sudo crontab -

# Manual backup
./scripts/deploy.sh backup
```

### Disaster Recovery
1. **Database Recovery**: Restore from SQL backup
2. **Service Recovery**: Redeploy using deployment script
3. **Configuration Recovery**: Restore from backup directory
4. **File Recovery**: Restore uploaded files and documents

## Maintenance

### Regular Tasks
```bash
# Update containers
docker-compose -f docker-compose.prod.yml pull

# Clean up unused resources
./scripts/deploy.sh cleanup

# Restart services
./scripts/deploy.sh restart

# Stop all services
./scripts/deploy.sh stop
```

### Monitoring Maintenance
- Review Grafana dashboards weekly
- Check log files for errors
- Monitor disk space usage
- Update SSL certificates before expiration

## Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check logs for errors
docker-compose -f docker-compose.prod.yml logs [service-name]

# Check resource usage
docker stats

# Verify environment variables
docker-compose -f docker-compose.prod.yml config
```

#### Database Connection Issues
```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U hms_user -d hms_enterprise

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### High Memory Usage
```bash
# Check memory usage by service
docker stats --no-stream

# Restart services to free memory
docker-compose -f docker-compose.prod.yml restart
```

#### Authentication Issues
```bash
# Check JWT keys
ls -la nginx/ssl/

# Verify environment variables
grep JWT_ .env
```

### Performance Issues
```bash
# Check slow queries
docker-compose -f docker-compose.prod.yml exec postgres psql -U hms_user -d hms_enterprise -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost/api/health"
```

## Support and Documentation

### Documentation Links
- [API Documentation](./docs/api/README.md)
- [Database Schema](./docs/database/README.md)
- [Development Guide](./docs/development/README.md)

### Emergency Contacts
- System Administrator: [admin@your-domain.com]
- Development Team: [dev@your-domain.com]

### Support Channels
- Create GitHub issues for bugs and feature requests
- Internal Slack channel for real-time support
- Documentation wiki for detailed guides

## Version History

- **v1.0.0** - Initial production release
- **v1.1.0** - Added enhanced monitoring
- **v1.2.0** - Performance optimizations
- **v1.3.0** - Security enhancements

---

For additional support or questions, please contact the development team or refer to the comprehensive documentation in the `/docs` directory.