# Monorepo root Dockerfile for Railway (when Root Directory is the repo root).
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 appuser

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/start.sh ./start.sh
RUN chmod +x ./start.sh

USER appuser

# Railway injects PORT at runtime (often 8080). Do not hardcode in CMD.
CMD ["./start.sh"]
