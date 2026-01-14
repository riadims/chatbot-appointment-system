# Backend Setup Guide

## Environment Variables Setup

### Step 1: Create .env file from template

**Option A: Copy the example file**
```powershell
# In PowerShell (from project root)
Copy-Item backend\.env.example backend\.env
```

**Option B: Manually create**
Create a file named `.env` in the `backend/` directory with:
```
PORT=3000
NODE_ENV=development
N8N_BOOK_WEBHOOK_URL=https://your-n8n-instance.com/webhook/book
N8N_CANCEL_WEBHOOK_URL=https://your-n8n-instance.com/webhook/cancel
```

### Step 2: Update .env with your actual values
- Replace the n8n webhook URLs with your actual n8n instance URLs
- Adjust PORT if needed (default: 3000)

### Step 3: Verify .env is ignored
✅ `.env` is already in `.gitignore` at the root level, so it won't be committed to git.

**Note:** You can delete `.env.example` if you want, but it's recommended to keep it as a template for other developers or deployments.

---

## Docker Setup

### Prerequisites
- Docker Desktop installed and running
- Docker Compose (optional, for multi-container setup)

### Build the Docker Image

From the project root:
```powershell
docker build -t chatbot-appointment-backend ./backend
```

Or from the backend directory:
```powershell
cd backend
docker build -t chatbot-appointment-backend .
```

### Run the Container

**Option 1: Using environment variables from .env file**
```powershell
docker run -p 3000:3000 --env-file backend/.env chatbot-appointment-backend
```

**Option 2: Using inline environment variables**
```powershell
docker run -p 3000:3000 `
  -e PORT=3000 `
  -e N8N_BOOK_WEBHOOK_URL=https://your-n8n-instance.com/webhook/book `
  -e N8N_CANCEL_WEBHOOK_URL=https://your-n8n-instance.com/webhook/cancel `
  chatbot-appointment-backend
```

**Option 3: Using Docker Compose (recommended for development)**
Create or update `docker-compose.yml` in the project root:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file:
      - ./backend/.env
    restart: unless-stopped
```

Then run:
```powershell
docker-compose up
```

### Verify It's Running

1. Check container status:
```powershell
docker ps
```

2. Test the health endpoint:
```powershell
curl http://localhost:3000/health
# Or in PowerShell:
Invoke-WebRequest -Uri http://localhost:3000/health
```

3. View logs:
```powershell
docker logs <container-id>
# Or if using docker-compose:
docker-compose logs -f backend
```

### Stop the Container

```powershell
# Stop a running container
docker stop <container-id>

# Or with docker-compose
docker-compose down
```

---

## Local Development (Without Docker)

### Install Dependencies
```powershell
cd backend
npm install
```

### Run in Development Mode
```powershell
npm run dev
```
This uses nodemon for auto-reload on file changes.

### Run in Production Mode
```powershell
npm start
```

---

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, either:
- Change PORT in `.env` to a different port (e.g., 3001)
- Stop the process using port 3000

### n8n Webhook Errors
- Verify your n8n webhook URLs are correct
- Ensure n8n instance is accessible
- Check n8n workflow is active and webhook is enabled

### Docker Build Fails
- Ensure Docker Desktop is running
- Check you're in the correct directory
- Verify Dockerfile syntax is correct
