"""
Fast Database Seed Script
Uses pandas bulk inserts (COPY protocol for Postgres) instead of row-by-row.
118k rows should take seconds, not hours.

Usage:
    python -m skyview.data.seed_fast --csv-dir "backend/skyview_seed_csvs/csv"
    python -m skyview.data.seed_fast --csv-dir "backend/skyview_seed_csvs/csv" --skip-weather
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy import text

from skyview.data.db import get_session, init_db
from skyview.data.schema import init_schema
from skyview.utils.logger import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_csv(csv_dir: Path, filename: str) -> Optional[pd.DataFrame]:
    path = csv_dir / filename
    if not path.exists():
        logger.warning("CSV not found, skipping: %s", path)
        return None
    df = pd.read_csv(path)
    # Replace NaN with None so SQLAlchemy sends NULL
    df = df.where(pd.notnull(df), None)
    logger.info("  Loaded %s  (%d rows)", filename, len(df))
    return df


def _truncate(db, table: str) -> None:
    try:
        db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
    except Exception:
        db.execute(text(f"DELETE FROM {table}"))
    db.commit()
    logger.info("  Truncated: %s", table)


def _bulk_insert(engine, df: pd.DataFrame, table: str, if_exists: str = "append", chunksize: int = 5000) -> int:
    """
    Use pandas to_sql with method='multi' for fast bulk inserts.
    For PostgreSQL, this generates multi-row INSERT statements.
    Much faster than row-by-row SQLAlchemy execute.
    """
    if df is None or df.empty:
        return 0

    df.to_sql(
        table,
        con=engine,
        if_exists=if_exists,
        index=False,
        chunksize=chunksize,
        method="multi",  # multi-row INSERT — orders of magnitude faster
    )
    return len(df)


def _get_engine():
    """Get the raw SQLAlchemy engine (needed for pandas to_sql)."""
    from skyview.data.db import _engine, init_db
    if _engine is None:
        init_db()
    from skyview.data.db import _engine
    return _engine


# ── Column normalizers (rename CSV cols → DB cols if needed) ──────────────────

def _prep_installations(df: pd.DataFrame) -> pd.DataFrame:
    datetime_cols = [
        "installation_date",
        "last_heartbeat",
        "created_at",
        "updated_at",
    ]

    for col in datetime_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    keep = [
        "station_id",
        "name",
        "description",
        "latitude",
        "longitude",
        "location_name",
        "installation_date",
        "status",
        "device_type",
        "firmware_version",
        "last_heartbeat",
        "created_at",
        "updated_at",
    ]

    return df[[c for c in keep if c in df.columns]]


def _prep_installation_sensors(df: pd.DataFrame) -> pd.DataFrame:
    if "active" in df.columns:
        df["active"] = (
            df["active"]
            .fillna(False)
            .astype(int)
            .astype(bool)
        )

    keep = [
        "installation_id",
        "sensor_type",
        "sensor_name",
        "unit",
        "active",
    ]

    return df[[c for c in keep if c in df.columns]]


def _prep_weather(df: pd.DataFrame) -> pd.DataFrame:
    keep = [
        "station_id", "timestamp", "temperature", "humidity", "pressure",
        "wind_speed", "wind_direction", "rainfall",
        "soil_temperature", "soil_moisture",
        "pm25", "pm10", "uv_index", "lux",
        "battery_voltage", "solar_voltage", "created_at", "updated_at",
    ]
    return df[[c for c in keep if c in df.columns]]


def _prep_alerts(df: pd.DataFrame) -> pd.DataFrame:
    if "acknowledged" in df.columns:
        df["acknowledged"] = (
            df["acknowledged"]
            .fillna(False)
            .astype(int)
            .astype(bool)
        )

    for col in ["created_at", "acknowledged_at"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    keep = [
        "station_id",
        "alert_type",
        "severity",
        "message",
        "value",
        "threshold",
        "acknowledged",
        "created_at",
        "acknowledged_at",
    ]

    return df[[c for c in keep if c in df.columns]]


def _prep_user_prefs(df: pd.DataFrame) -> pd.DataFrame:
    keep = ["user_id", "preferred_unit", "verbosity", "alert_channel", "created_at"]
    return df[[c for c in keep if c in df.columns]]


def _prep_trends(df: pd.DataFrame) -> pd.DataFrame:
    keep = [
        "station_id", "metric", "period", "trend_direction",
        "trend_rate", "confidence", "start_timestamp", "end_timestamp",
    ]
    return df[[c for c in keep if c in df.columns]]


def _prep_system_health(df: pd.DataFrame) -> pd.DataFrame:
    keep = [
        "station_id", "timestamp", "sensor_status", "battery_level",
        "connectivity", "last_data_received", "uptime_hours",
    ]
    return df[[c for c in keep if c in df.columns]]


def _prep_crop_calendar(df: pd.DataFrame) -> pd.DataFrame:
    keep = [
        "state", "crop", "season", "sow_start", "sow_end",
        "harvest_start", "harvest_end", "variety",
        "water_requirement", "duration_days", "advisory",
    ]
    return df[[c for c in keep if c in df.columns]]


def _prep_government_schemes(df: pd.DataFrame) -> pd.DataFrame:
    keep = [
        "scheme_id", "scheme_name", "scheme_type", "state", "applicable_crops",
        "benefit_description", "eligibility", "status",
        "official_url", "helpline", "email", "contact_address",
    ]
    return df[[c for c in keep if c in df.columns]]


def _prep_mandi_history(df: pd.DataFrame) -> pd.DataFrame:
    keep = [
        "state", "district", "market", "commodity", "variety", "arrival_date",
        "min_price", "max_price", "modal_price", "unit", "year", "month", "week",
    ]
    return df[[c for c in keep if c in df.columns]]


def _prep_msp_history(df: pd.DataFrame) -> pd.DataFrame:
    keep = ["crop", "year", "msp_rs_quintal", "unit", "announced_by", "effective_season"]
    return df[[c for c in keep if c in df.columns]]


def _prep_emergency(df: pd.DataFrame) -> pd.DataFrame:
    keep = [
        "event_type", "event_description", "station_id", "state", "district",
        "resource_type", "quantity", "unit", "priority", "responsible_agency",
        "event_start", "dispatch_time", "status",
        "beneficiary_farmers", "area_covered_ha", "notes",
    ]
    return df[[c for c in keep if c in df.columns]]


# ── Main seeder ───────────────────────────────────────────────────────────────

def seed(csv_dir: Path, skip_weather: bool = False) -> None:
    init_db()
    init_schema()
    engine = _get_engine()
    db = get_session()

    try:
        # ── Step 1: Truncate (same as before, users/weather protected) ────────
        truncate_tables = [
            "emergency_resource_allocation",
            "msp_history",
            "mandi_rates_history",
            "crop_calendar",
            "government_schemes",
            "system_health",
            "trends",
            "alerts",
            "installation_sensors",
        ]
        logger.info("── Truncating non-user tables ──")
        for t in truncate_tables:
            _truncate(db, t)
        db.close()

        # ── Step 2: Bulk insert each table ────────────────────────────────────

        logger.info("── Seeding installations (upsert via temp table) ──")
        df = _read_csv(csv_dir, "installations.csv")
        if df is not None:
            df = _prep_installations(df)
            # installations uses ON CONFLICT — do it via raw upsert
            _upsert_installations(engine, df)
            logger.info("  → %d rows", len(df))

        logger.info("── Seeding installation_sensors ──")
        df = _read_csv(csv_dir, "installation_sensors.csv")
        if df is not None:
            df = _prep_installation_sensors(df)
            n = _bulk_insert(engine, df, "installation_sensors", chunksize=2000)
            logger.info("  → %d rows", n)

        if not skip_weather:
            logger.info("── Seeding weather_data (append, bulk) ──")
            df = _read_csv(csv_dir, "weather_data.csv")
            if df is not None:
                df = _prep_weather(df)
                n = _bulk_insert(engine, df, "weather_data", chunksize=5000)
                logger.info("  → %d rows appended", n)
        else:
            logger.info("── Skipping weather_data (--skip-weather) ──")

        logger.info("── Seeding alerts ──")
        df = _read_csv(csv_dir, "alerts.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_alerts(df), "alerts", chunksize=2000)
            logger.info("  → %d rows", n)

        logger.info("── Seeding user_preferences ──")
        df = _read_csv(csv_dir, "user_preferences.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_user_prefs(df), "user_preferences", chunksize=2000)
            logger.info("  → %d rows", n)

        logger.info("── Seeding trends ──")
        df = _read_csv(csv_dir, "trends.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_trends(df), "trends", chunksize=2000)
            logger.info("  → %d rows", n)

        logger.info("── Seeding system_health ──")
        df = _read_csv(csv_dir, "system_health.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_system_health(df), "system_health", chunksize=2000)
            logger.info("  → %d rows", n)

        logger.info("── Seeding crop_calendar ──")
        df = _read_csv(csv_dir, "crop_calendar.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_crop_calendar(df), "crop_calendar", chunksize=2000)
            logger.info("  → %d rows", n)

        logger.info("── Seeding government_schemes ──")
        df = _read_csv(csv_dir, "government_schemes.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_government_schemes(df), "government_schemes", chunksize=2000)
            logger.info("  → %d rows", n)

        logger.info("── Seeding mandi_rates_history (118k rows — bulk) ──")
        df = _read_csv(csv_dir, "mandi_rates_history.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_mandi_history(df), "mandi_rates_history", chunksize=10000)
            logger.info("  → %d rows", n)

        logger.info("── Seeding msp_history ──")
        df = _read_csv(csv_dir, "msp_history.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_msp_history(df), "msp_history", chunksize=2000)
            logger.info("  → %d rows", n)

        logger.info("── Seeding emergency_resource_allocation ──")
        df = _read_csv(csv_dir, "emergency_resource_allocation.csv")
        if df is not None:
            n = _bulk_insert(engine, _prep_emergency(df), "emergency_resource_allocation", chunksize=2000)
            logger.info("  → %d rows", n)

        logger.info("✅  Seed complete. Users table was NOT modified.")

    except Exception as exc:
        logger.error("Seed failed: %s", exc, exc_info=True)
        raise


def _upsert_installations(engine, df: pd.DataFrame) -> None:
    """
    Installations need ON CONFLICT (station_id) DO UPDATE.
    Strategy: bulk insert to a temp table, then upsert from there.
    """
    with engine.begin() as conn:
        # Write to temp table
        df.to_sql(
            "_tmp_installations",
            con=conn,
            if_exists="replace",
            index=False,
            chunksize=500,
            method="multi",
        )
        # Upsert from temp → real table
        cols = ", ".join(df.columns)
        update_cols = ", ".join(
            f"{c}=EXCLUDED.{c}"
            for c in df.columns
            if c != "station_id"
        )
        conn.execute(text(f"""
            INSERT INTO installations ({cols})
            SELECT {cols} FROM _tmp_installations
            ON CONFLICT (station_id) DO UPDATE SET {update_cols}
        """))
        conn.execute(text("DROP TABLE IF EXISTS _tmp_installations"))


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fast bulk seed for SkyView DB")
    parser.add_argument(
        "--csv-dir",
        default=".",
        help="Directory containing CSV files",
    )
    parser.add_argument(
        "--skip-weather",
        action="store_true",
        help="Skip weather_data seeding",
    )
    args = parser.parse_args()
    seed(Path(args.csv_dir), skip_weather=args.skip_weather)