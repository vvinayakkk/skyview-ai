"""
Marketplace Routes
GET  /api/marketplace/farmers  — get all registered farmers with resources
POST /api/marketplace/match    — run the haversine-based agentic resource matching algorithm
"""

import math
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from skyview.data.db import get_session
from skyview.utils.llm_pool import invoke_llm
from skyview.utils.logger import get_logger
from skyview.agents.mandi_agent import fetch_rates

router = APIRouter(prefix="/api/marketplace", tags=["Marketplace"])
logger = get_logger(__name__)

# Global cache to optimize LLM calls and reduce latency
_llm_cache = {}


class MarketplaceMatchReq(BaseModel):
    phone: Optional[str] = None
    excess_resources: Optional[Union[str, List[str]]] = None
    required_resources: Optional[Union[str, List[str]]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Legacy fields
    crop: Optional[str] = None
    quantity_kg: Optional[float] = None
    location: Optional[str] = None
    preferred_price: Optional[float] = None
    message: Optional[str] = None


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    # Radius of the Earth in km
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def parse_resources(resources_str: Optional[str]) -> List[str]:
    """Parse comma-separated resource string into clean list of items."""
    if not resources_str:
        return []
    return [r.strip().lower() for r in resources_str.split(",") if r.strip()]


@router.get("/farmers")
def get_all_farmers():
    """Retrieve all farmers for interactive map visualizations."""
    db = get_session()
    try:
        rows = db.execute(
            text("""
                SELECT phone, name, land_size_acres, location, crops,
                       latitude, longitude, state, district,
                       excess_resources, required_resources, whatsapp_number
                FROM users
                ORDER BY created_at DESC
            """)
        ).fetchall()
    finally:
        db.close()

    farmers = []
    for r in rows:
        farmers.append({
            "phone": r[0],
            "name": r[1],
            "land_size_acres": r[2],
            "location": r[3],
            "crops": [c.strip() for c in r[4].split(",") if c.strip()] if r[4] else [],
            "latitude": r[5],
            "longitude": r[6],
            "state": r[7],
            "district": r[8],
            "excess_resources": [x.strip() for x in r[9].split(",") if x.strip()] if r[9] else [],
            "required_resources": [req.strip() for req in r[10].split(",") if req.strip()] if r[10] else [],
            "whatsapp_number": r[11],
        })
    return {"status": "success", "farmers": farmers}


@router.post("/match")
async def marketplace_match(req: MarketplaceMatchReq):
    """
    Find matching farmers/resources using a multi-factor allocation scoring algorithm.
    Includes distance estimation and mutual swap matching.
    """
    db = get_session()
    
    # 1. Resolve searching farmer details
    my_phone = req.phone
    my_name = "Guest Farmer"
    my_excess: List[str] = []
    my_required: List[str] = []
    my_lat: Optional[float] = req.latitude
    my_lon: Optional[float] = req.longitude
    my_location = req.location or "India"

    if my_phone:
        try:
            row = db.execute(
                text("""
                    SELECT name, excess_resources, required_resources, latitude, longitude, location
                    FROM users WHERE phone = :p
                """),
                {"p": my_phone}
            ).fetchone()
            if row:
                my_name = row[0]
                my_excess = parse_resources(row[1]) if row[1] else []
                my_required = parse_resources(row[2]) if row[2] else []
                if my_lat is None:
                    my_lat = row[3]
                if my_lon is None:
                    my_lon = row[4]
                my_location = row[5] or my_location
        except Exception as e:
            logger.error("Error fetching match context farmer: %s", e)

    # If parameters override DB
    if req.excess_resources:
        if isinstance(req.excess_resources, list):
            my_excess = [e.lower().strip() for e in req.excess_resources]
        else:
            my_excess = parse_resources(req.excess_resources)
            
    if req.required_resources:
        if isinstance(req.required_resources, list):
            my_required = [r.lower().strip() for r in req.required_resources]
        else:
            my_required = parse_resources(req.required_resources)

    # 2. Fetch all other farmers
    try:
        query = """
            SELECT phone, name, land_size_acres, location, crops,
                   latitude, longitude, state, district,
                   excess_resources, required_resources, whatsapp_number
            FROM users
        """
        if my_phone:
            query += " WHERE phone != :my_phone"
        
        rows = db.execute(text(query), {"my_phone": my_phone} if my_phone else {}).fetchall()
    except Exception as e:
        db.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        db.close()

    matches = []
    
    for r in rows:
        phone = r[0]
        name = r[1]
        land_size = r[2]
        loc = r[3]
        crops = [c.strip() for c in r[4].split(",") if c.strip()] if r[4] else []
        lat = r[5]
        lon = r[6]
        state = r[7]
        district = r[8]
        other_excess_list = [x.strip() for x in r[9].split(",") if x.strip()] if r[9] else []
        other_required_list = [req_item.strip() for req_item in r[10].split(",") if req_item.strip()] if r[10] else []
        whatsapp = r[11] or phone

        other_excess = [x.lower() for x in other_excess_list]
        other_required = [req_item.lower() for req_item in other_required_list]

        # Calculate intersections
        i_provide_they_need = list(set(my_excess).intersection(other_required))
        they_provide_i_need = list(set(other_excess).intersection(my_required))

        if not i_provide_they_need and not they_provide_i_need:
            # No resource connection
            continue

        # Distance calculation
        dist_km = 0.0
        if my_lat is not None and my_lon is not None and lat is not None and lon is not None:
            dist_km = haversine(my_lat, my_lon, lat, lon)

        # Match Type & Scoring
        is_mutual = len(i_provide_they_need) > 0 and len(they_provide_i_need) > 0
        
        # Base points
        score = 0.0
        if is_mutual:
            score += 100.0  # Big bonus for barter potential
            match_type = "mutual"
        elif len(they_provide_i_need) > 0:
            score += 50.0   # Provider match
            match_type = "provider"
        else:
            score += 30.0   # Consumer match
            match_type = "consumer"

        # Item quantity scoring
        score += len(they_provide_i_need) * 20.0
        score += len(i_provide_they_need) * 10.0

        # Distance penalty: subtract 0.5 points per km, max penalty of -40
        dist_penalty = min(dist_km * 0.5, 40.0)
        score -= dist_penalty
        
        # Keep score in positive range [0, 100] for representation
        match_percentage = min(max(int(score), 5), 100)

        matches.append({
            "phone": phone,
            "name": name,
            "land_size_acres": land_size,
            "location": loc,
            "district": district,
            "state": state,
            "latitude": lat,
            "longitude": lon,
            "crops": crops,
            "whatsapp_number": whatsapp,
            "distance_km": round(dist_km, 1),
            "match_type": match_type,
            "match_percentage": match_percentage,
            "what_they_have": other_excess_list,
            "what_they_need": other_required_list,
            "i_provide_they_need": i_provide_they_need,
            "they_provide_i_need": they_provide_i_need,
        })

    # Sort matches by percentage descending, then by distance ascending
    matches.sort(key=lambda x: (-x["match_percentage"], x["distance_km"]))

    # 3. Request AI overview commentary
    context_matches = []
    for m in matches[:3]:
        context_matches.append(
            f"Farmer {m['name']} in {m['location']} ({m['distance_km']} km away) is a {m['match_type'].upper()} MATCH. "
            f"Mutual trade items: {m['they_provide_i_need']} <-> {m['i_provide_they_need']}."
        )
    
    advisory_insights = "No matches available yet. Complete your profile to get suggestions."
    if matches:
        prompt = (
            f"You are the SkyView Agentic Matchmaker. A farmer named {my_name} is listing:\n"
            f"- Excess Resources: {my_excess}\n"
            f"- Required Resources: {my_required}\n"
            f"- Location: {my_location}\n\n"
            f"Top Matches in DB:\n" + "\n".join(context_matches) + "\n\n"
            "Provide 3 brief tips (each 1 sentence max) on how these farmers can co-operatively share resources, "
            "recommend which match is best based on location/barter, and suggest a transaction format. "
            "Write as a friendly agricultural cooperative advisor. Do not use markdown headings."
        )
        try:
            advisory_insights = await invoke_llm([("user", prompt)], temperature=0.3, timeout=12)
        except Exception as e:
            advisory_insights = "Match analysis completed. Reach out to local mutual partners on WhatsApp."

    return {
        "status": "success",
        "search_context": {
            "name": my_name,
            "excess": my_excess,
            "required": my_required,
            "latitude": my_lat,
            "longitude": my_lon,
            "location": my_location
        },
        "matches": matches,
        "ai_advisory": advisory_insights,
    }


class CircularBarterReq(BaseModel):
    phone: Optional[str] = None
    max_distance_km: float = 1000.0


@router.post("/circular-barter")
async def circular_barter(req: CircularBarterReq):
    """
    Find 3-party cooperative loops (A -> B -> C -> A) where resources flow circularly.
    Returns detected loops, total distance, and AI generated sharing schedules.
    """
    db = get_session()
    try:
        rows = db.execute(
            text("""
                SELECT phone, name, land_size_acres, location, crops,
                       latitude, longitude, state, district,
                       excess_resources, required_resources, whatsapp_number
                FROM users
            """)
        ).fetchall()
    finally:
        db.close()

    farmers = []
    for r in rows:
        farmers.append({
            "phone": r[0],
            "name": r[1],
            "land_size_acres": r[2],
            "location": r[3],
            "crops": [c.strip() for c in r[4].split(",") if c.strip()] if r[4] else [],
            "latitude": r[5],
            "longitude": r[6],
            "state": r[7],
            "district": r[8],
            "excess": parse_resources(r[9]),
            "required": parse_resources(r[10]),
            "excess_raw": [x.strip() for x in r[9].split(",") if x.strip()] if r[9] else [],
            "required_raw": [req_item.strip() for req_item in r[10].split(",") if req_item.strip()] if r[10] else [],
            "whatsapp_number": r[11] or r[0]
        })

    loops = []
    n = len(farmers)
    # Search for triplets (A, B, C)
    for i in range(n):
        for j in range(n):
            if i == j: continue
            for k in range(n):
                if k == i or k == j: continue
                
                A = farmers[i]
                B = farmers[j]
                C = farmers[k]

                # Check if A provides to B: A.excess has something B.required wants
                A_to_B = list(set(A["excess"]).intersection(B["required"]))
                # Check if B provides to C: B.excess has something C.required wants
                B_to_C = list(set(B["excess"]).intersection(C["required"]))
                # Check if C provides to A: C.excess has something A.required wants
                C_to_A = list(set(C["excess"]).intersection(A["required"]))

                if A_to_B and B_to_C and C_to_A:
                    # Calculate distances
                    dist_ab = haversine(A["latitude"], A["longitude"], B["latitude"], B["longitude"]) if (A["latitude"] is not None and B["latitude"] is not None) else 0.0
                    dist_bc = haversine(B["latitude"], B["longitude"], C["latitude"], C["longitude"]) if (B["latitude"] is not None and C["latitude"] is not None) else 0.0
                    dist_ca = haversine(C["latitude"], C["longitude"], A["latitude"], A["longitude"]) if (C["latitude"] is not None and A["latitude"] is not None) else 0.0
                    total_dist = dist_ab + dist_bc + dist_ca

                    if total_dist <= req.max_distance_km or req.max_distance_km == 0:
                        # Find raw names for items
                        item_ab = [x for x in A["excess_raw"] if x.lower() in A_to_B][0]
                        item_bc = [x for x in B["excess_raw"] if x.lower() in B_to_C][0]
                        item_ca = [x for x in C["excess_raw"] if x.lower() in C_to_A][0]

                        # De-duplicate loops by keeping lowest sorted phone ID order
                        phones = [A["phone"], B["phone"], C["phone"]]
                        min_phone_idx = phones.index(min(phones))
                        if min_phone_idx == 0:
                            normalized_loop = (A["phone"], B["phone"], C["phone"], item_ab, item_bc, item_ca, dist_ab, dist_bc, dist_ca, total_dist)
                        elif min_phone_idx == 1:
                            normalized_loop = (B["phone"], C["phone"], A["phone"], item_bc, item_ca, item_ab, dist_bc, dist_ca, dist_ab, total_dist)
                        else:
                            normalized_loop = (C["phone"], A["phone"], B["phone"], item_ca, item_ab, item_bc, dist_ca, dist_ab, dist_bc, total_dist)

                        # Match with dict lookup for easier processing
                        if normalized_loop not in loops:
                            loops.append(normalized_loop)

    # 1. Sort the raw loops: prioritize loops containing the searching farmer first, then sort by total distance
    if req.phone:
        loops.sort(key=lambda x: (0 if req.phone in (x[0], x[1], x[2]) else 1, x[9]))
    else:
        loops.sort(key=lambda x: x[9])

    # 2. Limit the loops to top 8 to prevent infinite loops / excessive API calls
    loops = loops[:8]

    # Convert normalized loops back to objects
    result_loops = []
    farmer_by_phone = {f["phone"]: f for f in farmers}
    
    for idx, loop in enumerate(loops):
        phone_a, phone_b, phone_c, item_ab, item_bc, item_ca, d_ab, d_bc, d_ca, tot_d = loop
        A = farmer_by_phone[phone_a]
        B = farmer_by_phone[phone_b]
        C = farmer_by_phone[phone_c]
        
        # Default rotating template schedule if not invoking LLM
        schedule = (
            f"**Rotating Schedule:** **{A['name']}** lends **{item_ab}** to **{B['name']}** (Mon-Tue); "
            f"**{B['name']}** lends **{item_bc}** to **{C['name']}** (Wed-Thu); "
            f"**{C['name']}** lends **{item_ca}** to **{A['name']}** (Fri-Sat)."
        )

        # Only invoke the LLM for the top 3 loops to save rate-limits & minimize latency
        if idx < 3:
            cache_key = f"loop-{phone_a}-{phone_b}-{phone_c}-{item_ab}-{item_bc}-{item_ca}"
            if cache_key in _llm_cache:
                schedule = _llm_cache[cache_key]
            else:
                # Generate sharing schedule prompt
                prompt = (
                    f"You are the SkyView Agentic Deal Broker. Generate a highly structured, practical, and friendly weekly sharing schedule (Mon to Sun) for these 3 farmers in a circular barter:\n"
                    f"- Farmer A: {A['name']} (Location: {A['location']}) gives {item_ab} to {B['name']}\n"
                    f"- Farmer B: {B['name']} (Location: {B['location']}) gives {item_bc} to {C['name']}\n"
                    f"- Farmer C: {C['name']} (Location: {C['location']}) gives {item_ca} to {A['name']}\n\n"
                    f"Write a 3-sentence sharing plan describing who gets what and when. Use markdown formatting with **bold** for key names and tools. Keep it practical and simple."
                )
                try:
                    res_schedule = await invoke_llm([("user", prompt)], temperature=0.3, timeout=8)
                    if res_schedule:
                        schedule = res_schedule.strip()
                        _llm_cache[cache_key] = schedule
                except Exception:
                    pass

        result_loops.append({
            "farmers": [
                {
                    "phone": A["phone"],
                    "name": A["name"],
                    "location": A["location"],
                    "latitude": A["latitude"],
                    "longitude": A["longitude"],
                    "whatsapp": A["whatsapp_number"],
                    "crops": A["crops"],
                    "excess": A["excess_raw"],
                    "required": A["required_raw"]
                },
                {
                    "phone": B["phone"],
                    "name": B["name"],
                    "location": B["location"],
                    "latitude": B["latitude"],
                    "longitude": B["longitude"],
                    "whatsapp": B["whatsapp_number"],
                    "crops": B["crops"],
                    "excess": B["excess_raw"],
                    "required": B["required_raw"]
                },
                {
                    "phone": C["phone"],
                    "name": C["name"],
                    "location": C["location"],
                    "latitude": C["latitude"],
                    "longitude": C["longitude"],
                    "whatsapp": C["whatsapp_number"],
                    "crops": C["crops"],
                    "excess": C["excess_raw"],
                    "required": C["required_raw"]
                }
            ],
            "transfer_flow": [
                {"from": A["name"], "to": B["name"], "item": item_ab, "distance_km": round(d_ab, 1)},
                {"from": B["name"], "to": C["name"], "item": item_bc, "distance_km": round(d_bc, 1)},
                {"from": C["name"], "to": A["name"], "item": item_ca, "distance_km": round(d_ca, 1)}
            ],
            "total_distance_km": round(tot_d, 1),
            "ai_schedule": schedule
        })

    return {
        "status": "success",
        "count": len(result_loops),
        "loops": result_loops
    }


class NegotiateReq(BaseModel):
    farmer_a_phone: str
    farmer_b_phone: str
    item_a: Optional[str] = None
    item_b: Optional[str] = None
    crop: Optional[str] = None


@router.post("/negotiate")
async def negotiate_deal(req: NegotiateReq):
    """
    AI Deal Broker negotiates a deal between two farmers.
    Calculates transport cost, references live Mandi rates, and generates step-by-step negotiation log.
    """
    db = get_session()
    try:
        farmer_a = db.execute(
            text("""
                SELECT phone, name, location, crops, latitude, longitude, state, district
                FROM users WHERE phone = :p
            """),
            {"p": req.farmer_a_phone}
        ).fetchone()

        farmer_b = db.execute(
            text("""
                SELECT phone, name, location, crops, latitude, longitude, state, district
                FROM users WHERE phone = :p
            """),
            {"p": req.farmer_b_phone}
        ).fetchone()
    finally:
        db.close()

    if not farmer_a or not farmer_b:
        raise HTTPException(status_code=404, detail="One or both farmers not found")

    # Calculate distance
    lat1, lon1 = farmer_a[4], farmer_a[5]
    lat2, lon2 = farmer_b[4], farmer_b[5]
    dist_km = 0.0
    if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
        dist_km = haversine(lat1, lon1, lat2, lon2)

    # Resolve crop
    crop = req.crop
    if not crop:
        # Pick first crop from farmer_a or farmer_b
        crops_a = [c.strip() for c in farmer_a[3].split(",") if c.strip()] if farmer_a[3] else []
        crops_b = [c.strip() for c in farmer_b[3].split(",") if c.strip()] if farmer_b[3] else []
        if crops_a:
            crop = crops_a[0]
        elif crops_b:
            crop = crops_b[0]
        else:
            crop = "Wheat"

    # Fetch live mandi rates
    mandi_price = 2100.0  # default wheat price per quintal
    mandi_unit = "Quintal"
    state = farmer_a[6] or "Maharashtra"
    try:
        rates = fetch_rates(state=state, commodity=crop, limit=5)
        if rates:
            mandi_price = float(rates[0].get("modal_price", 2100.0))
            mandi_unit = rates[0].get("unit", "Quintal")
    except Exception as e:
        logger.warning("Error fetching mandi rates for negotiation: %s", e)

    # Estimate transport cost: ₹15/km for machinery transport
    transport_cost = round(dist_km * 15.0, 2)

    # Cache check to avoid redundant LLM queries
    cache_key = f"neg-{req.farmer_a_phone}-{req.farmer_b_phone}-{req.item_a}-{req.item_b}-{crop}"
    if cache_key in _llm_cache:
        return {
            "status": "success",
            "negotiation": _llm_cache[cache_key]
        }

    prompt = (
        f"You are the SkyView AI Deal Broker negotiating a sharing/barter agreement.\n"
        f"Farmer A: {farmer_a[1]} (Location: {farmer_a[2]})\n"
        f"Farmer B: {farmer_b[1]} (Location: {farmer_b[2]})\n"
        f"Distance between them: {dist_km:.1f} km\n"
        f"Transport Cost Est (machinery dispatch at ₹15/km): ₹{transport_cost:.2f}\n"
        f"Live Mandi Reference: Crop '{crop}' is trading at ₹{mandi_price:.2f} per {mandi_unit} in their state.\n"
        f"Item A (from Farmer A): {req.item_a or 'Tractor'}\n"
        f"Item B (from Farmer B): {req.item_b or 'Harvester'}\n\n"
        f"Negotiate a fair cooperative sharing deal. Calculate a reasonable 'Offset Payment' (if any) to balance the trade. "
        f"Provide the output as a JSON object ONLY, with NO extra text, inside a markdown code block. Format:\n"
        f"```json\n"
        f"{{\n"
        f"  \"logs\": [\n"
        f"    {{\"speaker\": \"Deal Broker\", \"text\": \"...\"}},\n"
        f"    {{\"speaker\": \"{farmer_a[1]}\", \"text\": \"...\"}},\n"
        f"    {{\"speaker\": \"{farmer_b[1]}\", \"text\": \"...\"}},\n"
        f"    {{\"speaker\": \"Deal Broker\", \"text\": \"...\"}}\n"
        f"  ],\n"
        f"  \"details\": {{\n"
        f"    \"distance_km\": {dist_km:.1f},\n"
        f"    \"transport_cost_rs\": {transport_cost},\n"
        f"    \"mandi_rate_reference\": \"{crop}: ₹{mandi_price}/{mandi_unit}\",\n"
        f"    \"suggested_offset_rs\": 500,\n"
        f"    \"offset_payer\": \"{farmer_b[1]}\",\n"
        f"    \"agreement_terms\": \"...\"\n"
        f"  }}\n"
        f"}}\n"
        f"```"
    )

    try:
        raw_resp = await invoke_llm([("user", prompt)], temperature=0.3, timeout=12)
        cleaned = raw_resp.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        import json
        res_data = json.loads(cleaned)
        _llm_cache[cache_key] = res_data
    except Exception as exc:
        logger.error("Error generating negotiation via LLM: %s", exc)
        # Fallback negotiation output if LLM fails
        res_data = {
            "logs": [
                {"speaker": "Deal Broker", "text": f"Greetings! I have calculated the distance of {dist_km:.1f} km between your farms and factored in the live mandi rate of ₹{mandi_price}/{mandi_unit} for {crop}."},
                {"speaker": farmer_a[1], "text": f"I can offer my {req.item_a or 'Tractor'}, but I need to make sure the travel cost of ₹{transport_cost} is covered."},
                {"speaker": farmer_b[1], "text": f"I agree, and in return, I'll share my {req.item_b or 'Harvester'} for 3 days. I think that covers it!"},
                {"speaker": "Deal Broker", "text": "Perfect! We suggest Farmer B pays an offset of ₹500 to Farmer A to balance the transit and equipment value difference."}
            ],
            "details": {
                "distance_km": round(dist_km, 1),
                "transport_cost_rs": transport_cost,
                "mandi_rate_reference": f"{crop}: ₹{mandi_price}/{mandi_unit}",
                "suggested_offset_rs": 500,
                "offset_payer": farmer_b[1],
                "agreement_terms": f"Barter {req.item_a or 'Tractor'} <-> {req.item_b or 'Harvester'} with a ₹500 travel offset payment to cover the {dist_km:.1f} km transit."
            }
        }

    return {
        "status": "success",
        "negotiation": res_data
    }


@router.get("/pooling")
async def geographical_pooling():
    """
    Geographical Pooling Agent: Clusters farmers by state/district,
    summarizes shared equipment pools, and generates AI-driven regional optimization plans.
    """
    db = get_session()
    try:
        rows = db.execute(
            text("""
                SELECT phone, name, location, crops, latitude, longitude, state, district,
                       excess_resources, required_resources, land_size_acres
                FROM users
            """)
        ).fetchall()
    finally:
        db.close()

    farmers = []
    for r in rows:
        farmers.append({
            "phone": r[0],
            "name": r[1],
            "location": r[2],
            "crops": [c.strip() for c in r[3].split(",") if c.strip()] if r[3] else [],
            "latitude": r[4],
            "longitude": r[5],
            "state": r[6] or "Other",
            "district": r[7] or "Other",
            "excess": parse_resources(r[8]),
            "required": parse_resources(r[9]),
            "excess_raw": [x.strip() for x in r[8].split(",") if x.strip()] if r[8] else [],
            "required_raw": [req_item.strip() for req_item in r[9].split(",") if req_item.strip()] if r[9] else [],
            "land_size": r[10] or 0.0
        })

    # Group by state + district
    clusters = {}
    for f in farmers:
        key = f"{f['state']} - {f['district']}"
        if key not in clusters:
            clusters[key] = {
                "state": f["state"],
                "district": f["district"],
                "farmers": [],
                "total_land_acres": 0.0,
                "excess_pool": [],
                "required_pool": []
            }
        clusters[key]["farmers"].append(f)
        clusters[key]["total_land_acres"] += f["land_size"]
        clusters[key]["excess_pool"].extend(f["excess_raw"])
        clusters[key]["required_pool"].extend(f["required_raw"])

    result_clusters = []
    for key, c in clusters.items():
        # Clean pools (unique and clean list)
        excess_set = list(set([x.title() for x in c["excess_pool"]]))
        required_set = list(set([x.title() for x in c["required_pool"]]))

        # Check cache
        cache_key = f"pool-{key}-{len(c['farmers'])}-{c['total_land_acres']:.1f}-{'-'.join(excess_set)}-{'-'.join(required_set)}"
        if cache_key in _llm_cache:
            plan = _llm_cache[cache_key]
        else:
            # Generate optimization plan prompt
            prompt = (
                f"You are the SkyView Regional Resource Optimization Advisor. We have a cluster of farmers in {key}.\n"
                f"- Total land area: {c['total_land_acres']:.1f} acres\n"
                f"- Number of active farmers: {len(c['farmers'])}\n"
                f"- Combined Excess Equipment/Resources: {excess_set}\n"
                f"- Combined Needed Equipment/Resources: {required_set}\n\n"
                f"Generate a 3-step 'Regional Resource Optimization Plan' for this cluster. Focus on how they can share "
                f"to minimize transit waste, save fuel, and satisfy needed resources. "
                f"Keep it extremely concise (each step 1 sentence, list format: 1. ..., 2. ..., 3. ...). Do not use markdown headings."
            )

            plan = (
                f"1. Establish a central pickup point in {c['district']} for {', '.join(excess_set[:2])} to reduce transit costs. "
                f"2. Coordinate crop schedules to ensure the shared {', '.join(excess_set[:1]) or 'equipment'} is rotated smoothly. "
                f"3. Pool local labor resources to meet the harvesting requirements of larger farms."
            )
            try:
                res_plan = await invoke_llm([("user", prompt)], temperature=0.3, timeout=12)
                if res_plan:
                    plan = res_plan.strip()
                    _llm_cache[cache_key] = plan
            except Exception:
                pass

        # Convert plan into an array of steps
        steps = [step.strip() for step in plan.split("\n") if step.strip()]
        # Filter out numbers if any
        clean_steps = []
        for s in steps:
            # strip leading numbers/dots
            cleaned_step = s.lstrip("0123456789. ")
            if cleaned_step:
                clean_steps.append(cleaned_step)

        result_clusters.append({
            "region": key,
            "state": c["state"],
            "district": c["district"],
            "farmer_count": len(c["farmers"]),
            "total_land_acres": round(c["total_land_acres"], 1),
            "excess_pool": excess_set,
            "required_pool": required_set,
            "optimization_plan": clean_steps or [plan],
            "farmers": [
                {
                    "name": f["name"],
                    "location": f["location"],
                    "crops": f["crops"],
                    "excess": f["excess_raw"],
                    "required": f["required_raw"]
                }
                for f in c["farmers"]
            ]
        })

    # Sort clusters by size descending
    result_clusters.sort(key=lambda x: -x["farmer_count"])

    return {
        "status": "success",
        "clusters": result_clusters
    }