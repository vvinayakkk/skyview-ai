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
settings = get_settings()

app = FastAPI(
    title="SkyView Smart Agriculture API",
    version="2.0.0",
    description="Multi-agent IoT + AI agricultural platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        for col, col_type in [
            ("latitude", "DOUBLE PRECISION"),
            ("longitude", "DOUBLE PRECISION"),
            ("state", "VARCHAR(100)"),
            ("district", "VARCHAR(100)"),
            ("excess_resources", "TEXT"),
            ("required_resources", "TEXT"),
            ("whatsapp_number", "VARCHAR(20)")
        ]:
            try:
                db.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {col_type}"))
                db.commit()
            except Exception as col_exc:
                logger.warning("Could not add column %s to users: %s", col, col_exc)

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
        logger.info("✅ Registered: %s", module_path)
    except Exception as exc:
        logger.warning("⚠️  Could not register %s: %s", module_path, exc)


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

# Admin panel
_register("skyview.admin.admin_routes")