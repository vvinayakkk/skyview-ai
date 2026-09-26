"""
Agent Orchestrator — Supervisor pattern.
Routes queries to the right specialist agent based on message intent.
Each agent is a pure async function; the supervisor coordinates them.
"""

import json
import logging
from typing import Any, Dict, Optional

from skyview.utils.llm_pool import invoke_llm

logger = logging.getLogger(__name__)

# ── Intent detection ──────────────────────────────────────────────────────────

_INTENT_MAP = {
    "weather": ["weather", "temperature", "humidity", "pressure", "wind", "forecast", "climate"],
    "alert":   ["rain", "precipitation", "storm", "flood", "alert", "warning", "danger", "critical"],
    "farm":    ["soil", "moisture", "irrigation", "water", "plant", "crop", "grow", "farm", "seed", "fertilizer"],
    "trend":   ["trend", "history", "average", "compare", "graph", "chart", "analysis", "weekly", "monthly"],
    "sensor":  ["sensor", "data", "reading", "status", "battery", "voltage", "connectivity"],
    "mandi":   ["mandi", "market", "price", "rate", "sell", "buy", "commodity", "bhav", "wheat", "rice", "onion"],
    "scheme":  ["scheme", "government", "pm kisan", "subsidy", "yojana", "benefit"],
    "report":  ["report", "summary", "overview", "recommend", "advisory"],
}


def detect_intent(message: str) -> str:
    msg = message.lower()
    for intent, keywords in _INTENT_MAP.items():
        if any(kw in msg for kw in keywords):
            return intent
    return "general"


# ── Specialist agents ─────────────────────────────────────────────────────────

async def weather_agent(message: str, sensor_context: str) -> str:
    system = (
        "You are a precision agricultural meteorologist AI. "
        "Answer based strictly on the sensor data provided. "
        "Be concise and farmer-friendly."
    )
    prompt = f"{system}\n\nSensor Context:\n{sensor_context}\n\nFarmer query: {message}"
    return await invoke_llm(
        [("user", prompt)], temperature=0.2, timeout=20
    ) or "Unable to fetch weather analysis."


async def farm_agent(message: str, sensor_context: str) -> str:
    system = (
        "You are an expert agricultural AI advisor for Indian farmers. "
        "Use the live sensor data to give actionable, specific advice. "
        "Mention exact values. Be warm and practical."
    )
    prompt = f"{system}\n\nLive Sensor Data:\n{sensor_context}\n\nQuestion: {message}"
    return await invoke_llm(
        [("user", prompt)], temperature=0.3, timeout=20
    ) or "Unable to generate farm advice."


async def alert_agent(message: str, sensor_context: str) -> str:
    system = (
        "You are a farm safety AI. Assess risk from sensor data. "
        "Be direct. Mention severity: Normal / Warning / Critical. "
        "Give one clear action item."
    )
    prompt = f"{system}\n\nData:\n{sensor_context}\n\nQuery: {message}"
    return await invoke_llm(
        [("user", prompt)], temperature=0.1, timeout=15
    ) or "Unable to assess alerts."


async def mandi_agent(message: str, mandi_context: str) -> str:
    system = (
        "You are an Indian agricultural market price advisor. "
        "Use the provided live mandi rates to answer. "
        "Give specific prices in ₹/quintal."
    )
    prompt = f"{system}\n\nLive Mandi Rates:\n{mandi_context}\n\nQuery: {message}"
    return await invoke_llm(
        [("user", prompt)], temperature=0.2, timeout=20
    ) or "Mandi data unavailable."


async def trend_agent(message: str, sensor_context: str) -> str:
    system = (
        "You are a data analyst for agricultural IoT. "
        "Analyze trends and patterns in the sensor data. "
        "Be precise with numbers and time references."
    )
    prompt = f"{system}\n\nData:\n{sensor_context}\n\nQuery: {message}"
    return await invoke_llm(
        [("user", prompt)], temperature=0.2, timeout=20
    ) or "Trend analysis unavailable."


async def general_agent(message: str, context: str) -> str:
    system = (
        "You are SkyView AI, a helpful agricultural assistant for Indian farmers. "
        "Answer clearly and helpfully. Refer to sensor data when relevant."
    )
    prompt = f"{system}\n\nContext:\n{context}\n\nQuery: {message}"
    return await invoke_llm(
        [("user", prompt)], temperature=0.4, timeout=20
    ) or "I'm unable to respond right now."


# ── Supervisor ────────────────────────────────────────────────────────────────

async def supervisor(
    message: str,
    sensor_context: str = "",
    mandi_context: str = "",
) -> Dict[str, Any]:
    """
    Route the user message to the appropriate specialist agent.
    Returns: {response, agent, intent}
    """
    intent = detect_intent(message)
    combined_context = "\n".join(filter(None, [sensor_context, mandi_context]))

    agent_name = "General Agent"
    try:
        if intent == "weather":
            agent_name = "Weather Agent"
            response = await weather_agent(message, sensor_context)
        elif intent == "farm":
            agent_name = "Farm Agent"
            response = await farm_agent(message, sensor_context)
        elif intent == "alert":
            agent_name = "Alert Agent"
            response = await alert_agent(message, sensor_context)
        elif intent == "mandi":
            agent_name = "Mandi Agent"
            response = await mandi_agent(message, mandi_context or sensor_context)
        elif intent == "trend":
            agent_name = "Trend Agent"
            response = await trend_agent(message, sensor_context)
        else:
            agent_name = "General Agent"
            response = await general_agent(message, combined_context)
    except Exception as exc:
        logger.error("Agent %s error: %s", agent_name, exc)
        response = "Sorry, I encountered an error processing your request."

    return {
        "response": response,
        "agent": agent_name,
        "intent": intent,
        "status": "success",
    }