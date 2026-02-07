# OpenManus Deployment Guide

This guide explains how to deploy OpenManus with a separated architecture:
- **Frontend**: Vercel (static React app)
- **Node.js Backend**: Railway (tRPC + Database)
- **Python Backend**: Railway (WebSocket + OpenAI)

---

## Architecture Overview

```
┌─────────────────┐
│  Vercel         │
│  (Frontend)     │
│  React + Vite   │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  Railway #1     │  │  Railway #2     │
│  Node.js        │  │  Python         │
│  tRPC + DB      │  │  WebSocket +    │
│                 │  │  OpenAI         │
└─────────────────┘  └─────────────────┘
```

---

## 1. Deploy Node.js Backend to Railway

### 1.1 Create Railway Project

1. Visit https://railway.app
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `madfeifei/openmanus-backend`
4. **Important**: Select branch `nodejs-backend`
5. Click **"Deploy"**

### 1.2 Configure Environment Variables

In Railway project settings, add:

```
DATABASE_URL=<your-postgresql-connection-string>
PORT=3001
NODE_ENV=production
JWT_SECRET=<generate-random-secret>
OAUTH_SERVER_URL=https://api.manus.im
VITE_APP_ID=<your-manus-app-id>
OWNER_OPEN_ID=<your-manus-user-id>
OWNER_NAME=<your-name>
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=<your-forge-api-key>
```

### 1.3 Get Deployment URL

After deployment completes, copy the Railway URL (e.g., `https://openmanus-nodejs.up.railway.app`)

---

## 2. Deploy Python Backend to Railway

### 2.1 Create Railway Project

1. Visit https://railway.app
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `madfeifei/openmanus-backend`
4. **Important**: Select branch `main`
5. Click **"Deploy"**

### 2.2 Configure Environment Variables

In Railway project settings, add:

```
OPENAI_API_KEY=<your-openai-api-key>
PORT=8000
```

### 2.3 Get Deployment URL

After deployment completes, copy the Railway URL (e.g., `https://openmanus-python.up.railway.app`)

---

## 3. Deploy Frontend to Vercel

### 3.1 Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```
VITE_BACKEND_URL=https://openmanus-nodejs.up.railway.app
VITE_WEBSOCKET_URL=https://openmanus-python.up.railway.app
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=<your-manus-app-id>
```

### 3.2 Deploy

1. Push latest code to GitHub
2. Vercel will automatically deploy
3. Or manually trigger deployment in Vercel Dashboard

---

## 4. Verify Deployment

### 4.1 Check Node.js Backend

Visit: `https://openmanus-nodejs.up.railway.app/health`

Should return:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 4.2 Check Python Backend

Visit: `https://openmanus-python.up.railway.app/health`

Should return:
```json
{
  "status": "healthy",
  "openai": "configured"
}
```

### 4.3 Check Frontend

1. Visit your Vercel URL (e.g., `https://openmanus-web.vercel.app`)
2. Should load without "Invalid URL" error
3. Click "New Chat" button
4. Should create a new chat session
5. Send a message
6. Should receive AI response

---

## 5. Troubleshooting

### Frontend shows "Backend Not Connected"

- Check `VITE_BACKEND_URL` in Vercel environment variables
- Verify Node.js backend is running on Railway
- Check CORS settings in Node.js backend

### "New Chat" button doesn't work

- Check browser console for errors
- Verify `VITE_BACKEND_URL` points to Node.js backend
- Check Node.js backend logs on Railway

### AI doesn't respond to messages

- Check `VITE_WEBSOCKET_URL` points to Python backend
- Verify `OPENAI_API_KEY` is configured in Python backend
- Check Python backend logs on Railway

### Database connection errors

- Verify `DATABASE_URL` is correctly configured
- Check database is accessible from Railway
- Ensure database allows connections from Railway IPs

---

## 6. Environment Variable Reference

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` | Yes | Node.js backend URL (tRPC API) |
| `VITE_WEBSOCKET_URL` | Yes | Python backend URL (WebSocket) |
| `VITE_OAUTH_PORTAL_URL` | Optional | Manus OAuth portal |
| `VITE_APP_ID` | Optional | Manus app ID for authentication |

### Node.js Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | Yes | Set to `production` |
| `JWT_SECRET` | Yes | Random secret for JWT signing |
| `OAUTH_SERVER_URL` | Optional | Manus OAuth server |
| `VITE_APP_ID` | Optional | Manus app ID |

### Python Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `PORT` | No | Server port (default: 8000) |

---

## 7. Cost Estimation

- **Vercel**: Free tier (100GB bandwidth/month)
- **Railway**: ~$5-10/month per service (depends on usage)
- **Database**: Railway PostgreSQL (included in Railway plan)
- **OpenAI**: Pay per token usage

**Total estimated cost**: $10-30/month

---

## 8. Next Steps

1. Set up custom domain on Vercel
2. Configure SSL certificates (automatic on Vercel/Railway)
3. Set up monitoring and alerts
4. Implement backup strategy for database
5. Add CI/CD pipeline for automated testing

---

## Support

If you encounter issues, check:
1. Railway logs for backend errors
2. Vercel deployment logs
3. Browser console for frontend errors
4. GitHub Issues: https://github.com/madfeifei/openmanus-web/issues
