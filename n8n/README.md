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

## Future Enhancements

### Google Calendar Integration
The workflows include placeholder nodes for Google Calendar integration. To implement:

1. Set up Google Calendar API credentials in n8n
2. Replace "Google Calendar Stub" nodes with actual Google Calendar nodes
3. Configure calendar ID and event creation/deletion logic
4. Test with real calendar events

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
