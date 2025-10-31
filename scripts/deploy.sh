#!/bin/bash

# HMS Enterprise Deployment Script
# This script automates the deployment of the complete Hospital Management System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${DEPLOYMENT_ENV:-production}
BACKUP_DIR="/opt/hms-backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="/var/log/hms-deployment.log"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [[ ! -f .env ]]; then
        warning ".env file not found. Creating from template..."
        cp .env.example .env
        warning "Please edit .env file with your configuration before continuing."
        exit 1
    fi
    
    success "Prerequisites check completed"
}

# Create backup of current deployment
backup_current() {
    if docker-compose ps | grep -q "Up"; then
        log "Creating backup of current deployment..."
        mkdir -p "$BACKUP_DIR"
        
        # Backup databases
        docker-compose exec postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/database_backup.sql"
        
        # Backup configuration files
        cp -r ./config "$BACKUP_DIR/"
        cp .env "$BACKUP_DIR/"
        
        success "Backup created at $BACKUP_DIR"
    fi
}

# Build and deploy services
deploy_services() {
    log "Building and deploying services..."
    
    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull
    
    # Build custom images
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Stop existing services
    docker-compose -f docker-compose.prod.yml down
    
    # Start new services
    docker-compose -f docker-compose.prod.yml up -d
    
    success "Services deployed successfully"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."
    
    services=("postgres" "redis" "user-service" "patient-service" "appointment-service" "clinical-service")
    max_attempts=60
    attempt=1
    
    for service in "${services[@]}"; do
        log "Checking health of $service..."
        
        while [[ $attempt -le $max_attempts ]]; do
            if docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "healthy\|Up"; then
                success "$service is healthy"
                break
            fi
            
            if [[ $attempt -eq $max_attempts ]]; then
                error "$service failed to become healthy"
                return 1
            fi
            
            log "Attempt $attempt of $max_attempts for $service..."
            sleep 10
            ((attempt++))
        done
        
        attempt=1
    done
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Check if database is ready
    until docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U "$DB_USER" -d "$DB_NAME"; do
        log "Waiting for database to be ready..."
        sleep 5
    done
    
    # Run initialization scripts
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -f /docker-entrypoint-initdb.d/01-create-schemas.sql
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -f /docker-entrypoint-initdb.d/02-create-tables.sql
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -f /docker-entrypoint-initdb.d/03-create-indexes.sql
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -f /docker-entrypoint-initdb.d/04-create-triggers.sql
    
    success "Database migrations completed"
}

# Health check all services
health_check() {
    log "Performing comprehensive health check..."
    
    # Check if all services are running
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        error "Some services are not running"
        docker-compose -f docker-compose.prod.yml ps
        return 1
    fi
    
    # Check API endpoints
    endpoints=(
        "http://localhost/api/health"
        "http://localhost:${USER_SERVICE_PORT:-3001}/health"
        "http://localhost:${PATIENT_SERVICE_PORT:-3002}/health"
        "http://localhost:${APPOINTMENT_SERVICE_PORT:-3003}/health"
        "http://localhost:${CLINICAL_SERVICE_PORT:-3004}/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null; then
            success "✓ $endpoint is responding"
        else
            error "✗ $endpoint is not responding"
            return 1
        fi
    done
    
    success "All health checks passed"
}

# Display deployment summary
deployment_summary() {
    log "Deployment Summary"
    echo "=================="
    echo "Environment: $DEPLOYMENT_ENV"
    echo "Deployment Time: $(date)"
    echo "Backup Location: $BACKUP_DIR"
    echo ""
    echo "Service URLs:"
    echo "- Frontend: http://localhost:${FRONTEND_PORT:-3000}"
    echo "- API Gateway: http://localhost/api"
    echo "- User Service: http://localhost:${USER_SERVICE_PORT:-3001}"
    echo "- Patient Service: http://localhost:${PATIENT_SERVICE_PORT:-3002}"
    echo "- Appointment Service: http://localhost:${APPOINTMENT_SERVICE_PORT:-3003}"
    echo "- Clinical Service: http://localhost:${CLINICAL_SERVICE_PORT:-3004}"
    echo ""
    echo "Monitoring URLs:"
    echo "- Prometheus: http://localhost:9090"
    echo "- Grafana: http://localhost:3001 (admin/${GRAFANA_PASSWORD})"
    echo ""
    echo "Useful Commands:"
    echo "- View logs: docker-compose -f docker-compose.prod.yml logs -f [service]"
    echo "- Check status: docker-compose -f docker-compose.prod.yml ps"
    echo "- Stop services: docker-compose -f docker-compose.prod.yml down"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    docker image prune -f
    docker container prune -f
    docker volume prune -f
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting HMS Enterprise deployment..."
    
    check_root
    check_prerequisites
    
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        backup_current
    fi
    
    deploy_services
    wait_for_services
    run_migrations
    health_check
    cleanup
    deployment_summary
    
    success "HMS Enterprise deployment completed successfully! 🎉"
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        backup_current
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    "logs")
        docker-compose -f docker-compose.prod.yml logs -f "${2:-}"
        ;;
    "status")
        docker-compose -f docker-compose.prod.yml ps
        ;;
    "stop")
        log "Stopping all services..."
        docker-compose -f docker-compose.prod.yml down
        success "All services stopped"
        ;;
    "restart")
        log "Restarting all services..."
        docker-compose -f docker-compose.prod.yml restart
        success "All services restarted"
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|cleanup|logs|status|stop|restart}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (default)"
        echo "  backup   - Create backup only"
        echo "  health   - Run health checks"
        echo "  cleanup  - Clean up Docker resources"
        echo "  logs     - Show logs (optional service name)"
        echo "  status   - Show service status"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        exit 1
        ;;
esac