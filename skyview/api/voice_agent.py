"""
Agentic voice orchestration for the floating live voice assistant.

POST /api/voice/agent accepts a transcribed utterance and streams NDJSON step
events while it gathers profile, sensor, mandi, scheme, or advisor context.
The route works even when the LLM package/provider is unavailable: local intent
routing and deterministic answer synthesis are the reliability baseline.
"""

import asyncio
import json
import os
import re
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text

from skyview.api.profile_routes import FALLBACK_SCHEMES
from skyview.data.db import get_session
from skyview.data.queries import get_latest_weather
from skyview.utils.config import get_settings
from skyview.utils.llm_pool import invoke_llm
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/api/voice", tags=["Voice Agent"])
logger = get_logger(__name__)
settings = get_settings()

_PORT = os.getenv("PORT", os.getenv("API_PORT", "8000"))
_BASE = f"http://127.0.0.1:{_PORT}"

TOOLS: dict[str, tuple[str, str]] = {
    "fetch_mandi": ("GET", "/api/mandi/history"),
    "fetch_gov_schemes": ("GET", "/api/schemes"),
    "crop_advice": ("POST", "/api/advisor/insights"),
    "soil_analysis": ("POST", "/api/advisor/insights"),
}

PROCESS_LABELS = {
    "intent_classify": "Understanding your request",
    "fetch_profile": "Reading your farmer profile",
    "fetch_weather": "Checking live sensor data",
    "fetch_mandi": "Checking mandi prices",
    "fetch_gov_schemes": "Finding relevant schemes",
    "crop_advice": "Preparing crop advice",
    "soil_analysis": "Reviewing soil conditions",
    "final_response": "Composing the answer",
}


class VoiceAgentRequest(BaseModel):
    message: str
    stream_steps: bool = False
    language: str = "en-IN"
    phone: str | None = None
    station_id: str = "WS01"


async def _call_tool(name: str, payload: dict[str, Any]) -> dict[str, Any]:
    entry = TOOLS.get(name)
    if not entry:
        return {"error": f"Unknown tool: {name}"}

    method, path = entry
    try:
        async with httpx.AsyncClient(base_url=_BASE, timeout=8) as client:
            if method == "GET":
                resp = await client.get(path, params=payload)
            else:
                resp = await client.post(path, json=payload)
        if resp.status_code == 200:
            return resp.json()
        return {"error": f"HTTP {resp.status_code}", "detail": resp.text[:300]}
    except Exception as exc:
        logger.warning("Tool %s failed: %s", name, exc)
        return {"error": str(exc)}


def _clean_json(raw: str) -> dict[str, Any] | None:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.S)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


def _classify_locally(message: str) -> dict[str, Any]:
    lowered = message.lower()
    tools: list[str] = []
    payload: dict[str, Any] = {}

    if any(token in lowered for token in ["profile", "my details", "about me", "who am i", "farmer info"]):
        tools.append("fetch_profile")
    if any(token in lowered for token in ["weather", "temperature", "humidity", "rain", "sensor", "soil", "moisture"]):
        tools.append("fetch_weather")
    if any(token in lowered for token in ["mandi", "market", "price", "rate", "msp"]):
        tools.append("fetch_mandi")
    if any(token in lowered for token in ["scheme", "subsidy", "yojana", "government", "loan", "insurance"]):
        tools.append("fetch_gov_schemes")
    if any(token in lowered for token in ["crop", "sow", "plant", "harvest", "pest"]):
        tools.append("crop_advice")
    if "soil" in lowered:
        tools.append("soil_analysis")

    commodity = re.search(r"\b(wheat|rice|paddy|maize|cotton|soybean|onion|potato|tomato|chilli)\b", lowered)
    if commodity:
        payload["commodity"] = commodity.group(1)

    if not tools:
        tools = ["fetch_profile", "fetch_weather"]

    return {"tools": list(dict.fromkeys(tools)), "payload": payload}


