# 🐳 Docker Orchestration Guide

For private cloud, on-premise, or local containerized development, SkyView provides a complete Docker multi-container stack.

---

## 🚀 Quickstart with Docker Compose

To spin up the PostgreSQL database, FastAPI backend, and React web client simultaneously:

```bash
docker compose up -d --build
```

### Stack Components

```mermaid
flowchart TD
    Client[Browser / Mobile] -->|Port 3000| Frontend[skyview-frontend (Nginx Container)]
    Client -->|Port 8000| Backend[skyview-backend (FastAPI / Uvicorn)]
    Backend -->|Port 5432| DB[(skyview-postgres (PostgreSQL 16))]
```

- **Frontend Container:** Accessible at `http://localhost:3000`
- **Backend Container:** Accessible at `http://localhost:8000/docs`
- **Database Container:** Accessible at `localhost:5432`

---

## 🛑 Stopping and Cleaning Containers

```bash
# Stop running services
docker compose down

# Stop and wipe persistent database volumes
docker compose down -v
```
