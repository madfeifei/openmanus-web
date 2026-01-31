# Configuration Guide

## Frontend Configuration

The frontend needs to know the backend API URL to communicate with the OpenManus backend.

### Environment Variables

Add the following environment variable in the Vercel dashboard or your deployment platform:

```
VITE_BACKEND_URL=https://your-backend-url.com
```

For local development, you can create a `.env.local` file:

```bash
# .env.local (for local development only)
VITE_BACKEND_URL=http://localhost:8000
```

### Default Behavior

If `VITE_BACKEND_URL` is not set, the frontend will default to `http://localhost:8000`.

## Backend Configuration

See the backend README at `/home/ubuntu/openmanus-backend/README.md` for backend configuration details.
