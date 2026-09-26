"""
Webhook Routes — Twilio WhatsApp + Farm Q&A
POST /webhook/whatsapp
POST /webhook/whatsapp/farm-qa
GET  /webhook/whatsapp
"""

import os
from datetime import datetime

import requests
from fastapi import APIRouter, Request

from skyview.agents import supervisor
from skyview.agents.mandi_agent import detect_commodity, fetch_rates, get_context_string
from skyview.data.queries import get_latest_weather
from skyview.utils.config import get_settings
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/webhook", tags=["Webhooks"])
logger = get_logger(__name__)
settings = get_settings()


def _send_whatsapp(to: str, body: str) -> None:
    sid  = settings.TWILIO_ACCOUNT_SID
    auth = settings.TWILIO_AUTH_TOKEN
    from_num = settings.TWILIO_WHATSAPP_NUMBER
    if not all([sid, auth, from_num]):
        logger.info("Mock WhatsApp → %s: %s", to, body[:60])
        return
    try:
        from twilio.rest import Client
        Client(sid, auth).messages.create(
            from_=f"whatsapp:{from_num}", body=body, to=f"whatsapp:{to}"
        )
    except Exception as exc:
        logger.error("WhatsApp send failed: %s", exc)


def _sensor_context_str() -> str:
    d = get_latest_weather(settings.STATION_ID)
    if not d:
        return ""
    return (
        f"Temp={d.get('temperature')}°C, Humidity={d.get('humidity')}%, "
        f"Soil={d.get('soil_moisture')}%, Rain={d.get('rainfall')}mm"
    )


@router.get("/whatsapp")
def whatsapp_get():
    return {"status": "webhook endpoint active"}


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request):
    form = await request.form()
    from_num = form.get("From", "").replace("whatsapp:", "")
    body = form.get("Body", "").strip()
    if not body or not from_num:
        return {"status": "ignored"}
    if from_num == settings.TWILIO_WHATSAPP_NUMBER:
        return {"status": "outgoing"}

    sensor_ctx = _sensor_context_str()
    commodity = detect_commodity(body)
    if commodity:
        rates = fetch_rates(commodity=commodity, limit=8)
        mandi_ctx = "\n".join(
            f"{r['commodity']}: ₹{r['modal_price']}/qtl at {r['market']}"
            for r in rates[:5]
        )
    else:
        mandi_ctx = get_context_string(5)

    result = await supervisor.supervisor(
        message=body, sensor_context=sensor_ctx, mandi_context=mandi_ctx
    )
    response_text = result.get("response", "Sorry, I couldn't process your request.")
    if len(response_text) > 1500:
        response_text = response_text[:1497] + "…"

    _send_whatsapp(from_num, response_text)
    return {"status": "processed"}


@router.post("/whatsapp/farm-qa")
async def farm_qa_webhook(request: Request):
    form = await request.form()
    from_num = form.get("From", "").replace("whatsapp:", "")
    body = form.get("Body", "").strip()
    if not body:
        return {"status": "ignored"}

    from skyview.agents.agricultural_qa import generate_response
    from skyview.data.queries import get_latest_weather, get_weather_history

    latest = get_latest_weather(settings.STATION_ID)
    history = get_weather_history(settings.STATION_ID, hours=24, limit=24)
    sensor_data = {}
    if latest:
        sensor_data = {
            "env": {"t": latest.get("temperature"), "h": latest.get("humidity"), "p": latest.get("pressure")},
            "soil": {"t": latest.get("soil_temperature"), "m": latest.get("soil_moisture")},
            "wind": {"s": latest.get("wind_speed"), "d": latest.get("wind_direction")},
            "rain": latest.get("rainfall"),
        }

    answer, suggestions = await generate_response(body, sensor_data, history)
    response_text = answer.strip()
    if suggestions:
        response_text += "\n\nTips:\n" + "\n".join(f"• {s}" for s in suggestions[:3])
    if len(response_text) > 1500:
        response_text = response_text[:1497] + "…"

    _send_whatsapp(from_num, response_text)
    return {"status": "processed"}