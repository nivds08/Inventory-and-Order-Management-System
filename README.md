# Inventory & Order Management System

Full-stack inventory and order management application (FastAPI + React + PostgreSQL).

## Design decisions

- **Order deletion as cancellation:** Deleting an order restores the reserved stock back to the product inventory, treating deletion as a cancellation.
- **Order totals:** Calculated on the backend from product prices and line quantities at order creation time.
- **Low stock:** Products with quantity ≤ 10 appear on the dashboard low-stock list (configurable in `backend/app/services/dashboard_service.py`).

## Project structure

```
backend/     # FastAPI API
frontend/    # React (Vite)
docker-compose.yml
.env.example
DEPLOYMENT.md
```

## Backend (Phase 1)

### Prerequisites

- Python 3.11+
- PostgreSQL 15+

### Setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL and CORS_ORIGINS
```

### Run locally

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/dashboard` | Summary stats + low stock |
| POST/GET/GET/PUT/DELETE | `/products`, `/products/{id}` | Product CRUD |
| POST/GET/GET/DELETE | `/customers`, `/customers/{id}` | Customer CRUD |
| POST/GET/GET/DELETE | `/orders`, `/orders/{id}` | Orders (delete restores stock) |

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `ENVIRONMENT` | `development` or `production` |

## Frontend (Phase 2)

### Prerequisites

- Node.js 18+
- Backend running (see above)

### Setup

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8000
```

Ensure `CORS_ORIGINS` in the backend `.env` includes `http://localhost:5173`.

### Run locally

```bash
npm run dev
```

Open http://localhost:5173

### Build for production

```bash
npm run build
npm run preview
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API URL (no trailing slash) |

### Features

- **Dashboard** — product/customer/order counts and low-stock alerts
- **Products** — add, list, edit, delete
- **Customers** — add, list, delete
- **Orders** — create (multi-line), view details, cancel (restores stock)

## Docker (Phase 3)

Run the full stack (PostgreSQL + API + frontend) with Docker Compose.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)

### Setup

From the project root:

```bash
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and other values (never commit .env)
```

### Start all services

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 (optional host access) |

### Stop

```bash
docker compose down
```

Data persists in the named volume `inventory_postgres_data`. To remove data:

```bash
docker compose down -v
```

### Docker Hub (backend image)

Build and push the backend image for submission:

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/inventory-backend:latest ./backend
docker push YOUR_DOCKERHUB_USERNAME/inventory-backend:latest
```

### Compose environment variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | db, backend | Database user |
| `POSTGRES_PASSWORD` | db, backend | Database password |
| `POSTGRES_DB` | db, backend | Database name |
| `CORS_ORIGINS` | backend | Must include frontend URL (e.g. `http://localhost:5173`) |
| `VITE_API_BASE_URL` | frontend build | API URL reachable from the **browser** |
| `ENVIRONMENT` | backend | `production` in Docker |

### Images used (slim/lightweight)

- `python:3.12-slim` — backend
- `node:20-alpine` + `nginx:alpine` — frontend (multi-stage)
- `postgres:16-alpine` — database

## Deployment (Phase 4)

Production hosting:

| Component | Platform |
|-----------|----------|
| Backend API | [Railway](https://railway.app/) |
| PostgreSQL | Railway (plugin) |
| Frontend | [Vercel](https://vercel.com/) |

**Step-by-step guide:** see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick reference

**Railway (backend service)**

- Root Directory: `backend`
- Variables: `DATABASE_URL` (from Postgres), `CORS_ORIGINS`, `ENVIRONMENT=production`
- Public URL → use for `VITE_API_BASE_URL` on Vercel

**Vercel (frontend)**

- Root Directory: `frontend`
- Variable: `VITE_API_BASE_URL=https://your-railway-app.up.railway.app`

After Vercel deploy, add the Vercel URL to Railway `CORS_ORIGINS` and redeploy the backend.

### Submission template

| Item | Link |
|------|------|
| GitHub repo | _add yours_ |
| Docker Hub image | _add yours_ |
| Live frontend | _add yours_ |
| Live backend API | _add yours_ |
