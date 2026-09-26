"""
pytest conftest — shared fixtures for SkyView tests.
"""

import os
import pytest
from fastapi.testclient import TestClient

# Use SQLite in-memory for tests — no PostgreSQL needed
os.environ.setdefault("DATABASE_URL", "sqlite:///test_skyview.db")
os.environ.setdefault("GROQ_API_KEY", "test_key")
os.environ.setdefault("DEBUG", "True")

from skyview.main import app  # noqa: E402 — env must be set before import


@pytest.fixture(scope="session")
def client():
    """Synchronous test client for the full SkyView FastAPI app."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def mock_llm_invoke(monkeypatch):
    async def mock_invoke(messages, *args, **kwargs):
        prompt = str(messages).lower()
        if "negotiate" in prompt or "deal broker" in prompt:
            return """
            {
              "logs": [
                {"speaker": "Deal Broker", "text": "Hello! I am the broker."},
                {"speaker": "A", "text": "I offer tractor."},
                {"speaker": "B", "text": "I offer harvester."},
                {"speaker": "Deal Broker", "text": "Let's trade with a \\u20b9500 offset."}
              ],
              "details": {
                "distance_km": 10.0,
                "transport_cost_rs": 150.0,
                "mandi_rate_reference": "Wheat: \\u20b92100/Quintal",
                "suggested_offset_rs": 500,
                "offset_payer": "B",
                "agreement_terms": "Barter with \\u20b9500 offset."
              }
            }
            """
        elif "optimization plan" in prompt or "resource optimization" in prompt:
            return "1. Share equipment centrally.\\n2. Coordinate sowing schedules.\\n3. Optimize transport routes."
        elif "sharing schedule" in prompt or "weekly sharing schedule" in prompt:
            return "Farmer A shares Tractor on Mon-Tue. Farmer B shares Harvester on Wed-Thu. Farmer C shares Labor on Fri-Sat."
        return "Mocked LLM Response"
    
    import skyview.utils.llm_pool
    import skyview.api.marketplace_routes
    import skyview.api.profile_routes
    import skyview.api.chat_routes
    import skyview.api.advisor_routes

    monkeypatch.setattr(skyview.utils.llm_pool, "invoke_llm", mock_invoke)
    monkeypatch.setattr(skyview.api.marketplace_routes, "invoke_llm", mock_invoke)
    monkeypatch.setattr(skyview.api.profile_routes, "invoke_llm", mock_invoke)
    monkeypatch.setattr(skyview.api.chat_routes, "invoke_llm", mock_invoke)
    monkeypatch.setattr(skyview.api.advisor_routes, "invoke_llm", mock_invoke)