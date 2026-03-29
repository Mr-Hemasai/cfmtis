# CFMTIS

Cyber Fraud Money Trail Intelligence System.

CFMTIS is a case-driven cyber fraud investigation workspace with:
- case registration
- evidence upload
- Excel-driven fraud analysis
- money trail graphing
- risk and freeze workflows
- recovery tracking

The project is split into:
- [/Users/hemasai/Documents/cydertrail/server](/Users/hemasai/Documents/cydertrail/server) - Node.js, Express, Prisma, Python analyzer bridge
- [/Users/hemasai/Documents/cydertrail/client](/Users/hemasai/Documents/cydertrail/client) - React, Vite, Zustand, D3/Recharts UI

## Architecture

### Backend
- Express API
- Prisma + PostgreSQL
- JWT auth
- analyzer pipeline triggered per case

### Analyzer
- workbook parsing and reporting through:
  - TypeScript orchestration
  - Python analyzer for Excel-heavy datasets
- Python packages:
  - `pandas`
  - `openpyxl`
  - `networkx`

### Frontend
- React + Vite
- state management with Zustand
- graph rendering with D3

## Main Features

- Complaint registration
- Evidence file upload
- Analyzer-driven case processing
- Money trail graph
- Risk and freeze review
- Recovery dashboard
- Sample dataset download from the dashboard

## Repository Layout

```text
cydertrail/
  client/
  server/
```

Important backend paths:
- [/Users/hemasai/Documents/cydertrail/server/src/app.ts](/Users/hemasai/Documents/cydertrail/server/src/app.ts)
- [/Users/hemasai/Documents/cydertrail/server/src/prisma/schema.prisma](/Users/hemasai/Documents/cydertrail/server/src/prisma/schema.prisma)
- [/Users/hemasai/Documents/cydertrail/server/src/jobs/analysisJob.ts](/Users/hemasai/Documents/cydertrail/server/src/jobs/analysisJob.ts)
- [/Users/hemasai/Documents/cydertrail/server/src/services/analyzerService.ts](/Users/hemasai/Documents/cydertrail/server/src/services/analyzerService.ts)
- [/Users/hemasai/Documents/cydertrail/server/python/analyzer_engine.py](/Users/hemasai/Documents/cydertrail/server/python/analyzer_engine.py)

Important frontend paths:
- [/Users/hemasai/Documents/cydertrail/client/src/App.tsx](/Users/hemasai/Documents/cydertrail/client/src/App.tsx)
- [/Users/hemasai/Documents/cydertrail/client/src/pages/Dashboard.tsx](/Users/hemasai/Documents/cydertrail/client/src/pages/Dashboard.tsx)
- [/Users/hemasai/Documents/cydertrail/client/src/pages/CaseWorkspace.tsx](/Users/hemasai/Documents/cydertrail/client/src/pages/CaseWorkspace.tsx)
- [/Users/hemasai/Documents/cydertrail/client/src/pages/CaseGraphTab.tsx](/Users/hemasai/Documents/cydertrail/client/src/pages/CaseGraphTab.tsx)

## Local Setup

### Requirements

- Node.js 20+
- npm
- Python 3
- PostgreSQL

### 1. Install backend dependencies

```bash
cd /Users/hemasai/Documents/cydertrail/server
npm install
python3 -m pip install -r python/requirements.txt
```

### 2. Configure backend environment

