# Deployment Guide (Railway + Vercel)

Deploy the backend and PostgreSQL on **Railway**, and the React frontend on **Vercel**.

## Prerequisites

- GitHub repository with this project pushed
- [Railway](https://railway.app/) account (free tier)
- [Vercel](https://vercel.com/) account (free tier)
- [Docker Hub](https://hub.docker.com/) account (for backend image submission)

---

## Part 1: Railway (PostgreSQL + Backend)

### 1.1 Create project and database

1. Go to [railway.app](https://railway.app/) → **New Project**.
2. Choose **Provision PostgreSQL** (creates a Postgres service).
3. Open the PostgreSQL service → **Variables** → note `DATABASE_URL` (or connect via **Connect**).

### 1.2 Deploy the backend API

1. In the same project, click **New** → **GitHub Repo** → select your repository.
2. Open the new service → **Settings**:
   - **Root Directory:** `backend` *(recommended)* — or leave blank to use the repo-root `Dockerfile`
   - **Builder:** **Dockerfile** (not Railpack/Nixpacks auto-detect)
   - If you see Railpack failures, click **Clear build cache** and redeploy after pushing the latest code
3. **Variables** — **required before deploy will stay healthy:**

   Click **Set DATABASE_URL variable** (or add manually):

   | Variable | Value |
   |----------|--------|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — use **Add Reference** → pick your **PostgreSQL** service → `DATABASE_URL` |
   | `PORT` | `8000` — **required if Networking shows port 8000** (see troubleshooting below) |
   | `CORS_ORIGINS` | Your Vercel URL(s), e.g. `https://your-app.vercel.app` (can add after Vercel deploy) |
   | `ENVIRONMENT` | `production` |

   **Without `DATABASE_URL`, the API crashes on startup and the healthcheck fails.**

   To reference Postgres URL in Railway: **Variables** → **New Variable** → **Add Reference** → select the Postgres service → choose `DATABASE_URL`.

4. **Networking** → **Generate Domain** → copy the public URL (e.g. `https://inventory-backend-production.up.railway.app`).

5. Deploy and wait until healthy. Test:

   ```text
   https://YOUR-RAILWAY-URL/health
   ```

   Expected: `{"status":"ok"}`

6. Optional: open `https://YOUR-RAILWAY-URL/docs` for Swagger UI.

### 1.3 Troubleshooting (Railway)

| Issue | Fix |
|-------|-----|
| **`railpack process exited with an error`** | Railway tried to auto-detect the repo root (monorepo). **Fix A:** Push latest code (includes root `railway.toml` + `Dockerfile`). **Fix B:** Service → **Settings** → set **Root Directory** to `backend` OR set **Builder** to **Dockerfile**. Redeploy. |
| **Healthcheck failure** (build OK, deploy fails) | **`DATABASE_URL` not set.** Backend service → **Variables** → add `DATABASE_URL` referencing Postgres → **Redeploy**. Check **Deploy Logs** for `DATABASE_URL is not configured`. |
| **"Application failed to respond"** (deploy OK, browser error) | **Port mismatch.** Deploy logs show `Uvicorn ... 8080` but Networking shows **8000**. **Fix:** Backend → **Variables** → add `PORT` = `8000` → **Redeploy**. Deploy logs must show `API listening on ... 8000`. **Or** change Networking port to **8080** to match logs. |
| Build fails / wrong files in logs | Use **Root Directory** `backend` *or* leave root empty and use repo-root `Dockerfile` (both are supported after the fix above). |
| DB connection error | Ensure `DATABASE_URL` references Postgres; URL uses `postgresql://` (auto-normalized) |
| CORS errors in browser | Add exact Vercel URL to `CORS_ORIGINS` (include `https://`, no trailing slash) |
| App not listening | Dockerfile uses `$PORT` — do not override start command unless you keep `$PORT` |

**Two valid Railway setups (pick one):**

| Option | Root Directory | What builds |
|--------|----------------|-------------|
| **A (recommended)** | `backend` | `backend/Dockerfile` + `backend/railway.toml` |
| **B** | *(empty / repo root)* | Root `Dockerfile` + `railway.toml` |

---

## Part 2: Vercel (Frontend)

### 2.1 Import project

1. Go to [vercel.com](https://vercel.com/) → **Add New** → **Project** → import your GitHub repo.
2. **Configure Project:**
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 2.2 Environment variables

Under **Environment Variables**, add:

| Name | Value | Environments |
|------|--------|----------------|
| `VITE_API_BASE_URL` | `https://YOUR-RAILWAY-URL` (no trailing slash) | Production, Preview |

Redeploy after changing env vars (Vite bakes `VITE_*` at build time).

### 2.3 Deploy and verify

1. Deploy → copy the Vercel URL (e.g. `https://your-app.vercel.app`).
2. Update Railway **`CORS_ORIGINS`** to include that URL → redeploy backend.
3. Open the Vercel site → use Dashboard, Products, Customers, Orders.

### 2.4 Troubleshooting (Vercel)

| Issue | Fix |
|-------|-----|
| API calls fail / CORS | Set `CORS_ORIGINS` on Railway to match Vercel URL exactly |
| Wrong API host | Rebuild Vercel after fixing `VITE_API_BASE_URL` |
| 404 on refresh | `vercel.json` rewrites are included — ensure Root Directory is `frontend` |

---

## Part 3: Docker Hub (submission)

From your machine (with Docker installed):

```bash
docker login
docker build -t YOUR_DOCKERHUB_USERNAME/inventory-backend:latest ./backend
docker push YOUR_DOCKERHUB_USERNAME/inventory-backend:latest
```

Image link: `https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/inventory-backend`

---

## Part 4: Submission checklist

Fill in after deployment:

| Deliverable | Your link |
|-------------|-----------|
| GitHub repository | `https://github.com/YOUR_USERNAME/YOUR_REPO` |
| Docker Hub backend image | `https://hub.docker.com/r/YOUR_USERNAME/inventory-backend` |
| Live frontend (Vercel) | `https://your-app.vercel.app` |
| Live backend API (Railway) | `https://your-backend.up.railway.app` |

Quick verification:

- [ ] `GET /health` returns OK on Railway URL
- [ ] Vercel app loads dashboard without console CORS errors
- [ ] Create product → customer → order end-to-end on production
- [ ] Delete order restores stock (check product quantity)

---

## Environment summary

| Platform | Variables |
|----------|-----------|
| **Railway (backend)** | `DATABASE_URL`, `CORS_ORIGINS`, `ENVIRONMENT`, `PORT` (set by Railway) |
| **Vercel (frontend)** | `VITE_API_BASE_URL` |

Never commit `.env` files with real passwords to GitHub.
