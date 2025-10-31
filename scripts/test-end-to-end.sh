#!/bin/bash

# HMS Enterprise End-to-End Testing Script
# This script tests the complete system functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-http://localhost}
API_URL="$BASE_URL/api"
FRONTEND_URL="$BASE_URL:${FRONTEND_PORT:-3000}"
LOG_FILE="/var/log/hms-e2e-tests.log"

# Test data
TEST_EMAIL="testuser@hms.com"
TEST_PASSWORD="Test@123456"
TEST_FIRST_NAME="John"
TEST_LAST_NAME="Doe"
TEST_PHONE="+1234567890"
TEST_AADHAAR="123456789012"

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

# HTTP request helper
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local token=$4
    
    if [[ -n "$token" ]]; then
        curl -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" \
             -H "Content-Type: application/json" \
             -H "Authorization: Bearer $token" \
             -d "$data" \
             "$url"
    else
        curl -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$url"
    fi
}

# Parse HTTP response
parse_response() {
    local response=$1
    local body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    echo "$body"
    echo "$status"
}

# Test prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if services are running
    if ! curl -f -s "$API_URL/health" > /dev/null; then
        error "Services are not running. Please deploy first."
        exit 1
    fi
    
    success "Prerequisites check completed"
}

# Test 1: User Registration
test_user_registration() {
    log "Test 1: User Registration"
    
    local register_data=$(cat <<EOF
{
  "firstName": "$TEST_FIRST_NAME",
  "lastName": "$TEST_LAST_NAME",
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "phone": "$TEST_PHONE",
  "role": "doctor"
}
EOF
)
    
    local response=$(make_request "POST" "$API_URL/v1/auth/register" "$register_data")
    local body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "201" ]]; then
        success "✓ User registration successful"
        echo "$body" | jq -r '.data.user.id' > /tmp/test_user_id.txt
    else
        error "✗ User registration failed (Status: $status)"
        echo "$body"
        return 1
    fi
}

# Test 2: User Login
test_user_login() {
    log "Test 2: User Login"
    
    local login_data=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)
    
    local response=$(make_request "POST" "$API_URL/v1/auth/login" "$login_data")
    local body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "200" ]]; then
        success "✓ User login successful"
        local token=$(echo "$body" | jq -r '.data.tokens.accessToken')
        echo "$token" > /tmp/test_access_token.txt
        echo "$body" | jq -r '.data.user.id' >> /tmp/test_user_id.txt
    else
        error "✗ User login failed (Status: $status)"
        echo "$body"
        return 1
    fi
}

# Test 3: Patient Registration
test_patient_registration() {
    log "Test 3: Patient Registration"
    
    local token=$(cat /tmp/test_access_token.txt)
    local patient_data=$(cat <<EOF
{
  "firstName": "Test",
  "lastName": "Patient",
  "email": "testpatient@hms.com",
  "phone": "+1234567891",
  "dateOfBirth": "1990-01-01",
  "gender": "MALE",
  "address": {
    "street": "123 Test St",
    "city": "Test City",
    "state": "Test State",
    "postalCode": "12345",
    "country": "India"
  },
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "+1234567892",
    "relationship": "Spouse"
  }
}
EOF
)
    
    local response=$(make_request "POST" "$API_URL/v1/patients" "$patient_data" "$token")
    local body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "201" ]]; then
        success "✓ Patient registration successful"
        local patient_id=$(echo "$body" | jq -r '.data.patient.id')
        echo "$patient_id" > /tmp/test_patient_id.txt
    else
        error "✗ Patient registration failed (Status: $status)"
        echo "$body"
        return 1
    fi
}

# Test 4: Appointment Creation
test_appointment_creation() {
    log "Test 4: Appointment Creation"
    
    local token=$(cat /tmp/test_access_token.txt)
    local patient_id=$(cat /tmp/test_patient_id.txt)
    local doctor_id=$(cat /tmp/test_user_id.txt)
    
    local appointment_data=$(cat <<EOF
{
  "patientId": "$patient_id",
  "doctorId": "$doctor_id",
  "appointmentType": "CONSULTATION",
  "consultationType": "IN_PERSON",
  "scheduledDateTime": "$(date -d '+1 day' -Iseconds)",
  "duration": 30,
  "notes": "Test appointment"
}
EOF
)
    
    local response=$(make_request "POST" "$API_URL/v1/appointments" "$appointment_data" "$token")
    local body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "201" ]]; then
        success "✓ Appointment creation successful"
        local appointment_id=$(echo "$body" | jq -r '.data.appointment.id')
        echo "$appointment_id" > /tmp/test_appointment_id.txt
    else
        error "✗ Appointment creation failed (Status: $status)"
        echo "$body"
        return 1
    fi
}

# Test 5: Clinical Visit Creation
test_clinical_visit() {
    log "Test 5: Clinical Visit Creation"
    
    local token=$(cat /tmp/test_access_token.txt)
    local patient_id=$(cat /tmp/test_patient_id.txt)
    local appointment_id=$(cat /tmp/test_appointment_id.txt)
    
    local visit_data=$(cat <<EOF
{
  "patientId": "$patient_id",
  "appointmentId": "$appointment_id",
  "visitType": "CONSULTATION",
  "chiefComplaint": "Regular checkup",
  "vitalSigns": {
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80
    },
    "heartRate": 72,
    "temperature": 98.6,
    "weight": 70,
    "height": 170
  }
}
EOF
)
    
    local response=$(make_request "POST" "$API_URL/v1/clinical/visits" "$visit_data" "$token")
    local body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "201" ]]; then
        success "✓ Clinical visit creation successful"
        local visit_id=$(echo "$body" | jq -r '.data.visit.id')
        echo "$visit_id" > /tmp/test_visit_id.txt
    else
        error "✗ Clinical visit creation failed (Status: $status)"
        echo "$body"
        return 1
    fi
}

