# Testing n8n Workflows

## Quick Test Commands

### Test Book Appointment Workflow

```powershell
# Test with valid data
$body = @{
    name = "John Doe"
    email = "john@example.com"
    date = "2026-02-15"
    time = "10:30"
    reason = "Consultation"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook/book" -Method Post -Body $body -ContentType "application/json"
```

### Test Cancel Appointment Workflow

```powershell
# Test with valid data
$body = @{
    email = "john@example.com"
    date = "2026-02-15"
    time = "10:30"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook/cancel" -Method Post -Body $body -ContentType "application/json"
```

### Test with Invalid Data (should return 400 error)

```powershell
# Missing required fields
$body = @{
    name = "John Doe"
    # email missing
    date = "2026-02-15"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5678/webhook/book" -Method Post -Body $body -ContentType "application/json"
```

## View Execution Logs in n8n

1. Go to "Executions" in the left sidebar
2. You'll see all workflow executions
3. Click on any execution to see detailed logs
4. Check the console output from "Log Booking Request" or "Log Cancellation Request" nodes

## Test Through Backend (Full Integration)

1. Make sure backend is configured with n8n webhook URLs
2. Start the backend service
3. Send requests to backend endpoints:
   - `POST http://localhost:3000/appointments/book`
   - `POST http://localhost:3000/appointments/cancel`
