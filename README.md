# DMS

Development Management System for autonomous agent projects.

This repository is organized as a workspace containing the projects managed by DMS and the DMS management console itself. Keep those two concerns separate: `apps/frontend` and `apps/backend` are managed target projects, while `apps/dms-console` contains the DMS console runtime and documentation.

## Directory Structure

```text
DMS/
├── apps/
│   ├── frontend/       # Managed target project frontend
│   ├── backend/        # Managed target project backend
│   └── dms-console/    # DMS documentation, operations, and management console
│       ├── frontend/   # DMS console Next.js app
│       ├── backend/    # DMS console FastAPI service
│       ├── contracts/  # DMS console API contracts
│       └── docs/       # DMS console IA and references
├── docs/               # Workspace-level architecture, decisions, and product docs
├── packages/           # Shared code, schemas, UI, and configuration packages
├── infra/              # Deployment, Docker, and migration assets
└── scripts/            # Workspace automation scripts
```

## App Areas

- `apps/frontend`: managed target project frontend. Do not place DMS console code here.
- `apps/backend`: managed target project backend. Do not place DMS console code here.
- `apps/dms-console/frontend`: DMS console Next.js app.
- `apps/dms-console/backend`: DMS console FastAPI API.
- `apps/dms-console`: DMS documentation, management views, GitHub integration, and future operational workflows.

## Documentation

- `apps/dms-console/docs/ia.md`: DMS console information architecture.
- `apps/dms-console/docs/references/`: reference screenshots for the DMS console.
- `docs/decisions/0001-nextjs-fastapi-stack.md`: stack decision record.

## Development

Install DMS console frontend dependencies:

```bash
npm install
```

Run the DMS console frontend:

```bash
npm run dev:dms:frontend
```

Set up and run the DMS console backend:

```bash
cd apps/dms-console/backend
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --port 8000
```

From the repository root, the backend can also be started with:

```bash
npm run dev:dms:backend
```

Use reload mode when the local environment allows file watching:

```bash
npm run dev:dms:backend:reload
```

Run backend checks:

```bash
npm run lint:dms:backend
npm run test:dms:backend
```

Generate the backend OpenAPI schema:

```bash
npm run openapi:dms:backend
```