# Test 6: Prescription Creation
test_prescription() {
    log "Test 6: Prescription Creation"
    
    local token=$(cat /tmp/test_access_token.txt)
    local patient_id=$(cat /tmp/test_patient_id.txt)
    local visit_id=$(cat /tmp/test_visit_id.txt)
    
    local prescription_data=$(cat <<EOF
{
  "patientId": "$patient_id",
  "visitId": "$visit_id",
  "medications": [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "5 days",
      "route": "ORAL",
      "instructions": "Take after food"
    }
  ],
  "notes": "Test prescription"
}
EOF
)
    
    local response=$(make_request "POST" "$API_URL/v1/clinical/prescriptions" "$prescription_data" "$token")
    local body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "201" ]]; then
        success "✓ Prescription creation successful"
    else
        error "✗ Prescription creation failed (Status: $status)"
        echo "$body"
        return 1
    fi
}

# Test 7: Data Retrieval Tests
test_data_retrieval() {
    log "Test 7: Data Retrieval"
    
    local token=$(cat /tmp/test_access_token.txt)
    local patient_id=$(cat /tmp/test_patient_id.txt)
    
    # Test patient retrieval
    local response=$(make_request "GET" "$API_URL/v1/patients/$patient_id" "" "$token")
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "200" ]]; then
        success "✓ Patient retrieval successful"
    else
        error "✗ Patient retrieval failed (Status: $status)"
        return 1
    fi
    
    # Test appointments retrieval
    local response=$(make_request "GET" "$API_URL/v1/appointments?patientId=$patient_id" "" "$token")
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "200" ]]; then
        success "✓ Appointments retrieval successful"
    else
        error "✗ Appointments retrieval failed (Status: $status)"
        return 1
    fi
    
    # Test clinical records retrieval
    local response=$(make_request "GET" "$API_URL/v1/clinical/visits?patientId=$patient_id" "" "$token")
    local status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    
    if [[ "$status" == "200" ]]; then
        success "✓ Clinical records retrieval successful"
    else
        error "✗ Clinical records retrieval failed (Status: $status)"
        return 1
    fi
}

# Test 8: Frontend Accessibility
test_frontend_accessibility() {
    log "Test 8: Frontend Accessibility"
    
    if curl -f -s "$FRONTEND_URL" > /dev/null; then
        success "✓ Frontend is accessible"
    else
        error "✗ Frontend is not accessible"
        return 1
    fi
}

# Cleanup test data
cleanup_test_data() {
    log "Cleaning up test data..."
    
    rm -f /tmp/test_*.txt
    
    success "Test data cleaned up"
}

# Generate test report
generate_report() {
    local total_tests=8
    local passed_tests=$1
    local failed_tests=$((total_tests - passed_tests))
    
    log "Test Summary"
    echo "============"
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo "Success Rate: $(( passed_tests * 100 / total_tests ))%"
    echo ""
    
    if [[ $failed_tests -eq 0 ]]; then
        success "🎉 All tests passed! The system is working correctly."
    else
        error "❌ Some tests failed. Please check the logs and fix the issues."
        return 1
    fi
}

# Main testing function
main() {
    log "Starting HMS Enterprise End-to-End Testing..."
    
    check_prerequisites
    
    local passed_tests=0
    
    # Run tests
    if test_user_registration; then ((passed_tests++)); fi
    if test_user_login; then ((passed_tests++)); fi
    if test_patient_registration; then ((passed_tests++)); fi
    if test_appointment_creation; then ((passed_tests++)); fi
    if test_clinical_visit; then ((passed_tests++)); fi
    if test_prescription; then ((passed_tests++)); fi
    if test_data_retrieval; then ((passed_tests++)); fi
    if test_frontend_accessibility; then ((passed_tests++)); fi
    
    cleanup_test_data
    generate_report $passed_tests
}

# Handle script interruption
trap 'error "Testing interrupted"; cleanup_test_data; exit 1' INT TERM

# Parse command line arguments
case "${1:-all}" in
    "all")
        main
        ;;
    "registration")
        check_prerequisites
        test_user_registration
        ;;
    "login")
        check_prerequisites
        test_user_login
        ;;
    "patient")
        check_prerequisites
        test_patient_registration
        ;;
    "appointment")
        check_prerequisites
        test_appointment_creation
        ;;
    "clinical")
        check_prerequisites
        test_clinical_visit
        ;;
    "frontend")
        test_frontend_accessibility
        ;;
    "cleanup")
        cleanup_test_data
        ;;
    *)
        echo "Usage: $0 {all|registration|login|patient|appointment|clinical|frontend|cleanup}"
        echo ""
        echo "Test Options:"
        echo "  all          - Run all tests (default)"
        echo "  registration - Test user registration only"
        echo "  login        - Test user login only"
        echo "  patient      - Test patient registration only"
        echo "  appointment  - Test appointment creation only"
        echo "  clinical     - Test clinical workflows only"
        echo "  frontend     - Test frontend accessibility only"
        echo "  cleanup      - Clean up test data"
        exit 1
        ;;
esac