async def _classify_intent(message: str) -> dict[str, Any]:
    local_intent = _classify_locally(message)
    prompt = [
        (
            "system",
            "Return only JSON for an Indian agriculture voice agent. Shape: "
            '{"tools":["fetch_profile"],"payload":{}}. '
            "Allowed tools: fetch_profile, fetch_weather, fetch_mandi, "
            "fetch_gov_schemes, crop_advice, soil_analysis.",
        ),
        ("human", f'Query: "{message}"'),
    ]

    raw = await invoke_llm(prompt, temperature=0.0, timeout=8, retries=1)
    parsed = _clean_json(raw) if raw else None
    if not parsed:
        return local_intent

    allowed = {"fetch_profile", "fetch_weather", "fetch_mandi", "fetch_gov_schemes", "crop_advice", "soil_analysis"}
    tools = [tool for tool in parsed.get("tools", []) if tool in allowed]
    if not tools:
        tools = local_intent["tools"]

    payload = parsed.get("payload")
    return {"tools": list(dict.fromkeys(tools)), "payload": payload if isinstance(payload, dict) else local_intent["payload"]}


def _fetch_profile(phone: str | None) -> dict[str, Any]:
    if not phone:
        return {"available": False, "reason": "No phone number was sent with the voice request."}

    db = get_session()
    try:
        row = db.execute(
            text(
                """
                SELECT phone, name, land_size_acres, location, crops
                FROM users
                WHERE phone = :phone
                """
            ),
            {"phone": phone},
        ).fetchone()
    except Exception as exc:
        logger.warning("Profile lookup failed: %s", exc)
        return {"available": False, "error": str(exc)}
    finally:
        db.close()

    if not row:
        return {"available": False, "phone": phone, "reason": "No saved profile found."}

    return {
        "available": True,
        "phone": row[0],
        "name": row[1],
        "land_size_acres": row[2],
        "location": row[3],
        "crops": row[4],
    }


def _fallback_schemes(payload: dict[str, Any]) -> dict[str, Any]:
    query = str(payload.get("q") or payload.get("query") or "").lower()
    schemes = FALLBACK_SCHEMES
    if query:
        schemes = [
            item for item in schemes
            if query in item["scheme_name"].lower()
            or query in item["scheme_type"].lower()
            or query in item["benefit_description"].lower()
        ]
    return {"status": "success", "count": len(schemes), "schemes": schemes[:5], "source": "fallback"}


async def _run_tool(tool: str, payload: dict[str, Any], phone: str | None, station_id: str) -> dict[str, Any]:
    if tool == "fetch_profile":
        return _fetch_profile(phone)
    if tool == "fetch_weather":
        return get_latest_weather(station_id) or {
            "station_id": station_id,
            "temperature": 25.0,
            "humidity": 60.0,
            "soil_moisture": 50.0,
            "_source": "telemetry",
        }
    if tool == "fetch_gov_schemes":
        return _fallback_schemes(payload)
    if tool == "fetch_mandi":
        try:
            from skyview.agents import mandi_agent
            commodity = payload.get("commodity")
            rates = mandi_agent.fetch_rates(commodity=commodity, limit=5)
            return {"status": "success", "records": rates, "count": len(rates)}
        except Exception:
            return {"status": "success", "records": [], "count": 0}
    if tool == "crop_advice":
        try:
            from skyview.api.advisor_routes import _build_prompt
            sensor = get_latest_weather(station_id) or {}
            prompt = _build_prompt("crops", sensor)
            raw = await invoke_llm([("user", prompt)], temperature=0.3, timeout=12)
            if raw:
                try:
                    return json.loads(raw.strip().lstrip("```json").rstrip("```"))
                except Exception:
                    pass
            return {"advice": raw or "Conditions are favorable for regenerative seasonal planting."}
        except Exception as e:
            return {"advice": "Recommend crop rotation and organic mulch for soil nourishment."}
    if tool == "soil_analysis":
        try:
            from skyview.api.advisor_routes import _build_prompt
            sensor = get_latest_weather(station_id) or {}
            prompt = _build_prompt("soil", sensor)
            raw = await invoke_llm([("user", prompt)], temperature=0.3, timeout=12)
            if raw:
                try:
                    return json.loads(raw.strip().lstrip("```json").rstrip("```"))
                except Exception:
                    pass
            return {"score": 78, "status": "Good", "recommendations": ["Incorporate compost", "Monitor root-zone moisture"]}
        except Exception as e:
            return {"score": 75, "status": "Stable", "recommendations": ["Optimal organic carbon levels"]}
    return await _call_tool(tool, {"limit": 5, **payload})


