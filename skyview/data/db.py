"""
Database Layer — SQLAlchemy engine, sessions, and health utilities.
Supports PostgreSQL (Neon) with SQLite fallback.
"""

import logging
import time
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional, Union

from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from skyview.utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_engine = None
_SessionLocal = None


def _make_engine(database_url: str):
    kwargs: Dict[str, Any] = {"pool_pre_ping": True, "echo": False}
    if "sqlite" in database_url.lower():
        kwargs["connect_args"] = {"check_same_thread": False}
        kwargs["poolclass"] = StaticPool
    else:
        kwargs["pool_size"] = settings.DB_POOL_SIZE
        kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
    return create_engine(database_url, **kwargs)


def init_db() -> None:
    """Initialize engine and session factory. Call once at startup."""
    global _engine, _SessionLocal
    if _engine is not None:
        return
    url = settings.get_database_url()
    logger.info("🔌 DB init: %s", url.split("@")[-1] if "@" in url else url)
    try:
        _engine = _make_engine(url)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ DB connection OK")
    except Exception as exc:
        logger.error("❌ DB init failed: %s", exc)
        raise


def get_session() -> Session:
    if _SessionLocal is None:
        init_db()
    return _SessionLocal()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency."""
    db = get_session()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    """Context manager for non-FastAPI code."""
    db = get_session()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def execute_query(
    query: Union[str, Any],
    params: Optional[Dict] = None,
    retries: int = 3,
) -> Optional[List]:
    params = params or {}
    for attempt in range(retries):
        db = None
        try:
            db = get_session()
            result = db.execute(text(query) if isinstance(query, str) else query, params)
            rows = result.fetchall()
            db.close()
            return rows
        except SQLAlchemyError as exc:
            logger.warning("Query attempt %d/%d: %s", attempt + 1, retries, exc)
            if db:
                db.close()
            if attempt < retries - 1:
                time.sleep(0.5 * (attempt + 1))
    return None


def execute_update(
    query: Union[str, Any],
    params: Optional[Dict] = None,
    retries: int = 3,
) -> bool:
    params = params or {}
    for attempt in range(retries):
        db = None
        try:
            db = get_session()
            db.execute(text(query) if isinstance(query, str) else query, params)
            db.commit()
            db.close()
            return True
        except SQLAlchemyError as exc:
            logger.warning("Update attempt %d/%d: %s", attempt + 1, retries, exc)
            if db:
                db.rollback()
                db.close()
            if attempt < retries - 1:
                time.sleep(0.5 * (attempt + 1))
    return False


def health_check() -> bool:
    try:
        db = get_session()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as exc:
        logger.error("DB health check failed: %s", exc)
        return False