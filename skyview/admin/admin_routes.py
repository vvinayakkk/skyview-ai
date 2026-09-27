"""
Admin Routes — DB table browser + analytics dashboard
GET  /admin/tables                → list all tables
GET  /admin/tables/{table}        → paginated table data
GET  /admin/analytics/overview    → system-wide KPIs
GET  /admin/analytics/sensors     → per-station stats
GET  /admin/analytics/llm         → LLM pool status
GET  /admin/analytics/mandi       → mandi price trends
"""

from datetime import datetime
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import inspect, text

from skyview.data.db import execute_query, get_session
from skyview.utils.llm_pool import pool_status
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = get_logger(__name__)

# Tables exposed in the admin UI (exclude users for privacy)
EXPOSED_TABLES = [
    "installations", "installation_sensors",
    "weather_data", "alerts", "user_preferences",
    "trends", "system_health",
    "crop_calendar", "government_schemes",
    "mandi_rates_history", "msp_history",
    "emergency_resource_allocation",
]


def _serialize_value(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _get_table_columns(table: str) -> List[Dict[str, Any]]:
    """Return JSON-friendly SQLAlchemy column metadata for the admin UI."""
    db = get_session()
    try:
        inspector = inspect(db.bind)
        if not inspector.has_table(table):
            return []

        pk_columns = set((inspector.get_pk_constraint(table) or {}).get("constrained_columns") or [])
        columns = []
        for col in inspector.get_columns(table):
            columns.append({
                "name": col["name"],
                "type": str(col.get("type") or ""),
                "nullable": bool(col.get("nullable", True)),
                "default": str(col["default"]) if col.get("default") is not None else None,
                "primary_key": col["name"] in pk_columns,
            })
        return columns
    finally:
        db.close()


def _count_rows(table: str) -> int:
    rows = execute_query(f"SELECT COUNT(*) FROM {table}")
    return int(rows[0][0]) if rows else 0


@router.get("/tables")
def list_tables():
    """Return all available admin-browsable tables with row counts."""
    tables = []
    counts = {}
    for tbl in EXPOSED_TABLES:
        columns = _get_table_columns(tbl)
        try:
            row_count = _count_rows(tbl) if columns else 0
        except Exception as exc:
            logger.warning("Could not count admin table %s: %s", tbl, exc)
            row_count = 0
        counts[tbl] = row_count
        tables.append({
            "name": tbl,
            "row_count": row_count,
            "columns": columns,
            "primary_key": [c["name"] for c in columns if c["primary_key"]],
            "sample_columns": [c["name"] for c in columns[:5]],
        })
    return {
        "tables": tables,
        "row_counts": counts,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/tables/{table}")
def browse_table(
    table: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    filter_column: Optional[str] = None,
    filter_value: Optional[str] = None,
    order_by: Optional[str] = None,
    desc: bool = True,
):
    """Paginated table browser with optional sorting."""
    if table not in EXPOSED_TABLES:
        raise HTTPException(403, f"Table '{table}' not in admin scope.")

    offset = (page - 1) * page_size

    columns = _get_table_columns(table)
    column_names = [col["name"] for col in columns]
    if not column_names:
        raise HTTPException(404, f"Table '{table}' not found.")

    # Validate order_by to prevent SQL injection
    if order_by and order_by not in column_names:
        order_by = None

    where_clauses = []
    params: Dict[str, Any] = {"lim": page_size, "off": offset}

    if search:
        searchable = [
            f"LOWER(CAST({col} AS TEXT)) LIKE :search"
            for col in column_names
        ]
        if searchable:
            where_clauses.append("(" + " OR ".join(searchable) + ")")
            params["search"] = f"%{search.lower()}%"

    if filter_column and filter_value and filter_column in column_names:
        where_clauses.append(f"LOWER(CAST({filter_column} AS TEXT)) LIKE :filter_value")
        params["filter_value"] = f"%{filter_value.lower()}%"

    where_clause = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    direction = "DESC" if desc else "ASC"
    order_clause = f"ORDER BY {order_by} {direction}" if order_by else ""

    count_rows = execute_query(
        f"SELECT COUNT(*) FROM {table} {where_clause}",
        {k: v for k, v in params.items() if k not in {"lim", "off"}},
    )
    total = int(count_rows[0][0]) if count_rows else 0

    rows = execute_query(
        f"SELECT * FROM {table} {where_clause} {order_clause} LIMIT :lim OFFSET :off",
        params,
    )

    records = [
        {name: _serialize_value(value) for name, value in zip(column_names, row)}
        for row in (rows or [])
    ]

    return {
        "table": table,
        "columns": columns,
        "records": records,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_rows": total,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        },
        "filters": {
            "search": search,
            "filter_column": filter_column,
            "filter_value": filter_value,
            "order_by": order_by,
            "desc": desc,
        },
    }


@router.get("/analytics/overview")
def analytics_overview():
    """System-wide KPIs."""
    weather_count = (execute_query("SELECT COUNT(*) FROM weather_data") or [[0]])[0][0]
    station_count = (execute_query("SELECT COUNT(*) FROM installations WHERE status='active'") or [[0]])[0][0]
    alert_count = (execute_query("SELECT COUNT(*) FROM alerts WHERE acknowledged = FALSE") or [[0]])[0][0]
    mandi_count = (execute_query("SELECT COUNT(*) FROM mandi_rates_history") or [[0]])[0][0]
    scheme_count = (execute_query("SELECT COUNT(*) FROM government_schemes WHERE status='Active'") or [[0]])[0][0]

    latest_reading = execute_query(
        "SELECT station_id, timestamp, temperature, humidity, soil_moisture "
        "FROM weather_data ORDER BY timestamp DESC LIMIT 1"
    )
    last_seen = {}
    if latest_reading:
        r = latest_reading[0]
        last_seen = {
            "station_id": r[0],
            "timestamp": r[1].isoformat() if hasattr(r[1], "isoformat") else str(r[1]),
            "temperature": r[2], "humidity": r[3], "soil_moisture": r[4],
        }

    return {
        "kpis": {
            "total_sensor_readings": weather_count,
            "active_stations": station_count,
            "unacknowledged_alerts": alert_count,
            "mandi_price_records": mandi_count,
            "active_govt_schemes": scheme_count,
        },
        "latest_reading": last_seen,
        "llm_pool": pool_status(),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/analytics/sensors")
def analytics_sensors():
    """Per-station summary statistics."""
    rows = execute_query("""
        SELECT station_id,
               COUNT(*) as readings,
               ROUND(AVG(temperature)::numeric, 2) as avg_temp,
               ROUND(AVG(humidity)::numeric, 2) as avg_humidity,
               ROUND(AVG(soil_moisture)::numeric, 2) as avg_soil,
               MIN(timestamp) as first_reading,
               MAX(timestamp) as last_reading
        FROM weather_data
        GROUP BY station_id
        ORDER BY readings DESC
    """) or []
    return {
        "stations": [
            {
                "station_id": r[0], "readings": r[1],
                "avg_temperature": float(r[2]) if r[2] else None,
                "avg_humidity": float(r[3]) if r[3] else None,
                "avg_soil_moisture": float(r[4]) if r[4] else None,
                "first_reading": r[5].isoformat() if r[5] and hasattr(r[5], "isoformat") else str(r[5]),
                "last_reading": r[6].isoformat() if r[6] and hasattr(r[6], "isoformat") else str(r[6]),
            }
            for r in rows
        ],
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/analytics/llm")
def analytics_llm():
    """LLM load balancer live stats."""
    return {"llm_pool": pool_status(), "timestamp": datetime.utcnow().isoformat()}


@router.get("/analytics/mandi")
def analytics_mandi(commodity: Optional[str] = None, limit: int = 20):
    """Mandi price trend for top commodities."""
    q = (
        "SELECT commodity, year, ROUND(AVG(modal_price)::numeric,2) as avg_price, "
        "COUNT(*) as records FROM mandi_rates_history"
    )
    params: dict = {"lim": limit}
    if commodity:
        q += " WHERE LOWER(commodity) = LOWER(:commodity)"
        params["commodity"] = commodity
    q += " GROUP BY commodity, year ORDER BY commodity, year DESC LIMIT :lim"
    rows = execute_query(q, params) or []
    return {
        "trends": [
            {"commodity": r[0], "year": r[1], "avg_modal_price": float(r[2]) if r[2] else None, "records": r[3]}
            for r in rows
        ],
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/analytics/alerts")
def analytics_alerts():
    """Alert severity breakdown."""
    rows = execute_query("""
        SELECT severity, COUNT(*) as count
        FROM alerts
        GROUP BY severity
        ORDER BY count DESC
    """) or []
    total = sum(r[1] for r in rows)
    return {
        "breakdown": [{"severity": r[0], "count": r[1]} for r in rows],
        "total": total,
        "timestamp": datetime.utcnow().isoformat(),
    }


# =====================================================================
# Admin Portal & User Profile Management API
# =====================================================================

class AdminLoginReq(BaseModel):
    username: str
    password: str


class UserCreateReq(BaseModel):
    phone: str
    name: Optional[str] = None
    land_size_acres: Optional[float] = None
    location: Optional[str] = None
    crops: Optional[str] = None
    saved_otp: Optional[str] = None


class UserUpdateReq(BaseModel):
    name: Optional[str] = None
    land_size_acres: Optional[float] = None
    location: Optional[str] = None
    crops: Optional[str] = None
    saved_otp: Optional[str] = None


@router.post("/login")
def admin_login(req: AdminLoginReq):
    creds = {
        "admin@skyview.ai": {
            "pass": "SkyView#Admin2026!",
            "name": "Chief Agricultural Administrator",
            "role": "Super Admin"
        },
        "officer@skyview.ai": {
            "pass": "FieldOfficer#2026",
            "name": "Regional Krishi Officer",
            "role": "Field Inspector"
        },
    }
    user = creds.get(req.username.strip().lower())
    if not user or user["pass"] != req.password:
        raise HTTPException(401, "Invalid administrator credentials")

    return {
        "status": "success",
        "token": f"admin_token_{int(time.time())}",
        "user": {
            "email": req.username.strip().lower(),
            "name": user["name"],
            "role": user["role"]
        }
    }


@router.get("/users")
def list_admin_users():
    db = get_session()
    try:
        rows = db.execute(text("""
            SELECT phone, name, land_size_acres, location, crops, saved_otp, created_at
            FROM users
            ORDER BY created_at DESC NULLS LAST
        """)).fetchall()

        users = []
        for r in rows:
            users.append({
                "phone": r[0],
                "name": r[1] or "Anonymous Farmer",
                "land_size_acres": float(r[2]) if r[2] is not None else None,
                "location": r[3] or "India",
                "crops": r[4] or "Unspecified",
                "saved_otp": str(r[5]) if r[5] else None,
                "created_at": r[6].isoformat() if hasattr(r[6], "isoformat") else str(r[6] or "")
            })
        return {"status": "success", "total": len(users), "users": users}
    finally:
        db.close()


@router.post("/users")
def create_admin_user(req: UserCreateReq):
    db = get_session()
    try:
        db.execute(text("""
            INSERT INTO users (phone, name, land_size_acres, location, crops, saved_otp)
            VALUES (:p, :n, :l, :loc, :c, :otp)
            ON CONFLICT (phone) DO UPDATE SET
                name = EXCLUDED.name,
                land_size_acres = EXCLUDED.land_size_acres,
                location = EXCLUDED.location,
                crops = EXCLUDED.crops,
                saved_otp = COALESCE(EXCLUDED.saved_otp, users.saved_otp)
        """), {
            "p": req.phone,
            "n": req.name,
            "l": req.land_size_acres,
            "loc": req.location,
            "c": req.crops,
            "otp": req.saved_otp or "123456"
        })
        db.commit()
        return {"status": "success", "message": "User saved successfully", "phone": req.phone}
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"Error saving user: {exc}")
    finally:
        db.close()


@router.put("/users/{phone}")
def update_admin_user(phone: str, req: UserUpdateReq):
    db = get_session()
    try:
        db.execute(text("""
            UPDATE users SET
                name = COALESCE(:n, name),
                land_size_acres = COALESCE(:l, land_size_acres),
                location = COALESCE(:loc, location),
                crops = COALESCE(:c, crops),
                saved_otp = COALESCE(:otp, saved_otp)
            WHERE phone = :p
        """), {
            "p": phone,
            "n": req.name,
            "l": req.land_size_acres,
            "loc": req.location,
            "c": req.crops,
            "otp": req.saved_otp
        })
        db.commit()
        return {"status": "success", "message": "User updated successfully", "phone": phone}
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"Error updating user: {exc}")
    finally:
        db.close()


@router.delete("/users/{phone}")
def delete_admin_user(phone: str):
    db = get_session()
    try:
        db.execute(text("DELETE FROM users WHERE phone = :p"), {"p": phone})
        db.commit()
        return {"status": "success", "message": f"User {phone} deleted successfully"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"Error deleting user: {exc}")
    finally:
        db.close()