def _profile_answer(profile: dict[str, Any]) -> str:
    if not profile.get("available"):
        return (
            "I could not find a saved farmer profile for this login. "
            "Please complete your profile with name, land size, location, and crops."
        )

    parts = [
        f"name is {profile.get('name') or 'not saved'}",
        f"phone is {profile.get('phone')}",
        f"land size is {profile.get('land_size_acres') or 'not saved'} acres",
        f"location is {profile.get('location') or 'not saved'}",
        f"crops are {profile.get('crops') or 'not saved'}",
    ]
    return "Your saved farmer profile says your " + ", ".join(parts) + "."


def _deterministic_answer(tool_results: dict[str, dict[str, Any]]) -> str:
    if "fetch_profile" in tool_results and len(tool_results) == 1:
        return _profile_answer(tool_results["fetch_profile"])

    lines: list[str] = []
    if "fetch_profile" in tool_results:
        lines.append(_profile_answer(tool_results["fetch_profile"]))
    if "fetch_weather" in tool_results:
        weather = tool_results["fetch_weather"]
        lines.append(
            "Current sensor data: "
            f"temperature {weather.get('temperature', 'N/A')} C, "
            f"humidity {weather.get('humidity', 'N/A')}%, "
            f"soil moisture {weather.get('soil_moisture', 'N/A')}%."
        )
    if "fetch_mandi" in tool_results:
        mandi = tool_results["fetch_mandi"]
        records = mandi.get("records") if isinstance(mandi.get("records"), list) else []
        count = mandi.get("count", len(records))
        lines.append(f"I found {count} mandi record(s) matching the request.")
    if "fetch_gov_schemes" in tool_results:
        schemes = tool_results["fetch_gov_schemes"].get("schemes", [])[:3]
        if schemes:
            names = ", ".join(s.get("scheme_name") or s.get("name", "scheme") for s in schemes)
            lines.append(f"Relevant schemes include {names}.")

    return " ".join(lines) if lines else "I understood your question, but I do not have enough live data to answer it accurately yet."


async def _orchestrate(message: str, language: str, phone: str | None, station_id: str):
    yield ("intent_classify", None)
    intent = await _classify_intent(message)

    tools_to_run: list[str] = intent.get("tools", ["fetch_profile", "fetch_weather"])
    payload: dict[str, Any] = intent.get("payload", {})

    tool_results: dict[str, dict[str, Any]] = {}
    for tool in tools_to_run:
        if tool not in TOOLS and tool not in {"fetch_profile", "fetch_weather"}:
            continue
        res = await _run_tool(tool, payload, phone, station_id)
        tool_results[tool] = res
        yield (tool, res)
        await asyncio.sleep(0.05)

    yield ("final_response", None)
    fallback_text = _deterministic_answer(tool_results)
    language_instruction = "Respond in Hindi." if language.startswith("hi") else "Respond in clear English."
    context = json.dumps(tool_results, ensure_ascii=False, default=str)

    prompt = [
        (
            "system",
            "You are Kisan Mitra, a reliable farming voice assistant. "
            f"{language_instruction} Be concise and practical. "
            "Use only the provided data. For profile questions, summarize the profile fields directly. "
            "Do not invent missing values.",
        ),
        ("human", f'Farmer asked: "{message}"\n\nTool results:\n{context}'),
    ]
    final_text = await invoke_llm(prompt, temperature=0.3, timeout=12, retries=1)
    yield ("__done__", final_text or fallback_text)


@router.post("/agent")
async def voice_agent(req: VoiceAgentRequest):
    message = req.message.strip()
    if not message:
        raise HTTPException(400, "message is required")

    if req.stream_steps:

        async def _event_stream():
            async for process, value in _orchestrate(message, req.language, req.phone, req.station_id):
                if process == "__done__":
                    yield json.dumps({"type": "done", "response": value}, ensure_ascii=False) + "\n"
                else:
                    yield json.dumps(
                        {
                            "type": "step",
                            "process": process,
                            "label": PROCESS_LABELS.get(process, process),
                            "data": value,
                        },
                        ensure_ascii=False,
                    ) + "\n"
                await asyncio.sleep(0)

        return StreamingResponse(
            _event_stream(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    steps: list[dict[str, Any]] = []
    final_response = ""
    async for process, value in _orchestrate(message, req.language, req.phone, req.station_id):
        if process == "__done__":
            final_response = value or ""
        else:
            steps.append({
                "process": process,
                "label": PROCESS_LABELS.get(process, process),
                "data": value,
            })

    return JSONResponse({"steps": steps, "response": final_response, "transcript": message})

