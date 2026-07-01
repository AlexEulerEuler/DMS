# DMS Console Frontend

Next.js frontend for the DMS management console.

## Development

```bash
npm install
npm run dev:dms:frontend
```

The app expects the FastAPI backend at `http://localhost:8000` by default.
Override it with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_INTERNAL_URL=http://localhost:8000
```
