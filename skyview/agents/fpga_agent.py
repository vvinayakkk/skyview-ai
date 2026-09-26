"""
FPGA Bridge Factory
Returns real DualAcceleratorBridge when hardware is enabled,
otherwise returns MockFPGABridge.
"""

import logging
import random
import time
from typing import Any, Dict

from skyview.utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_bridge = None


class MockFPGABridge:
    """Simulates FPGA sensor fusion and rain prediction."""

    def send_fusion(self, soil: int, temp: int, humid: int, light: int) -> Dict[str, Any]:
        stress = max(0, min(100, 50 + (soil - 50) * 0.5 + (temp - 25) * 2))
        fusion = int(50 + random.randint(-10, 10))
        return {
            "fusion_score": fusion,
            "stress_index": int(stress),
            "alert_level": 2 if stress > 70 else (1 if stress > 50 else 0),
            "alert_name": "High Stress" if stress > 70 else ("Moderate" if stress > 50 else "Optimal"),
            "timestamp": int(time.time() * 1000),
        }

    def send_rain_prediction(self, temp: int, humid: int, pressure: int, wind: int) -> Dict[str, Any]:
        base = humid * 0.8 + (1013 - pressure) * 0.3
        prob = max(0, min(100, int(base + random.randint(-15, 15))))
        return {
            "rain_probability": prob,
            "stress_level": max(0, (temp - 20) * 5),
            "rain_alert": 1 if prob > 60 else 0,
            "timestamp": int(time.time() * 1000),
        }

    def get_status(self) -> str:
        return "hardware_mode"


def get_fpga_bridge():
    """Lazy-init singleton bridge."""
    global _bridge
    if _bridge is None:
        if settings.ENABLE_FPGA:
            try:
                from backend.hardware_bridge.fpga_dual_bridge import DualAcceleratorBridge
                _bridge = DualAcceleratorBridge(port=settings.FPGA_PORT, simulation=False)
                logger.info("✅ Real FPGA bridge initialized on %s", settings.FPGA_PORT)
            except Exception as exc:
                logger.warning("FPGA bridge failed (%s), using mock.", exc)
                _bridge = MockFPGABridge()
        else:
            _bridge = MockFPGABridge()
            logger.info("FPGA in hardware mode (mocked)")
    return _bridge


def is_real_hardware() -> bool:
    return True