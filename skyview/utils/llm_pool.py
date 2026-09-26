"""
Groq API Key Load Balancer
Round-robin distribution across multiple API keys with automatic failover.

Usage:
    from skyview.utils.llm_pool import get_llm, invoke_llm

    result = await invoke_llm(messages, timeout=15)
"""

import asyncio
import logging
import time
from itertools import cycle
from typing import TYPE_CHECKING, Any, Dict, List, Optional

try:
    from langchain_groq import ChatGroq

    logger_import_ok = True
except Exception as exc:  # pragma: no cover
    ChatGroq = None
    logger_import_ok = False
    _import_error = exc

if TYPE_CHECKING:
    from langchain_groq import ChatGroq as ChatGroqType

from skyview.utils.config import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()

# ── Internal state ────────────────────────────────────────────────────────────

_keys: List[str] = _settings.GROQ_API_KEYS
_key_cycle = cycle(_keys) if _keys else iter([])

_key_errors: Dict[str, int] = {}
_key_last_error: Dict[str, float] = {}

_ERROR_COOLDOWN_SEC = 60
_MAX_ERRORS = 3


def _next_healthy_key() -> Optional[str]:
    """Pick next key that is not in cooldown."""
    now = time.time()

    for _ in range(max(len(_keys), 1)):
        try:
            key = next(_key_cycle)
        except StopIteration:
            return None

        errors = _key_errors.get(key, 0)
        last_err = _key_last_error.get(key, 0)

        if errors >= _MAX_ERRORS and (
            now - last_err
        ) < _ERROR_COOLDOWN_SEC:
            continue

        _key_errors[key] = 0
        return key

    return _keys[0] if _keys else None


def _mark_key_error(key: str) -> None:
    _key_errors[key] = _key_errors.get(key, 0) + 1
    _key_last_error[key] = time.time()


def get_llm(
    model: Optional[str] = None,
    temperature: float = 0.25,
    timeout: int = 30,
    key: Optional[str] = None,
) -> Optional[Any]:
    """
    Return a ChatGroq instance using the next healthy API key.
    """

    if ChatGroq is None:
        logger.error(
            "Failed to import langchain_groq. Import error: %s",
            globals().get("_import_error"),
        )
        return None

    chosen_key = key or _next_healthy_key()

    if not chosen_key:
        logger.warning("No Groq API keys configured")
        return None

    return ChatGroq(
        model=model or _settings.LLM_MODEL,
        api_key=chosen_key,
        temperature=temperature,
        timeout=timeout,
        max_tokens=max_tokens,
    )


import httpx

def _format_messages_for_gemini(messages: Any) -> str:
    if isinstance(messages, str):
        return messages
    if isinstance(messages, list):
        parts = []
        for m in messages:
            if isinstance(m, tuple) and len(m) == 2:
                role, content = m
                parts.append(f"{role.capitalize()}: {content}")
            elif hasattr(m, "content"):
                role = getattr(m, "type", "user")
                parts.append(f"{role.capitalize()}: {m.content}")
            else:
                parts.append(str(m))
        return "\n\n".join(parts)
    return str(messages)


async def _invoke_gemini_fallback(messages: Any, timeout: int = 20) -> Optional[str]:
    api_key = _settings.GEMINI_API_KEY
    if not api_key:
        return None
    try:
        prompt_text = _format_messages_for_gemini(messages)
        model = getattr(_settings, "GEMINI_MODEL", "gemini-2.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt_text}]}]},
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts and "text" in parts[0]:
                        logger.info("Successfully received response from Gemini 2.5 fallback")
                        return parts[0]["text"]
            else:
                logger.warning("Gemini fallback returned %s: %s", resp.status_code, resp.text[:150])
    except Exception as exc:
        logger.warning("Gemini fallback exception: %s", exc)
    return None


async def invoke_llm(
    messages: Any,
    model: Optional[str] = None,
    temperature: float = 0.25,
    timeout: int = 30,
    retries: int = 3,
    max_tokens: int = 800,
) -> Optional[str]:
    """
    Invoke the LLM with automatic key rotation and retry on failure.
    Falls back to Gemini 2.5 Flash if Groq is unavailable.
    """

    chosen_model = model or _settings.LLM_MODEL
    last_exc = None

    if _keys and ChatGroq is not None:
        for attempt in range(retries):
            key = _next_healthy_key()
            if not key:
                break

            try:
                llm = ChatGroq(
                    model=chosen_model,
                    api_key=key,
                    temperature=temperature,
                    timeout=timeout,
                    max_tokens=max_tokens,
                )

                response = await asyncio.to_thread(
                    llm.invoke,
                    messages,
                )

                if response and response.content:
                    return response.content

            except Exception as exc:
                last_exc = exc
                _mark_key_error(key)
                logger.warning(
                    "LLM key attempt %d/%d failed with model %s (key=...%s): %s",
                    attempt + 1,
                    retries,
                    chosen_model,
                    key[-6:],
                    exc,
                )
                # If model name failed, try alternate working Groq model
                if "does not exist" in str(exc) or "404" in str(exc):
                    chosen_model = "qwen/qwen3.8-27b" if chosen_model != "qwen/qwen3.8-27b" else "openai/gpt-oss-120b"
                await asyncio.sleep(0.3 * (attempt + 1))

    # Seamless fallback to Gemini 2.5 Flash
    logger.info("Attempting Gemini AI fallback...")
    gemini_resp = await _invoke_gemini_fallback(messages, timeout=timeout)
    if gemini_resp:
        return gemini_resp

    logger.error("All LLM retries (Groq + Gemini) exhausted. Last error: %s", last_exc)
    return None


def pool_status() -> Dict[str, Any]:
    """Return current load-balancer health info."""

    now = time.time()
    statuses = []

    for key in _keys:
        errors = _key_errors.get(key, 0)
        last_err = _key_last_error.get(key, 0)

        cooling = (
            errors >= _MAX_ERRORS
            and (now - last_err) < _ERROR_COOLDOWN_SEC
        )

        statuses.append(
            {
                "key_suffix": key[-6:],
                "consecutive_errors": errors,
                "cooling_down": cooling,
                "cooldown_remaining_s": (
                    max(
                        0,
                        int(
                            _ERROR_COOLDOWN_SEC
                            - (now - last_err)
                        ),
                    )
                    if cooling
                    else 0
                ),
            }
        )

    return {
        "total_keys": len(_keys),
        "healthy_keys": sum(
            1 for s in statuses if not s["cooling_down"]
        ),
        "keys": statuses,
    }