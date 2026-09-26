"""
SkyView Autonomous Decision Engine & Intent Router
Inspired by TypeSafe AI "Jev" on Vercel AI Gateway (System-One Typed Decision Architecture).
Provides sub-100ms structured classification and workflow routing for agricultural queries.
"""

import logging
import os
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class RouteDecision(BaseModel):
    category: str = Field(description="Target specialized agent category")
    confidence: float = Field(description="Decision confidence score (0-100)")
    requires_vision: bool = Field(default=False, description="Flag indicating if multimodal image analysis is required")
    requires_audio: bool = Field(default=False, description="Flag indicating if speech synthesis is required")
    target_route: str = Field(description="Recommended frontend/backend route")
    latency_ms: float = Field(description="Evaluation time in milliseconds")


INTENT_KEYWORDS: Dict[str, List[str]] = {
    "crop_doctor": [
        "disease", "pest", "leaf", "blight", "rust", "fungus", "spot", "yellowing",
        "wilt", "rot", "infection", "spray", "pesticide", "fungicide", "necrotic",
        "कीड़ा", "रोग", "झुलसा", "रतुआ", "धब्बा", "फफूंद"
    ],
    "mandi_rates": [
        "mandi", "price", "rate", "bhav", "market price", "wholesale", "apmc",
        "msp", "भाव", "मंडी", "दाम", "कीमत"
    ],
    "marketplace": [
        "tractor", "harvester", "pump", "rent", "equipment", "barter", "share",
        "excess", "hire", "किराया", "ट्रैक्टर", "साझा"
    ],
    "gov_schemes": [
        "scheme", "subsidy", "pm-kisan", "pmfby", "kcc", "loan", "yojana", "grant",
        "योजना", "सब्सिडी", "ऋण", "मुआवजा"
    ],
    "fpga_diagnostics": [
        "fpga", "accelerator", "hardware", "latency", "hls", "zc706", "xilinx",
        "neural core", "telemetry"
    ],
    "weather_advisory": [
        "weather", "rain", "temperature", "humidity", "monsoon", "frost", "irrigation",
        "मौसम", "बारिश", "तापमान", "सिंचाई"
    ]
}


def evaluate_intent(prompt: str, has_image: bool = False) -> RouteDecision:
    """
    Sub-millisecond System-One decision classification.
    Simulates typed decision inference (Jev architecture) with zero network overhead.
    """
    start_time = time.perf_counter()
    text = prompt.lower().strip()

    if has_image:
        elapsed = (time.perf_counter() - start_time) * 1000
        return RouteDecision(
            category="Crop Pathology Diagnostics",
            confidence=98.5,
            requires_vision=True,
            requires_audio=False,
            target_route="/crop-doctor",
            latency_ms=round(elapsed, 2)
        )

    # Keyword match scoring
    best_category = "General Farm Intelligence"
    best_score = 0
    target_route = "/advisor"

    for intent, words in INTENT_KEYWORDS.items():
        score = sum(1 for word in words if word in text)
        if score > best_score:
            best_score = score
            if intent == "crop_doctor":
                best_category = "Crop Pathology Diagnostics"
                target_route = "/crop-doctor"
            elif intent == "mandi_rates":
                best_category = "Mandi Market Intelligence"
                target_route = "/mandi"
            elif intent == "marketplace":
                best_category = "Cooperative Resource Pooling"
                target_route = "/marketplace"
            elif intent == "gov_schemes":
                best_category = "Government Subsidies & Welfare"
                target_route = "/profile"
            elif intent == "fpga_diagnostics":
                best_category = "Edge FPGA Hardware Accelerator"
                target_route = "/accelerator"
            elif intent == "weather_advisory":
                best_category = "Microclimatic Weather Insights"
                target_route = "/dashboard"

    confidence = 94.0 if best_score > 0 else 75.0
    elapsed = (time.perf_counter() - start_time) * 1000

    return RouteDecision(
        category=best_category,
        confidence=confidence,
        requires_vision=best_category == "Crop Pathology Diagnostics",
        requires_audio=False,
        target_route=target_route,
        latency_ms=round(elapsed, 2)
    )
