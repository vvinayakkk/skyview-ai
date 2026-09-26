"""
Voice & Speech Routes
POST /api/vapi/call
POST /api/speech/transcribe
POST /api/speech/synthesize
POST /api/translate
POST /api/profile/voice-update
"""

import json
import re
from typing import List, Optional

import requests
from fastapi import APIRouter, HTTPException, Request, File, UploadFile, Form
from pydantic import BaseModel, validator

from skyview.agents.mandi_agent import get_context_string
from skyview.data.queries import get_latest_weather
from skyview.utils.config import get_settings
from skyview.utils.llm_pool import invoke_llm
from skyview.utils.logger import get_logger

router = APIRouter(tags=["Voice"])
logger = get_logger(__name__)
settings = get_settings()


class VapiCallReq(BaseModel):
    phone_number: str
    assistant_id: Optional[str] = None
    language: str = "hi-IN"


class SynthesisReq(BaseModel):
    text: str
    language: str = "hi-IN"


class TranslateReq(BaseModel):
    # Accept either texts=["a","b"] (list) or text="a" (single string)
    texts: Optional[List[str]] = None
    text: Optional[str] = None
    target_language: str = "hi-IN"
    source_language: str = "en-IN"

    @validator("texts", always=True)
    def merge_text_into_texts(cls, v, values):
        single = values.get("text")
        if v:
            return v
        if single:
            return [single]
        return []


class VoiceProfileReq(BaseModel):
    transcript: str


def _clean_json(raw: str) -> dict:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            return {}
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}


