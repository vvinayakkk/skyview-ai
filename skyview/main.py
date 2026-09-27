"""
SkyView Smart Agriculture — FastAPI Application
Entry point. Thin orchestrator — logic lives in routers/agents.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from skyview.utils.config import get_settings
from skyview.utils.logger import get_logger, setup_logging
from skyview.data.db import init_db

setup_logging()
logger = get_logger(__name__)
import time
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

settings = get_settings()

app = FastAPI(
    title="SkyView Smart Agriculture API",
    version="2.0.0",
    description="Multi-agent IoT + AI agricultural platform",
)

# 1. Performance timing & intelligent HTTP Cache-Control injection
class PerformanceAndCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        response: Response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time-Ms"] = f"{process_time * 1000:.2f}"

        # Inject Cache-Control for read-only GET endpoints to allow browser & edge caching
        if request.method == "GET" and response.status_code == 200:
            path = request.url.path
            if any(p in path for p in ["/api/mandi", "/api/marketplace/farmers", "/api/marketplace/loops", "/api/marketplace/directory", "/api/trends", "/api/schemes"]):
                if "cache-control" not in response.headers:
                    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=86400"
            elif any(p in path for p in ["/api/sensor/readings", "/api/weather"]):
                if "cache-control" not in response.headers:
                    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=60"
        return response

app.add_middleware(PerformanceAndCacheMiddleware)

# 2. GZip compression (reduces JSON payload size across the wire by up to 80%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 3. Secure CORS Configuration (Sonar S5122 compliant)
safe_cors_origins = [o for o in settings.CORS_ORIGINS if o != "*"]
if not safe_cors_origins:
    safe_cors_origins = ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=safe_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)


@app.on_event("startup")
def on_startup():
    logger.info("=" * 55)
    logger.info("🌾 SkyView Backend v2.0 starting…")
    logger.info("=" * 55)
    logger.info("Groq keys configured: %d", len(settings.GROQ_API_KEYS))

    try:
        init_db()
    except Exception as exc:
        logger.warning("DB init warning: %s", exc)

    # Ensure users table always exists (safe fallback)
    from skyview.data.db import get_session
    from sqlalchemy import text
    try:
        db = get_session()
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                phone VARCHAR(20) PRIMARY KEY,
                name VARCHAR(100),
                land_size_acres FLOAT,
                location VARCHAR(200),
                crops TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.commit()

        # Add new marketplace/geographic columns if they don't exist
        # Using explicit static DDL statements to satisfy static analysis (Sonar S3649)
        column_ddls = [
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION"),
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION"),
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100)"),
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(100)"),
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS excess_resources TEXT"),
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS required_resources TEXT"),
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)"),
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_otp VARCHAR(10)"),
        ]
        for ddl_stmt in column_ddls:
            try:
                db.execute(ddl_stmt)
                db.commit()
            except Exception as col_exc:
                logger.debug("Column migration note: %s", col_exc)

        db.close()
    except Exception as exc:
        logger.warning("Users table check: %s", exc)


# ── Router registration ───────────────────────────────────────────────────────

def _register(module_path: str, attr: str = "router", prefix: str = ""):
    try:
        import importlib
        mod = importlib.import_module(module_path)
        router = getattr(mod, attr)
        app.include_router(router, prefix=prefix)
        logger.info("[OK] Registered: %s", module_path)
    except Exception as exc:
        logger.warning("[WARN] Could not register %s: %s", module_path, exc)


# Core system routes
_register("skyview.api.core_routes")

# Sensor / IoT routes
_register("skyview.api.sensor_routes")

# Auth
_register("skyview.api.auth_routes")

# AI / Chat
_register("skyview.api.chat_routes")

# FPGA accelerator
_register("skyview.api.fpga_routes")

# Farm advisor
_register("skyview.api.advisor_routes")

# Mandi rates
_register("skyview.api.mandi_routes")

# WhatsApp webhooks
_register("skyview.api.webhook_routes")

# Voice / speech / translation
_register("skyview.api.voice_routes")

# Agentic voice orchestration (Sarvam STT/TTS + multi-step agent)
_register("skyview.api.voice_agent")

# Farmer profile & government schemes
_register("skyview.api.profile_routes")

# Marketplace matching
_register("skyview.api.marketplace_routes")

# Crop disease detection & plant pathology diagnostics
_register("skyview.api.disease_routes")

# Admin panel
_register("skyview.admin.admin_routes")