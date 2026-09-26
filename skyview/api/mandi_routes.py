"""
Mandi Rates Routes
GET /api/mandi/rates
GET /api/mandi/commodities
GET /api/mandi/history
GET /api/mandi/msp
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from sqlalchemy import inspect, text

from skyview.agents.mandi_agent import KNOWN_COMMODITIES, fetch_rates
from skyview.data.db import get_session
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/api/mandi", tags=["Mandi"])
logger = get_logger(__name__)


def _serialize(value: Any) -> Any:
    return value.isoformat() if hasattr(value, "isoformat") else value


def _has_table(db, table_name: str) -> bool:
    inspector = inspect(db.get_bind())
    return table_name in inspector.get_table_names()


@router.get("/rates")
def mandi_rates(state: str = "", commodity: str = "", limit: int = 50):
    """Live mandi rates (30-min cache from data.gov.in)."""
    data = fetch_rates(state=state, commodity=commodity, limit=limit)
    return {
        "status": "success",
        "count": len(data),
        "rates": data,
    }


@router.get("/commodities")
def commodity_list():
    return {"commodities": [c.capitalize() for c in KNOWN_COMMODITIES]}


@router.get("/history")
def mandi_history(
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    market: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    week: Optional[int] = None,
    limit: int = 100,
):
    """Historical mandi rates from the database, with a graceful empty fallback."""
    db = get_session()
    try:
        if not _has_table(db, "mandi_rates_history"):
            return {
                "status": "success",
                "available": False,
                "count": 0,
                "records": [],
                "filters": {
                    "commodity": commodity,
                    "state": state,
                    "market": market,
                    "year": year,
                    "month": month,
                    "week": week,
                },
                "timestamp": datetime.utcnow().isoformat(),
            }

        sql = """
            SELECT state, district, market, commodity, variety, arrival_date,
                   min_price, max_price, modal_price, unit, year, month, week
            FROM mandi_rates_history
            WHERE 1=1
        """
        params: Dict[str, Any] = {"limit": limit}
        if commodity:
            sql += " AND LOWER(COALESCE(commodity, '')) = LOWER(:commodity)"
            params["commodity"] = commodity
        if state:
            sql += " AND LOWER(COALESCE(state, '')) = LOWER(:state)"
            params["state"] = state
        if market:
            sql += " AND LOWER(COALESCE(market, '')) = LOWER(:market)"
            params["market"] = market
        if year:
            sql += " AND year = :year"
            params["year"] = year
        if month:
            sql += " AND month = :month"
            params["month"] = month
        if week:
            sql += " AND week = :week"
            params["week"] = week
        sql += " ORDER BY arrival_date DESC LIMIT :limit"

        rows = db.execute(text(sql), params).fetchall()
        keys = [
            "state",
            "district",
            "market",
            "commodity",
            "variety",
            "arrival_date",
            "min_price",
            "max_price",
            "modal_price",
            "unit",
            "year",
            "month",
            "week",
        ]
        records: List[Dict[str, Any]] = []
        for row in rows:
            record = {}
            for index, key in enumerate(keys):
                record[key] = _serialize(row[index])
            records.append(record)

        return {
            "status": "success",
            "available": True,
            "count": len(records),
            "records": records,
            "filters": {
                "commodity": commodity,
                "state": state,
                "market": market,
                "year": year,
                "month": month,
                "week": week,
            },
            "timestamp": datetime.utcnow().isoformat(),
        }
    finally:
        db.close()


@router.get("/msp")
def msp_history(crop: Optional[str] = None, limit: int = 50):
    """Minimum Support Price history with a graceful empty fallback."""
    db = get_session()
    try:
        if not _has_table(db, "msp_history"):
            return {
                "status": "success",
                "available": False,
                "count": 0,
                "records": [],
                "filters": {"crop": crop},
                "timestamp": datetime.utcnow().isoformat(),
            }

        sql = "SELECT crop, year, msp_rs_quintal, unit, announced_by, effective_season FROM msp_history WHERE 1=1"
        params: Dict[str, Any] = {"limit": limit}
        if crop:
            sql += " AND LOWER(COALESCE(crop, '')) = LOWER(:crop)"
            params["crop"] = crop
        sql += " ORDER BY year DESC LIMIT :limit"

        rows = db.execute(text(sql), params).fetchall()
        keys = ["crop", "year", "msp_rs_quintal", "unit", "announced_by", "effective_season"]
        records: List[Dict[str, Any]] = []
        for row in rows:
            record = {}
            for index, key in enumerate(keys):
                record[key] = _serialize(row[index])
            records.append(record)

        return {
            "status": "success",
            "available": True,
            "count": len(records),
            "records": records,
            "filters": {"crop": crop},
            "timestamp": datetime.utcnow().isoformat(),
        }
    finally:
        db.close()
