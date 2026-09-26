"""
Database Seed Script
Loads all CSV data into the database. Users table is NEVER touched.
Hardware data (weather_data) appends — no truncation — to stay in sync
with real incoming sensor rows.

Usage:
    python -m skyview.data.seed [--csv-dir path/to/csvs] [--skip-weather]

CSV directory should contain the files exported by generate_all.py:
  installations.csv, installation_sensors.csv, weather_data.csv,
  alerts.csv, crop_calendar.csv, government_schemes.csv,
  mandi_rates_history.csv, msp_history.csv, system_health.csv,
  trends.csv, user_preferences.csv, emergency_resource_allocation.csv
"""

import argparse
import io
import logging
import os
import sys
from pathlib import Path
from typing import Callable, Optional

import pandas as pd
from sqlalchemy import text

from skyview.data.db import get_session, init_db
from skyview.data.schema import init_schema
from skyview.utils.logger import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)

BATCH_SIZE = 500  # rows per INSERT batch


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_csv(csv_dir: Path, filename: str) -> Optional[pd.DataFrame]:
    path = csv_dir / filename
    if not path.exists():
        logger.warning("CSV not found, skipping: %s", path)
        return None
    df = pd.read_csv(path)
    logger.info("  Loaded %s  (%d rows)", filename, len(df))
    return df


def _truncate(db, table: str) -> None:
    """Truncate a table (PostgreSQL CASCADE, SQLite DELETE)."""
    try:
        db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
    except Exception:
        db.execute(text(f"DELETE FROM {table}"))
    db.commit()
    logger.info("  Truncated: %s", table)


def _upsert_df(db, df: pd.DataFrame, insert_fn: Callable, label: str) -> int:
    """Insert dataframe rows in batches; returns inserted count."""
    count = 0
    for i in range(0, len(df), BATCH_SIZE):
        batch = df.iloc[i : i + BATCH_SIZE]
        for _, row in batch.iterrows():
            try:
                insert_fn(db, row)
                count += 1
            except Exception as exc:
                logger.debug("Skip row (%s): %s", label, exc)
    db.commit()
    return count


# ── Per-table insert functions ────────────────────────────────────────────────

