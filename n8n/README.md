# n8n Automation Layer

This directory contains the n8n automation workflows for the chatbot appointment booking system. n8n handles business logic processing, validation, logging, and will integrate with Google Calendar in future stages.

## Overview

The n8n layer serves as an automation middleware between the backend API and external services (Google Calendar). It processes appointment booking and cancellation requests, validates data, logs activities, and prepares for Google Calendar integration.

## Project Structure

```
n8n/
├── docker-compose.yml          # Docker Compose configuration for n8n
├── .env.example                # Environment variables template
├── workflows/                  # n8n workflow definitions
│   ├── book-appointment.json  # Booking workflow
│   └── cancel-appointment.json # Cancellation workflow
├── logs/                       # Log files (mounted volume)
└── README.md                   # This file
```

## Prerequisites

- Docker and Docker Compose installed
- Network access to backend API (for webhook communication)
- Basic understanding of n8n workflows (for customization)

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Default values are suitable for local development
```

### 2. Start n8n Service

```bash
# Ensure the chatbot-network exists (from root docker-compose.yml)
docker network create chatbot-network

# Start n8n
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access n8n UI

Open your browser and navigate to:
- **URL**: http://localhost:5678
- **Username**: `admin` (or value from `.env`)
- **Password**: `admin` (or value from `.env`)

### 4. Import Workflows

1. In n8n UI, click **"Workflows"** in the sidebar
2. Click **"Import from File"** or use the **"+"** button
3. Import the following files:
   - `workflows/book-appointment.json`
   - `workflows/cancel-appointment.json`
4. Activate each workflow by toggling the switch at the top

### 5. Configure Webhook URLs

After importing and activating workflows:

1. Open each workflow in n8n UI
2. Click on the **Webhook** node
3. Copy the **Production URL** (e.g., `http://localhost:5678/webhook/book`)
4. Update your `backend/.env` file with these URLs:
   ```env
   N8N_BOOK_WEBHOOK_URL=http://n8n:5678/webhook/book
   N8N_CANCEL_WEBHOOK_URL=http://n8n:5678/webhook/cancel
   ```

   **Note**: Use `n8n` as hostname when backend and n8n are in the same Docker network, or `localhost` for local development.

## Workflow Details

### Book Appointment Workflow

**Trigger**: Webhook POST request at `/webhook/book`

**Process**:
1. **Webhook Trigger**: Receives booking request from backend
2. **Validation**: Validates incoming data (name, email, date, time, reason)
3. **Logging**: Logs request with timestamp and request ID
4. **Routing**: Routes based on validation result
5. **Google Calendar Stub**: Placeholder for future Google Calendar integration
6. **Response**: Returns success or error response to backend

**Expected Input**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "date": "2026-02-01",
  "time": "10:30",
  "reason": "Consultation"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Appointment booking processed successfully",
  "calendarEvent": { ... },
  "bookingData": { ... },
  "requestId": "..."
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": "Validation Error",
  "details": ["Error message 1", "Error message 2"],
  "message": "Invalid booking data provided"
}
```

### Cancel Appointment Workflow

**Trigger**: Webhook POST request at `/webhook/cancel`

**Process**:
1. **Webhook Trigger**: Receives cancellation request from backend
2. **Validation**: Validates incoming data (email, date, time)
3. **Logging**: Logs request with timestamp and request ID
4. **Routing**: Routes based on validation result
5. **Google Calendar Stub**: Placeholder for future Google Calendar integration
6. **Response**: Returns success or error response to backend

**Expected Input**:
```json
{
  "email": "john@example.com",
  "date": "2026-02-01",
  "time": "10:30"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Appointment cancellation processed successfully",
  "cancelledEvent": { ... },
  "requestId": "..."
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": "Validation Error",
  "details": ["Error message 1", "Error message 2"],
  "message": "Invalid cancellation data provided"
}
```

## Validation Rules

### Booking Validation
- **Name**: Required, non-empty string
- **Email**: Required, valid email format
- **Date**: Required, YYYY-MM-DD format, cannot be in the past
- **Time**: Required, HH:MM format (24-hour)
- **Reason**: Required, non-empty string

### Cancellation Validation
- **Email**: Required, valid email format
- **Date**: Required, YYYY-MM-DD format
- **Time**: Required, HH:MM format (24-hour)

## Logging

All workflow executions are logged:
- **Console Logs**: Visible in n8n execution history
- **File Logs**: Saved to `./logs/` directory (mounted volume)
- **Log Format**: JSON with timestamp, request ID, type, and data

Each log entry includes:
- Timestamp (ISO 8601)
- Request ID (execution ID)
- Request type (booking_request / cancellation_request)
- Validation status
- Request data
- Errors (if any)

## Docker Configuration

### Volumes
- `./workflows` → `/home/node/.n8n/workflows` - Persistent workflow storage
- `./logs` → `/home/node/.n8n/logs` - Log files
- `n8n_data` → `/home/node/.n8n` - n8n internal data

### Ports
- `5678:5678` - n8n web interface and API

### Network
- Connected to `chatbot-network` for communication with backend

### Health Check
- Endpoint: `http://localhost:5678/healthz`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## Environment Variables

