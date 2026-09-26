"""
Agricultural Q&A Agent
Processes structured farmer questions with sensor context.
"""

import json
import logging
from typing import Any, Dict, List, Tuple

from skyview.utils.llm_pool import invoke_llm

logger = logging.getLogger(__name__)


async def generate_response(
    question: str,
    sensor_data: Dict[str, Any],
    historical_data: List[Dict] = None,
) -> Tuple[str, List[str]]:
    """
    Generate a farmer-friendly answer with actionable suggestions.

    Returns: (answer_text, list_of_suggestions)
    """
    historical_data = historical_data or []
    sensor_summary = _format_sensor(sensor_data)
    history_summary = _format_history(historical_data)

    prompt = f"""You are KisanAI, an expert agricultural assistant for Indian farmers.
Answer based on the LIVE sensor data below. Be practical and specific.

LIVE SENSOR DATA:
{sensor_summary}

HISTORICAL TREND (last 24h):
{history_summary}

FARMER'S QUESTION: {question}

Reply in this JSON format:
{{"answer": "<concise, actionable answer in 3-4 sentences>",
  "suggestions": ["<tip 1>", "<tip 2>", "<tip 3>"]}}
JSON only, no markdown."""

    raw = await invoke_llm([("user", prompt)], temperature=0.3, timeout=25)
    if not raw:
        return "Unable to generate a response right now.", []

    try:
        cleaned = raw.strip().lstrip("```json").rstrip("```").strip()
        data = json.loads(cleaned)
        return data.get("answer", raw), data.get("suggestions", [])
    except Exception:
        return raw, []


def _format_sensor(sensor: Dict) -> str:
    env = sensor.get("env", {})
    soil = sensor.get("soil", {})
    wind = sensor.get("wind", {})
    return (
        f"- Temperature: {env.get('t', 'N/A')}°C  Humidity: {env.get('h', 'N/A')}%  "
        f"Pressure: {env.get('p', 'N/A')} hPa\n"
        f"- Soil Temp: {soil.get('t', 'N/A')}°C  Soil Moisture: {soil.get('m', 'N/A')}%\n"
        f"- Wind: {wind.get('s', 'N/A')} km/h ({wind.get('d', 'N/A')})  "
        f"Rainfall: {sensor.get('rain', 'N/A')} mm"
    )


def _format_history(history: List[Dict]) -> str:
    if not history:
        return "No recent history available."
    temps = [h.get("temperature") for h in history if h.get("temperature")]
    moistures = [h.get("soil_moisture") for h in history if h.get("soil_moisture")]
    avg_t = sum(temps) / len(temps) if temps else None
    avg_m = sum(moistures) / len(moistures) if moistures else None
    lines = []
    if avg_t:
        lines.append(f"- Avg temp (24h): {avg_t:.1f}°C")
    if avg_m:
        lines.append(f"- Avg soil moisture (24h): {avg_m:.1f}%")
    return "\n".join(lines) or "No trend data."