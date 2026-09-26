"""
Mandi Rates Agent
Fetches live prices from data.gov.in, caches for 30 min, falls back to mock.
"""

import logging
import random
import time
from datetime import datetime
from typing import List, Optional

import requests

from skyview.utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_CACHE_TTL = 1800  # 30 minutes
_cache: dict = {"data": [], "fetched_at": 0}

_MOCK_COMMODITIES = [
    {"commodity": "Wheat", "variety": "Desi", "base": 2200},
    {"commodity": "Rice", "variety": "Common", "base": 2800},
    {"commodity": "Onion", "variety": "Red", "base": 1500},
    {"commodity": "Tomato", "variety": "Hybrid", "base": 2000},
    {"commodity": "Potato", "variety": "Jyoti", "base": 1200},
    {"commodity": "Soybean", "variety": "Yellow", "base": 4200},
    {"commodity": "Cotton", "variety": "DCH-32", "base": 6500},
    {"commodity": "Maize", "variety": "Yellow", "base": 1800},
    {"commodity": "Chilli (Green)", "variety": "Hybrid", "base": 3000},
    {"commodity": "Banana", "variety": "Robusta", "base": 1600},
]

_STATES = ["Madhya Pradesh", "Rajasthan", "Maharashtra", "Uttar Pradesh",
           "Karnataka", "Gujarat", "Tamil Nadu", "Telangana"]
_MARKETS = ["Indore", "Jaipur", "Nashik", "Lucknow",
            "Hubli", "Ahmedabad", "Coimbatore", "Warangal"]


def _mock_data(state: str = "", commodity: str = "") -> List[dict]:
    today = datetime.now().strftime("%d/%m/%Y")
    results = []
    for c in _MOCK_COMMODITIES:
        if commodity and commodity.lower() not in c["commodity"].lower():
            continue
        st = state or random.choice(_STATES)
        mk = random.choice(_MARKETS)
        modal = c["base"] + random.randint(-200, 300)
        results.append({
            "state": st, "district": mk, "market": mk,
            "commodity": c["commodity"], "variety": c["variety"],
            "arrival_date": today,
            "min_price": str(modal - random.randint(100, 300)),
            "max_price": str(modal + random.randint(100, 400)),
            "modal_price": str(modal),
        })
    return results


def fetch_rates(
    state: str = "",
    commodity: str = "",
    limit: int = 50,
    force_refresh: bool = False,
) -> List[dict]:
    """Fetch mandi rates, using cache where possible."""
    global _cache
    now = time.time()
    cache_valid = (now - _cache["fetched_at"]) < _CACHE_TTL and _cache["data"]

    if cache_valid and not state and not commodity and not force_refresh:
        return _cache["data"]

    if not settings.DATAGOV_API_KEY:
        logger.debug("DATAGOV_API_KEY not set — using mock mandi data")
        data = _mock_data(state, commodity)
    else:
        try:
            resp = requests.get(
                f"https://api.data.gov.in/resource/{settings.MANDI_RESOURCE_ID}",
                params={
                    "api-key": settings.DATAGOV_API_KEY,
                    "format": "json",
                    "limit": limit,
                    **( {"filters[state]": state} if state else {} ),
                    **( {"filters[commodity]": commodity} if commodity else {} ),
                },
                timeout=15,
            )
            resp.raise_for_status()
            raw = resp.json().get("records", [])
            data = [
                {
                    "state": r.get("state") or r.get("State", ""),
                    "district": r.get("district") or r.get("District", ""),
                    "market": r.get("market") or r.get("Market", ""),
                    "commodity": r.get("commodity") or r.get("Commodity", ""),
                    "variety": r.get("variety") or r.get("Variety", ""),
                    "arrival_date": r.get("arrival_date") or r.get("Arrival_Date", ""),
                    "min_price": r.get("min_price") or r.get("Min_Price", "0"),
                    "max_price": r.get("max_price") or r.get("Max_Price", "0"),
                    "modal_price": r.get("modal_price") or r.get("Modal_Price", "0"),
                }
                for r in raw
            ]
        except Exception as exc:
            logger.warning("Mandi API fetch failed: %s — using mock", exc)
            data = _mock_data(state, commodity)

    if not state and not commodity:
        _cache = {"data": data, "fetched_at": now}

    return data


def get_context_string(max_items: int = 10) -> str:
    """Short context string for LLM injection."""
    rates = fetch_rates()
    if not rates:
        return ""
    lines = [
        f"  {r['commodity']} ({r['variety']}): ₹{r['modal_price']}/qtl "
        f"at {r['market']}, {r['state']} ({r['arrival_date']})"
        for r in rates[:max_items]
    ]
    return "Live Mandi Rates:\n" + "\n".join(lines)


KNOWN_COMMODITIES = [
    "wheat", "rice", "onion", "tomato", "potato", "soybean",
    "cotton", "maize", "chilli", "banana", "jowar", "bajra",
    "gram", "tur", "arhar", "mustard", "groundnut", "sugarcane",
    "brinjal", "cabbage", "carrot", "cauliflower", "garlic",
    "ginger", "lemon", "mango", "apple", "moong", "urad",
]


def detect_commodity(message: str) -> Optional[str]:
    msg = message.lower()
    for c in KNOWN_COMMODITIES:
        if c in msg:
            return c.capitalize()
    return None