See `.env.example` for all available configuration options:

- `N8N_HOST`: Host address (default: `0.0.0.0`)
- `N8N_PORT`: Port number (default: `5678`)
- `N8N_BASIC_AUTH_USER`: Basic auth username (default: `admin`)
- `N8N_BASIC_AUTH_PASSWORD`: Basic auth password (default: `admin`)
- `N8N_BOOK_WEBHOOK_PATH`: Webhook path for bookings (default: `/webhook/book`)
- `N8N_CANCEL_WEBHOOK_PATH`: Webhook path for cancellations (default: `/webhook/cancel`)
- `NODE_ENV`: Environment mode (default: `production`)

## Integration with Backend

The backend API sends HTTP POST requests to n8n webhooks:

1. **Backend** receives request from chatbot frontend
2. **Backend** validates and normalizes data
3. **Backend** forwards request to n8n webhook
4. **n8n** processes request through workflow
5. **n8n** returns response to backend
6. **Backend** returns response to frontend

### Network Configuration

For Docker Compose integration, ensure both services are on the same network:

```yaml
# In root docker-compose.yml
networks:
  chatbot-network:
    driver: bridge
```

Then reference n8n service by name:
- `N8N_BOOK_WEBHOOK_URL=http://n8n:5678/webhook/book`
- `N8N_CANCEL_WEBHOOK_URL=http://n8n:5678/webhook/cancel`

## Google Calendar Integration

### Overview
Google Calendar integration is fully implemented in both workflows. Appointments are automatically created in Google Calendar when booked and deleted when cancelled.

### Setup Instructions

#### 1. Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### 2. Create Service Account
1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in service account details:
   - Name: `n8n-calendar-service` (or your preferred name)
   - Description: "Service account for n8n calendar automation"
4. Click "Create and Continue"
5. Skip role assignment (not needed for calendar access)
6. Click "Done"

#### 3. Generate Service Account Key
1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Click "Create" - JSON file will download automatically
6. Save this file as `service-account.json` in the `n8n/` directory

#### 4. Share Calendar with Service Account
1. Open Google Calendar
2. Go to calendar settings (gear icon → Settings)
3. Click on "Settings for my calendars" → Select your calendar
4. Scroll to "Share with specific people"
5. Click "Add people"
6. Enter the service account email (found in `service-account.json` as `client_email`)
7. Set permission to "Make changes to events"
8. Click "Send"

**Note**: For shared calendars, use the calendar ID format: `your-calendar-id@group.calendar.google.com`

