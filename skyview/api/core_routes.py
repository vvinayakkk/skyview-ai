"""Core routes: root, health, LLM pool status."""

from datetime import datetime

from fastapi import APIRouter

from skyview.data.db import health_check
from skyview.utils.llm_pool import pool_status

router = APIRouter(tags=["System"])


@router.get("/")
def root():
    return {
        "system": "SkyView Smart Agriculture API v2.0",
        "status": "✅ Running",
        "docs": "/docs",
        "admin": "/admin/tables",
    }


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "✅" if health_check() else "❌",
        "llm_pool": pool_status(),
    }


@router.get("/api/llm-pool")
def llm_pool_status():
    """Live status of the multi-key Groq load balancer."""
    return pool_status()


@router.options("/{full_path:path}")
def options_handler():
    return {"status": "ok"}