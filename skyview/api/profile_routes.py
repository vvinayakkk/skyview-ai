"""
Profile & Schemes Routes
GET  /api/profile                 - fetch farmer profile by phone
POST /api/profile/save            - create/update farmer profile
GET  /api/schemes                 - full government scheme catalog
GET  /api/schemes/recommendations - government scheme recommendations
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import inspect, text

from skyview.data.db import get_session
from skyview.utils.llm_pool import invoke_llm
from skyview.utils.logger import get_logger

router = APIRouter(tags=["Profile"])
logger = get_logger(__name__)

FALLBACK_SCHEMES: List[Dict[str, Any]] = [
    {
        "scheme_id": "pm_kisan",
        "scheme_name": "PM-Kisan Samman Nidhi",
        "scheme_type": "income_support",
        "state": "India",
        "applicable_crops": "All eligible crops",
        "benefit_description": "Direct income support of Rs. 6,000 per year to eligible farmer families.",
        "eligibility": "Landholding farmer family",
        "status": "Active",
        "official_url": "https://pmkisan.gov.in/",
        "helpline": "155261",
        "email": "pmkisan-ict@gov.in",
        "contact_address": "Department of Agriculture & Farmers Welfare, Government of India",
    },
    {
        "scheme_id": "pmfby",
        "scheme_name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "scheme_type": "insurance",
        "state": "India",
        "applicable_crops": "All notified crops",
        "benefit_description": "Crop insurance support against losses caused by weather, pests, and natural calamities.",
        "eligibility": "Insured farmer",
        "status": "Active",
        "official_url": "https://pmfby.gov.in/",
        "helpline": "14447",
        "email": "helpdesk-pmfby@gov.in",
        "contact_address": "Pradhan Mantri Fasal Bima Yojana portal",
    },
    {
        "scheme_id": "soil_health_card",
        "scheme_name": "Soil Health Card Scheme",
        "scheme_type": "soil_management",
        "state": "India",
        "applicable_crops": "All crops",
        "benefit_description": "Helps farmers understand soil nutrient status and optimize fertilizer use.",
        "eligibility": "All farmers",
        "status": "Active",
        "official_url": "https://soilhealth.dac.gov.in/",
        "helpline": "1800-180-1551",
        "email": "support@soilhealth.gov.in",
        "contact_address": "Department of Agriculture & Farmers Welfare, Government of India",
    },
    {
        "scheme_id": "kcc",
        "scheme_name": "Kisan Credit Card (KCC)",
        "scheme_type": "credit",
        "state": "India",
        "applicable_crops": "All crops",
        "benefit_description": "Provides timely institutional credit for cultivation and allied activities.",
        "eligibility": "Eligible farmer, tenant farmer, sharecropper",
        "status": "Active",
        "official_url": "https://www.myscheme.gov.in/schemes/kcc",
        "helpline": "1800-11-0034",
        "email": "support@myscheme.gov.in",
        "contact_address": "MyScheme portal",
    },
    {
        "scheme_id": "pkvy",
        "scheme_name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "scheme_type": "organic_farming",
        "state": "India",
        "applicable_crops": "Organic clusters",
        "benefit_description": "Promotes organic farming through cluster-based support and certification.",
        "eligibility": "Organic farming cluster",
        "status": "Active",
        "official_url": "https://pgsindia-ncof.dac.gov.in/pkvy/",
        "helpline": "1800-180-1551",
        "email": "pkvy-support@gov.in",
        "contact_address": "National Centre of Organic Farming, Government of India",
    },
]


def _serialize(value: Any) -> Any:
    return value.isoformat() if hasattr(value, "isoformat") else value


def _db_has_table(db, table_name: str) -> bool:
    inspector = inspect(db.get_bind())
    return table_name in inspector.get_table_names()


def _catalog_from_db(
    db,
    state: Optional[str] = None,
    status: Optional[str] = None,
    query_text: Optional[str] = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    if not _db_has_table(db, "government_schemes"):
        return []

    sql = """
        SELECT scheme_id, scheme_name, scheme_type, state, applicable_crops,
               benefit_description, eligibility, status,
               official_url, helpline, email, contact_address
        FROM government_schemes
        WHERE 1=1
    """
    params: Dict[str, Any] = {"limit": limit}
    if state:
        sql += " AND LOWER(COALESCE(state, '')) = LOWER(:state)"
        params["state"] = state
    if status:
        sql += " AND LOWER(COALESCE(status, '')) = LOWER(:status)"
        params["status"] = status
    if query_text:
        sql += """
            AND (
                LOWER(COALESCE(scheme_name, '')) LIKE :query
                OR LOWER(COALESCE(scheme_type, '')) LIKE :query
                OR LOWER(COALESCE(applicable_crops, '')) LIKE :query
                OR LOWER(COALESCE(benefit_description, '')) LIKE :query
                OR LOWER(COALESCE(eligibility, '')) LIKE :query
            )
        """
        params["query"] = f"%{query_text.lower()}%"

    sql += " ORDER BY scheme_name LIMIT :limit"
    rows = db.execute(text(sql), params).fetchall()
    records: List[Dict[str, Any]] = []
    for row in rows:
        records.append(
            {
                "scheme_id": row[0],
                "scheme_name": row[1],
                "scheme_type": row[2],
                "state": row[3],
                "applicable_crops": row[4],
                "benefit_description": row[5],
                "eligibility": row[6],
                "status": row[7],
                "official_url": row[8],
                "helpline": row[9],
                "email": row[10],
                "contact_address": row[11],
                "source": "database",
            }
        )
    return records


def _fallback_catalog(
    state: Optional[str] = None,
    status: Optional[str] = None,
    query_text: Optional[str] = None,
) -> List[Dict[str, Any]]:
    records = FALLBACK_SCHEMES
    if state:
        records = [item for item in records if state.lower() in str(item.get("state", "")).lower()]
    if status:
        records = [item for item in records if status.lower() in str(item.get("status", "")).lower()]
    if query_text:
        lowered = query_text.lower()
        records = [
            item
            for item in records
            if lowered in item["scheme_name"].lower()
            or lowered in item["scheme_type"].lower()
            or lowered in item["benefit_description"].lower()
            or lowered in item["eligibility"].lower()
        ]
    return [{**item, "source": "fallback"} for item in records]


@router.get("/api/schemes")
def get_schemes_catalog(
    state: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 200,
):
    """Return the full government scheme catalog with complete metadata."""
    db = get_session()
    try:
        records = _catalog_from_db(db, state=state, status=status, query_text=q, limit=limit)
    finally:
        db.close()

    if not records:
        records = _fallback_catalog(state=state, status=status, query_text=q)

    return {
        "status": "success",
        "count": len(records),
        "schemes": records[:limit],
        "filters": {"state": state, "status": status, "q": q},
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/api/schemes/{scheme_id}")
def get_scheme_detail(scheme_id: str):
    """Return a single scheme record by id."""
    db = get_session()
    try:
        if _db_has_table(db, "government_schemes"):
            row = db.execute(
                text(
                    """
                    SELECT scheme_id, scheme_name, scheme_type, state, applicable_crops,
                           benefit_description, eligibility, status,
                           official_url, helpline, email, contact_address
                    FROM government_schemes
                    WHERE LOWER(COALESCE(scheme_id, '')) = LOWER(:scheme_id)
                    LIMIT 1
                    """
                ),
                {"scheme_id": scheme_id},
            ).fetchone()
            if row:
                return {
                    "status": "success",
                    "scheme": {
                        "scheme_id": row[0],
                        "scheme_name": row[1],
                        "scheme_type": row[2],
                        "state": row[3],
                        "applicable_crops": row[4],
                        "benefit_description": row[5],
                        "eligibility": row[6],
                        "status": row[7],
                        "official_url": row[8],
                        "helpline": row[9],
                        "email": row[10],
                        "contact_address": row[11],
                        "source": "database",
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                }
    finally:
        db.close()

    for item in FALLBACK_SCHEMES:
        if item["scheme_id"].lower() == scheme_id.lower():
            return {
                "status": "success",
                "scheme": {**item, "source": "fallback"},
                "timestamp": datetime.utcnow().isoformat(),
            }

    raise HTTPException(status_code=404, detail="Scheme not found")


# ── Models ────────────────────────────────────────────────────────────────────

class ProfileSaveReq(BaseModel):
    phone: str
    name: Optional[str] = None
    land_size_acres: Optional[float] = None
    location: Optional[str] = None
    crops: Optional[Union[str, List[str]]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    state: Optional[str] = None
    district: Optional[str] = None
    excess_resources: Optional[Union[str, List[str]]] = None
    required_resources: Optional[Union[str, List[str]]] = None
    whatsapp_number: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/api/profile")
def get_profile(phone: str):
    """Fetch farmer profile by phone number."""
    if not phone:
        raise HTTPException(400, "phone query param required")

    db = get_session()
    try:
        row = db.execute(
            text("""
                SELECT phone, name, land_size_acres, location, crops,
                       latitude, longitude, state, district,
                       excess_resources, required_resources, whatsapp_number
                FROM users
                WHERE phone = :p
            """),
            {"p": phone},
        ).fetchone()
    finally:
        db.close()

    if not row:
        return {
            "status": "error",
            "message": "Profile not found"
        }

    return {
        "status": "success",
        "profile": {
            "phone": row[0],
            "name": row[1],
            "land_size_acres": row[2],
            "location": row[3],
            "crops": [c.strip() for c in row[4].split(",") if c.strip()] if row[4] else [],
            "latitude": row[5],
            "longitude": row[6],
            "state": row[7],
            "district": row[8],
            "excess_resources": [r.strip() for r in row[9].split(",") if r.strip()] if row[9] else [],
            "required_resources": [r.strip() for r in row[10].split(",") if r.strip()] if row[10] else [],
            "whatsapp_number": row[11],
        }
    }


@router.post("/api/profile/save")
async def save_profile(req: ProfileSaveReq):
    """Create or update a farmer profile."""
    # Convert lists to comma-separated strings
    crops_str = None
    if req.crops is not None:
        if isinstance(req.crops, list):
            crops_str = ", ".join(str(c) for c in req.crops)
        else:
            crops_str = str(req.crops)

    excess_str = None
    if req.excess_resources is not None:
        if isinstance(req.excess_resources, list):
            excess_str = ", ".join(str(e) for e in req.excess_resources)
        else:
            excess_str = str(req.excess_resources)

    required_str = None
    if req.required_resources is not None:
        if isinstance(req.required_resources, list):
            required_str = ", ".join(str(r) for r in req.required_resources)
        else:
            required_str = str(req.required_resources)

    db = get_session()
    try:
        db.execute(
            text("""
                INSERT INTO users (phone, name, land_size_acres, location, crops,
                                   latitude, longitude, state, district,
                                   excess_resources, required_resources, whatsapp_number)
                VALUES (:phone, :name, :land, :location, :crops,
                        :latitude, :longitude, :state, :district,
                        :excess_resources, :required_resources, :whatsapp_number)
                ON CONFLICT (phone) DO UPDATE SET
                    name               = COALESCE(EXCLUDED.name, users.name),
                    land_size_acres    = COALESCE(EXCLUDED.land_size_acres, users.land_size_acres),
                    location           = COALESCE(EXCLUDED.location, users.location),
                    crops              = COALESCE(EXCLUDED.crops, users.crops),
                    latitude           = COALESCE(EXCLUDED.latitude, users.latitude),
                    longitude          = COALESCE(EXCLUDED.longitude, users.longitude),
                    state              = COALESCE(EXCLUDED.state, users.state),
                    district           = COALESCE(EXCLUDED.district, users.district),
                    excess_resources   = COALESCE(EXCLUDED.excess_resources, users.excess_resources),
                    required_resources = COALESCE(EXCLUDED.required_resources, users.required_resources),
                    whatsapp_number    = COALESCE(EXCLUDED.whatsapp_number, users.whatsapp_number)
            """),
            {
                "phone":              req.phone,
                "name":               req.name,
                "land":               req.land_size_acres,
                "location":           req.location,
                "crops":              crops_str,
                "latitude":           req.latitude,
                "longitude":          req.longitude,
                "state":              req.state,
                "district":           req.district,
                "excess_resources":   excess_str,
                "required_resources": required_str,
                "whatsapp_number":    req.whatsapp_number,
            },
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("Profile save error: %s", exc)
        raise HTTPException(500, str(exc))
    finally:
        db.close()

    return {"status": "success", "phone": req.phone}


@router.get("/api/schemes/recommendations")
async def scheme_recommendations(
    land_size_acres: Optional[float] = None,
    location: Optional[str] = None,
    crops: Optional[str] = None,
):
    """AI-generated government scheme recommendations based on farmer profile."""
    context_parts = []
    if land_size_acres is not None:
        context_parts.append(f"Land size: {land_size_acres} acres")
    if location:
        context_parts.append(f"Location: {location}")
    if crops:
        context_parts.append(f"Crops: {crops}")

    context = ", ".join(context_parts) if context_parts else "General Indian farmer"

    prompt = (
        f"You are an Indian agricultural scheme advisor. Farmer profile: {context}.\n"
        "List 5 relevant government schemes (central or state) this farmer qualifies for. "
        'JSON array only: [{"name":"PM-KISAN","description":"...","benefit":"...","eligibility":"...","link":"..."}]'
    )

    raw = await invoke_llm([("user", prompt)], temperature=0.3, timeout=15)

    schemes = []
    if raw:
        import json
        try:
            cleaned = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            schemes = json.loads(cleaned)
        except Exception:
            schemes = [{"name": "PM-KISAN", "description": raw[:200], "benefit": "N/A", "eligibility": "All farmers", "link": "https://pmkisan.gov.in"}]

    return {"status": "success", "schemes": schemes, "context": context}