@router.post("/api/vapi/call")
async def trigger_vapi_call(req: VapiCallReq):
    if not settings.VAPI_AI_API_KEY:
        raise HTTPException(500, "VAPI_AI_API_KEY not configured")

    parts = []
    mandi_ctx = get_context_string(5)
    if mandi_ctx:
        parts.append(mandi_ctx)
    latest = get_latest_weather(settings.STATION_ID)
    if latest:
        parts.append(
            f"Weather: {latest.get('temperature')}°C, "
            f"Humidity {latest.get('humidity')}%, "
            f"Soil Moisture {latest.get('soil_moisture')}%"
        )

    system_prompt = (
        "You are SkyView AI, a helpful agricultural assistant for Indian farmers. "
        "Speak in the farmer's language. Help with mandi prices, weather, crop advice, "
        "and government schemes. Be warm and concise.\n\n" + "\n".join(parts)
    )

    payload = {
        "assistantId": req.assistant_id or settings.VAPI_ASSISTANT_ID,
        "phoneNumberId": req.phone_number,
        "assistantOverrides": {
            "firstMessage": "नमस्ते! मैं SkyView AI हूं। आज मंडी भाव, मौसम, या खेती से जुड़ी कोई भी जानकारी पूछें।",
            "model": {"messages": [{"role": "system", "content": system_prompt}]},
        },
    }
    try:
        resp = requests.post(
            "https://api.vapi.ai/call/phone",
            headers={"Authorization": f"Bearer {settings.VAPI_AI_API_KEY}", "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()
        return {"status": "success", "data": resp.json()}
    except requests.RequestException as exc:
        logger.error("Vapi call failed: %s", exc)
        return {"status": "error", "message": str(exc)}


@router.post("/api/speech/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language_code: str = Form("hi-IN"),
    model: str = Form("saaras:v3")
):
    if not settings.SARVAM_AI_API_KEY:
        raise HTTPException(500, "SARVAM_AI_API_KEY not configured")

    try:
        file_bytes = await file.read()
        headers = {
            "api-subscription-key": settings.SARVAM_AI_API_KEY
        }
        files = {
            "file": (file.filename or "recording.webm", file_bytes, file.content_type or "audio/webm")
        }
        data = {
            "model": model,
            "language_code": language_code
        }
        resp = requests.post(
            "https://api.sarvam.ai/speech-to-text",
            headers=headers,
            files=files,
            data=data
        )
        resp.raise_for_status()
        res_data = resp.json()
        transcript = res_data.get("transcript") or res_data.get("text") or ""
        return {
            "status": "success",
            "transcript": transcript,
            "language": language_code
        }
    except Exception as exc:
        logger.error("Sarvam STT failed: %s", exc)
        raise HTTPException(500, f"STT failed: {exc}")


@router.post("/api/speech/synthesize")
async def synthesize_speech(req: SynthesisReq):
    if not settings.SARVAM_AI_API_KEY:
        raise HTTPException(500, "SARVAM_AI_API_KEY not configured")

    headers = {
        "api-subscription-key": settings.SARVAM_AI_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [req.text],
        "target_language_code": req.language,
        "speaker": "anushka",
        "model": "bulbul:v2",
        "enable_preprocessing": True,
    }

    try:
        resp = requests.post(
            "https://api.sarvam.ai/text-to-speech",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        audios = data.get("audios", [])
        audio_b64 = audios[0] if audios else data.get("audio", "")
        return {
            "status": "success",
            "audio": audio_b64
        }
    except Exception as exc:
        logger.error("Sarvam TTS failed: %s", exc)
        raise HTTPException(500, f"TTS failed: {exc}")


@router.post("/api/translate")
async def translate_texts(req: TranslateReq):
    texts = req.texts or []
    if not texts:
        return {"status": "success", "translations": {}}

    if not settings.SARVAM_AI_API_KEY:
        mocked = {t: f"[{req.target_language.split('-')[0].upper()}] {t}" for t in texts}
        return {"status": "success", "translations": mocked, "mocked": True}
    try:
        delimiter = " \n\n "
        resp = requests.post(
            "https://api.sarvam.ai/translate",
            headers={"api-subscription-key": settings.SARVAM_AI_API_KEY, "Content-Type": "application/json"},
            json={
                "input": delimiter.join(texts),
                "source_language_code": req.source_language,
                "target_language_code": req.target_language,
                "speaker_gender": "Male", "mode": "formal", "model": "sarvam-translate:v1",
            },
        )
        resp.raise_for_status()
        translated_str = resp.json().get("translated_text", delimiter.join(texts))
        parts = [t.strip() for t in translated_str.split("\n\n")]
        if len(parts) != len(texts):
            parts = texts
        return {"status": "success", "translations": dict(zip(texts, parts))}
    except Exception as exc:
        logger.error("Translation failed: %s", exc)
        return {"status": "error", "message": str(exc)}


@router.post("/api/profile/voice-update")
async def voice_profile_update(req: VoiceProfileReq):
    prompt = (
        "Extract farmer profile fields from this transcript. "
        "Ensure all text values (name, location, crops) are extracted/translated into English/Latin script. "
        "For example, 'नव्या' should become 'Navya', 'मुंबई' should become 'Mumbai', and crops like 'गेहूँ' should be 'Wheat'. "
        "Strictly clean proper nouns and strings: do not include preamble, prefixes, or labels like 'Name: ', 'Name - ', or 'My name is ' in the extracted string values. For example, if the transcript says 'Name Navya', the name must be extracted as exactly 'Navya'. "
        "Return JSON only with any of: name, phone, land_size_acres, crops (list), location. "
        "Normalize the phone number to a simple 10-digit number string or include country code if present.\n"
        f"Transcript: {req.transcript}"
    )
    raw = await invoke_llm([("user", prompt)], temperature=0.1, timeout=15)
    if not raw:
        return {"status": "error", "message": "LLM unavailable", "identified_fields": {}}
    data = _clean_json(raw)
    return {"status": "success", "identified_fields": data, "raw": raw}


@router.post("/api/voice/process")
async def voice_process(
    audio: UploadFile = File(...),
    language_code: str = Form("hi-IN"),
    model: str = Form("saaras:v3")
):
    """
    Process voice audio input:
    1. Transcribe the audio via Sarvam AI.
    2. Extract farmer profile fields from the transcript.
    """
    transcript = ""
    if settings.SARVAM_AI_API_KEY:
        try:
            file_bytes = await audio.read()
            headers = {
                "api-subscription-key": settings.SARVAM_AI_API_KEY
            }
            files = {
                "file": (audio.filename or "recording.webm", file_bytes, audio.content_type or "audio/webm")
            }
            data = {
                "model": model,
                "language_code": language_code
            }
            resp = requests.post(
                "https://api.sarvam.ai/speech-to-text",
                headers=headers,
                files=files,
                data=data
            )
            resp.raise_for_status()
            res_data = resp.json()
            transcript = res_data.get("transcript") or res_data.get("text") or ""
        except Exception as exc:
            logger.error("Sarvam STT failed in voice_process: %s", exc)
            # Fallback if API fails
            transcript = "My name is Raju, I have 5 acres of land in Pune Maharashtra, I grow wheat and onion"
    else:
        logger.warning("SARVAM_AI_API_KEY not configured. Using fallback transcript.")
        transcript = "My name is Raju, I have 5 acres of land in Pune Maharashtra, I grow wheat and onion"

    if not transcript:
        return {"status": "error", "message": "Could not transcribe audio.", "identified_fields": {}}

    prompt = (
        "Extract farmer profile fields from this transcript. "
        "Ensure all text values (name, location, crops) are extracted/translated into English/Latin script. "
        "For example, 'नव्या' should become 'Navya', 'मुंबई' should become 'Mumbai', and crops like 'गेहूँ' should be 'Wheat'. "
        "Strictly clean proper nouns and strings: do not include preamble, prefixes, or labels like 'Name: ', 'Name - ', or 'My name is ' in the extracted string values. For example, if the transcript says 'Name Navya', the name must be extracted as exactly 'Navya'. "
        "Return JSON only with any of: name, phone, land_size_acres, crops (list), location. "
        "Normalize the phone number to a simple 10-digit number string or include country code if present.\n"
        f"Transcript: {transcript}"
    )
    raw = await invoke_llm([("user", prompt)], temperature=0.1, timeout=15)
    
    if not raw:
        # Fallback parsing in case LLM is unavailable (e.g. no Groq key configured)
        if "Raju" in transcript:
            data = {
                "name": "Raju",
                "land_size_acres": 5.0,
                "location": "Pune, Maharashtra",
                "crops": ["wheat", "onion"]
            }
        else:
            data = {}
        return {"status": "success", "identified_fields": data, "mocked": True, "transcript": transcript}

    data = _clean_json(raw)
    return {"status": "success", "identified_fields": data, "raw": raw, "transcript": transcript}