def _insert_installation(db, row):
    db.execute(text("""
        INSERT INTO installations
            (station_id, name, description, latitude, longitude,
             location_name, installation_date, status, device_type,
             firmware_version, last_heartbeat, created_at, updated_at)
        VALUES
            (:station_id, :name, :description, :latitude, :longitude,
             :location_name, :installation_date, :status, :device_type,
             :firmware_version, :last_heartbeat, :created_at, :updated_at)
        ON CONFLICT (station_id) DO UPDATE SET
            name=EXCLUDED.name, status=EXCLUDED.status,
            last_heartbeat=EXCLUDED.last_heartbeat,
            updated_at=EXCLUDED.updated_at
    """), {
        "station_id": row.get("station_id"),
        "name": row.get("name"),
        "description": row.get("description"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "location_name": row.get("location_name"),
        "installation_date": row.get("installation_date"),
        "status": row.get("status", "active"),
        "device_type": row.get("device_type"),
        "firmware_version": row.get("firmware_version"),
        "last_heartbeat": _nullable(row.get("last_heartbeat")),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    })


def _insert_sensor(db, row):
    # Resolve installation_id by station if given as int
    inst_id = int(row["installation_id"]) if pd.notna(row.get("installation_id")) else None
    db.execute(text("""
        INSERT INTO installation_sensors
            (installation_id, sensor_type, sensor_name, unit, active)
        VALUES (:iid, :st, :sn, :unit, :active)
    """), {
        "iid": inst_id,
        "st": row.get("sensor_type"),
        "sn": row.get("sensor_name"),
        "unit": row.get("unit"),
        "active": bool(row.get("active", 1)),
    })


def _insert_weather(db, row):
    db.execute(text("""
        INSERT INTO weather_data
            (station_id, timestamp, temperature, humidity, pressure,
             wind_speed, wind_direction, rainfall,
             soil_temperature, soil_moisture,
             pm25, pm10, uv_index, lux,
             battery_voltage, solar_voltage, created_at, updated_at)
        VALUES
            (:station_id, :timestamp, :temperature, :humidity, :pressure,
             :wind_speed, :wind_direction, :rainfall,
             :soil_temperature, :soil_moisture,
             :pm25, :pm10, :uv_index, :lux,
             :battery_voltage, :solar_voltage, :created_at, :updated_at)
    """), {k: _nullable(row.get(k)) for k in [
        "station_id", "timestamp", "temperature", "humidity", "pressure",
        "wind_speed", "wind_direction", "rainfall",
        "soil_temperature", "soil_moisture",
        "pm25", "pm10", "uv_index", "lux",
        "battery_voltage", "solar_voltage", "created_at", "updated_at",
    ]})


def _insert_alert(db, row):
    db.execute(text("""
        INSERT INTO alerts
            (station_id, alert_type, severity, message, value, threshold,
             acknowledged, created_at, acknowledged_at)
        VALUES
            (:station_id, :alert_type, :severity, :message, :value,
             :threshold, :acknowledged, :created_at, :acknowledged_at)
    """), {
        "station_id": row.get("station_id"),
        "alert_type": row.get("alert_type"),
        "severity": row.get("severity"),
        "message": row.get("message"),
        "value": _nullable(row.get("value")),
        "threshold": _nullable(row.get("threshold")),
        "acknowledged": bool(row.get("acknowledged", 0)),
        "created_at": row.get("created_at"),
        "acknowledged_at": _nullable(row.get("acknowledged_at")),
    })


def _insert_user_pref(db, row):
    db.execute(text("""
        INSERT INTO user_preferences (user_id, preferred_unit, verbosity, alert_channel, created_at)
        VALUES (:uid, :unit, :verb, :chan, :ca)
        ON CONFLICT (user_id) DO UPDATE SET
            preferred_unit=EXCLUDED.preferred_unit,
            verbosity=EXCLUDED.verbosity,
            alert_channel=EXCLUDED.alert_channel
    """), {
        "uid": str(row.get("user_id")),
        "unit": row.get("preferred_unit", "C"),
        "verb": row.get("verbosity", "short"),
        "chan": row.get("alert_channel", "whatsapp"),
        "ca": row.get("created_at"),
    })


def _insert_trend(db, row):
    db.execute(text("""
        INSERT INTO trends
            (station_id, metric, period, trend_direction, trend_rate,
             confidence, start_timestamp, end_timestamp)
        VALUES
            (:station_id, :metric, :period, :trend_direction, :trend_rate,
             :confidence, :start_timestamp, :end_timestamp)
    """), {k: _nullable(row.get(k)) for k in [
        "station_id", "metric", "period", "trend_direction",
        "trend_rate", "confidence", "start_timestamp", "end_timestamp",
    ]})


def _insert_sys_health(db, row):
    db.execute(text("""
        INSERT INTO system_health
            (station_id, timestamp, sensor_status, battery_level,
             connectivity, last_data_received, uptime_hours)
        VALUES
            (:station_id, :timestamp, :sensor_status, :battery_level,
             :connectivity, :last_data_received, :uptime_hours)
    """), {k: _nullable(row.get(k)) for k in [
        "station_id", "timestamp", "sensor_status", "battery_level",
        "connectivity", "last_data_received", "uptime_hours",
    ]})


def _insert_crop(db, row):
    db.execute(text("""
        INSERT INTO crop_calendar
            (state, crop, season, sow_start, sow_end,
             harvest_start, harvest_end, variety,
             water_requirement, duration_days, advisory)
        VALUES
            (:state, :crop, :season, :sow_start, :sow_end,
             :harvest_start, :harvest_end, :variety,
             :water_requirement, :duration_days, :advisory)
    """), {k: _nullable(row.get(k)) for k in [
        "state", "crop", "season", "sow_start", "sow_end",
        "harvest_start", "harvest_end", "variety",
        "water_requirement", "duration_days", "advisory",
    ]})


def _insert_scheme(db, row):
    db.execute(text("""
        INSERT INTO government_schemes
            (scheme_id, scheme_name, scheme_type, state, applicable_crops,
             benefit_description, eligibility, status,
             official_url, helpline, email, contact_address)
        VALUES
            (:scheme_id, :scheme_name, :scheme_type, :state, :applicable_crops,
             :benefit_description, :eligibility, :status,
             :official_url, :helpline, :email, :contact_address)
        ON CONFLICT (scheme_id) DO UPDATE SET
            scheme_name=EXCLUDED.scheme_name,
            status=EXCLUDED.status
    """), {k: _nullable(row.get(k)) for k in [
        "scheme_id", "scheme_name", "scheme_type", "state", "applicable_crops",
        "benefit_description", "eligibility", "status",
        "official_url", "helpline", "email", "contact_address",
    ]})


def _insert_mandi_history(db, row):
    db.execute(text("""
        INSERT INTO mandi_rates_history
            (state, district, market, commodity, variety, arrival_date,
             min_price, max_price, modal_price, unit, year, month, week)
        VALUES
            (:state, :district, :market, :commodity, :variety, :arrival_date,
             :min_price, :max_price, :modal_price, :unit, :year, :month, :week)
    """), {k: _nullable(row.get(k)) for k in [
        "state", "district", "market", "commodity", "variety", "arrival_date",
        "min_price", "max_price", "modal_price", "unit", "year", "month", "week",
    ]})


def _insert_msp(db, row):
    db.execute(text("""
        INSERT INTO msp_history
            (crop, year, msp_rs_quintal, unit, announced_by, effective_season)
        VALUES
            (:crop, :year, :msp_rs_quintal, :unit, :announced_by, :effective_season)
    """), {k: _nullable(row.get(k)) for k in [
        "crop", "year", "msp_rs_quintal", "unit", "announced_by", "effective_season",
    ]})


def _insert_emergency(db, row):
    db.execute(text("""
        INSERT INTO emergency_resource_allocation
            (event_type, event_description, station_id, state, district,
             resource_type, quantity, unit, priority, responsible_agency,
             event_start, dispatch_time, status,
             beneficiary_farmers, area_covered_ha, notes)
        VALUES
            (:event_type, :event_description, :station_id, :state, :district,
             :resource_type, :quantity, :unit, :priority, :responsible_agency,
             :event_start, :dispatch_time, :status,
             :beneficiary_farmers, :area_covered_ha, :notes)
    """), {k: _nullable(row.get(k)) for k in [
        "event_type", "event_description", "station_id", "state", "district",
        "resource_type", "quantity", "unit", "priority", "responsible_agency",
        "event_start", "dispatch_time", "status",
        "beneficiary_farmers", "area_covered_ha", "notes",
    ]})


def _nullable(val):
    """Convert pandas NaN/NaT to None."""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    return val


# ── Main seeder ───────────────────────────────────────────────────────────────

def seed(csv_dir: Path, skip_weather: bool = False) -> None:
    init_db()
    init_schema()
    db = get_session()

    try:
        # Tables that are fully replaced (NOT users, NOT weather_data)
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

        # Installations: upsert (preserve IDs for FK refs)
        logger.info("── Seeding installations ──")
        df = _read_csv(csv_dir, "installations.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_installation, "installations")
            logger.info("  → %d rows", n)

        # Installation sensors (depends on installations)
        logger.info("── Seeding installation_sensors ──")
        df = _read_csv(csv_dir, "installation_sensors.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_sensor, "installation_sensors")
            logger.info("  → %d rows", n)

        # Weather data — APPEND ONLY (hardware adds rows live)
        if not skip_weather:
            logger.info("── Seeding weather_data (append) ──")
            df = _read_csv(csv_dir, "weather_data.csv")
            if df is not None:
                n = _upsert_df(db, df, _insert_weather, "weather_data")
                logger.info("  → %d rows appended", n)
        else:
            logger.info("── Skipping weather_data (--skip-weather) ──")

        # Alerts
        logger.info("── Seeding alerts ──")
        df = _read_csv(csv_dir, "alerts.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_alert, "alerts")
            logger.info("  → %d rows", n)

        # User preferences (only NEW users — skip existing user_id)
        logger.info("── Seeding user_preferences (upsert) ──")
        df = _read_csv(csv_dir, "user_preferences.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_user_pref, "user_preferences")
            logger.info("  → %d rows", n)

        # Trends
        logger.info("── Seeding trends ──")
        df = _read_csv(csv_dir, "trends.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_trend, "trends")
            logger.info("  → %d rows", n)

        # System health
        logger.info("── Seeding system_health ──")
        df = _read_csv(csv_dir, "system_health.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_sys_health, "system_health")
            logger.info("  → %d rows", n)

        # Crop calendar
        logger.info("── Seeding crop_calendar ──")
        df = _read_csv(csv_dir, "crop_calendar.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_crop, "crop_calendar")
            logger.info("  → %d rows", n)

        # Government schemes
        logger.info("── Seeding government_schemes ──")
        df = _read_csv(csv_dir, "government_schemes.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_scheme, "government_schemes")
            logger.info("  → %d rows", n)

        # Mandi rates history (large — batch critical)
        logger.info("── Seeding mandi_rates_history ──")
        df = _read_csv(csv_dir, "mandi_rates_history.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_mandi_history, "mandi_rates_history")
            logger.info("  → %d rows", n)

        # MSP history
        logger.info("── Seeding msp_history ──")
        df = _read_csv(csv_dir, "msp_history.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_msp, "msp_history")
            logger.info("  → %d rows", n)

        # Emergency resource allocation
        logger.info("── Seeding emergency_resource_allocation ──")
        df = _read_csv(csv_dir, "emergency_resource_allocation.csv")
        if df is not None:
            n = _upsert_df(db, df, _insert_emergency, "emergency_resource_allocation")
            logger.info("  → %d rows", n)

        logger.info("✅ Seed complete. Users table was NOT modified.")

    except Exception as exc:
        db.rollback()
        logger.error("Seed failed: %s", exc)
        raise
    finally:
        db.close()


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed SkyView database")
    parser.add_argument(
        "--csv-dir",
        default=".",
        help="Directory containing CSV files (default: current dir)",
    )
    parser.add_argument(
        "--skip-weather",
        action="store_true",
        help="Skip weather_data seeding (keep existing rows)",
    )
    args = parser.parse_args()
    seed(Path(args.csv_dir), skip_weather=args.skip_weather)