Create [/Users/hemasai/Documents/cydertrail/server/.env](/Users/hemasai/Documents/cydertrail/server/.env):

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=8h
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
CLIENT_ORIGIN=http://localhost:5173
```

Required variables are validated in [/Users/hemasai/Documents/cydertrail/server/src/utils/env.ts](/Users/hemasai/Documents/cydertrail/server/src/utils/env.ts).

### 3. Run Prisma migration

```bash
cd /Users/hemasai/Documents/cydertrail/server
npx prisma migrate dev --schema src/prisma/schema.prisma
```

### 4. Seed initial data

```bash
cd /Users/hemasai/Documents/cydertrail/server
npm run seed
```

### 5. Start backend

```bash
cd /Users/hemasai/Documents/cydertrail/server
npm run dev
```

### 6. Install frontend dependencies

```bash
cd /Users/hemasai/Documents/cydertrail/client
npm install
```

### 7. Configure frontend environment

Create [/Users/hemasai/Documents/cydertrail/client/.env.local](/Users/hemasai/Documents/cydertrail/client/.env.local):

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 8. Start frontend

```bash
cd /Users/hemasai/Documents/cydertrail/client
npm run dev
```

## Default Seed Login

- Badge Number: `CID-001`
- Password: `Admin@1234`

## Build

### Backend

```bash
cd /Users/hemasai/Documents/cydertrail/server
npm run build
```

### Frontend

```bash
cd /Users/hemasai/Documents/cydertrail/client
npm run build
```

## Analyzer Notes

### How it works

1. Investigator creates a case.
2. Evidence workbook is uploaded.
3. Analyzer job is queued.
4. Backend materializes the uploaded workbook for parsing.
5. Analyzer builds:
   - case analysis
   - graph data
   - risk output
   - recovery output

### Supported storage behavior

Uploaded files are moving toward database-backed storage through `UploadedFile.content`.

Current behavior supports both:
- database-backed binary content
- legacy disk-backed `storageKey` fallback

If you add new file-storage columns, run Prisma migrations before deployment.

### Key analyzer endpoints

- `POST /api/cases/:id/analyze`
- `GET /api/cases/:id/status`
- `GET /api/cases/:id/graph`
- `GET /api/cases/:id/risk`
- `GET /api/cases/:id/recovery`

## Deployment

### Backend on Render

Deploy [/Users/hemasai/Documents/cydertrail/server](/Users/hemasai/Documents/cydertrail/server) as a Render Web Service.

Root Directory:

```text
server
```

Build Command:

```bash
npm install && python3 -m pip install -r python/requirements.txt && npm run build
```

Start Command:

```bash
node dist/app.js
```

Pre-Deploy Command:

```bash
npx prisma migrate deploy --schema src/prisma/schema.prisma
```

Environment variables:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=8h
CLIENT_ORIGIN=https://your-frontend-domain.vercel.app
UPLOAD_DIR=/var/data/uploads
MAX_FILE_SIZE_MB=50
```

If you want seeded data in a new environment, run once:

```bash
npm run seed
```

### Frontend on Vercel

Deploy [/Users/hemasai/Documents/cydertrail/client](/Users/hemasai/Documents/cydertrail/client).

Root Directory:

```text
client
```

Build Command:

```bash
npm install && npm run build
```

Output Directory:

```text
dist
```

Vercel env:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

SPA route reloads are handled by:
- [/Users/hemasai/Documents/cydertrail/client/vercel.json](/Users/hemasai/Documents/cydertrail/client/vercel.json)

## Troubleshooting

### `Officer` table does not exist

Run:

```bash
cd /Users/hemasai/Documents/cydertrail/server
npx prisma migrate dev --schema src/prisma/schema.prisma
npm run seed
```

### Login returns `401` on deployment

Check:
- `VITE_API_BASE_URL`
- `CLIENT_ORIGIN`
- backend redeployed after auth changes

### Login returns `429`

The login route is rate-limited. Wait for the limit window or redeploy after configuration changes.

### Reloading a Vercel route returns `404`

Ensure:
- [/Users/hemasai/Documents/cydertrail/client/vercel.json](/Users/hemasai/Documents/cydertrail/client/vercel.json)
  is included in the deployment

### Analyzer appears empty on deployment

Check Render logs for:
- `ANALYSIS REQUESTED`
- `ANALYZER STARTED`
- `VICTIM FOUND`
- `GRAPH BUILT`
- `RISK CALCULATED`

If analysis finishes long after graph/risk/recovery are first requested, the issue is usually frontend timing rather than analyzer failure.

## Current Notes

- Redis is not used
- Docker is not used
- backend auth supports bearer-token requests from the deployed frontend
- sample datasets are listed from the backend upload directory