#### 5. Configure n8n Credentials
1. Access n8n UI at `http://localhost:5678`
2. Go to **Credentials** (left sidebar)
3. Click **"Add Credential"**
4. Search for **"Google Calendar OAuth2 API"**
5. Select it and configure:
   - **Authentication**: Choose "Service Account"
   - **Service Account Email**: Paste from `service-account.json` (`client_email` field)
   - **Private Key**: Paste from `service-account.json` (`private_key` field)
   - **Project ID**: Paste from `service-account.json` (`project_id` field)
   - **Name**: `Google Calendar Service Account`
6. Click **"Save"**

**Alternative**: You can also upload the entire JSON file if the credential form supports it.

#### 6. Configure Environment Variables
Update your `.env` file or `docker-compose.yml`:

```bash
# Google Calendar Configuration
GOOGLE_CALENDAR_ID=primary  # or your-calendar-id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/home/node/.n8n/service-account.json
```

#### 7. Verify Setup
1. Ensure `service-account.json` is in the `n8n/` directory
2. Restart n8n container: `docker-compose restart`
3. Test booking an appointment via the backend API
4. Check Google Calendar for the created event
5. Test cancellation and verify event is deleted

### Troubleshooting

**Event not created:**
- Verify service account has "Make changes to events" permission on the calendar
- Check n8n execution logs for error messages
- Verify credential is correctly configured in n8n UI
- Ensure calendar ID is correct (use `primary` for primary calendar)

**Event not found during cancellation:**
- Verify the event was created with the correct email as attendee
- Check that date/time format matches exactly
- Review search time range in workflow logs

**Authentication errors:**
- Verify service account JSON file is valid
- Check that service account email matches the one shared with calendar
- Ensure Google Calendar API is enabled in Google Cloud Console

### Additional Features
- Database persistence for appointments
- Email notifications
- SMS reminders
- Calendar conflict detection
- Recurring appointments
- Appointment rescheduling

## Troubleshooting

### Workflows Not Executing
- Check that workflows are **activated** in n8n UI
- Verify webhook URLs are correct in backend configuration
- Check n8n logs: `docker-compose logs n8n`

### Connection Issues
- Ensure both backend and n8n are on the same Docker network
- Verify port 5678 is not blocked by firewall
- Check network connectivity: `docker network inspect chatbot-network`

### Validation Errors
- Review validation rules in workflow Code nodes
- Check incoming data format matches expected schema
- View execution logs in n8n UI for detailed error messages

### Workflow Import Issues
- Ensure JSON files are valid
- Check n8n version compatibility (using `n8nio/n8n:latest`)
- Try importing workflows manually through n8n UI

## Development

### Modifying Workflows

1. Make changes in n8n UI
2. Export workflow as JSON
3. Save to `workflows/` directory
4. Commit changes to version control

### Testing Workflows

1. Use n8n's built-in test execution feature
2. Send test requests using curl or Postman:
   ```bash
   curl -X POST http://localhost:5678/webhook/book \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "date": "2026-02-01",
       "time": "10:30",
       "reason": "Test appointment"
     }'
   ```

### Local Development

For local development without Docker:
1. Install n8n: `npm install -g n8n`
2. Start n8n: `n8n start`
3. Import workflows from `workflows/` directory
4. Configure webhook URLs accordingly

## Production Deployment

### VPS Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Change default admin credentials
- [ ] Configure firewall rules for port 5678
- [ ] Set up SSL/TLS (reverse proxy recommended)
- [ ] Configure persistent volumes for workflows
- [ ] Set up log rotation
- [ ] Configure monitoring and alerts
- [ ] Test webhook connectivity with backend
- [ ] Implement Google Calendar integration
- [ ] Set up backup strategy for workflows

### Security Considerations

- Use strong passwords for basic auth
- Consider implementing OAuth2 for n8n
- Use reverse proxy (nginx/traefik) with SSL
- Restrict network access to n8n service
- Regularly update n8n Docker image
- Monitor execution logs for suspicious activity

## Support

For issues or questions:
1. Check n8n documentation: https://docs.n8n.io
2. Review workflow execution logs
3. Check backend API logs for integration issues
4. Consult project documentation in `ProjectContext.md`
