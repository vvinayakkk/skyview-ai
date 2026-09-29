import re
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from skyview.data.db import get_session
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/api/auth", tags=["Auth"])
logger = get_logger(__name__)

_otp_store: Dict[str, str] = {}  # phone → current active OTP
_live_otps: List[Dict[str, Any]] = []  # Chronological queue of dispatched OTPs


def _sanitize_for_log(val: Any) -> str:
    """Sanitize strings for secure logging (prevents SonarCloud S5145 log injection)."""
    if val is None:
        return ""
    cleaned = re.sub(r'[\r\n\t]', ' ', str(val))
    return re.sub(r'[^a-zA-Z0-9+_ -]', '', cleaned)[:32]


DEMO_PHONES = {"9999999999", "+919999999999", "9876543210", "+919876543210"}


def _is_demo_phone(phone: str) -> bool:
    digits = re.sub(r'[^0-9]', '', str(phone or ''))
    return digits.endswith("9999999999") or digits.endswith("9876543210")


def _mask_phone(phone: str) -> str:
    digits = phone.replace("+91", "").replace(" ", "").replace("-", "")
    if len(digits) >= 4:
        return f"+91 XXXXX X{digits[-4:]}"
    return phone


def _record_live_otp(phone: str, otp: str, purpose: str) -> Dict[str, Any]:
    """Records an OTP dispatch event for the live carrier stream."""
    entry = {
        "id": f"sms_{int(time.time() * 1000)}",
        "phone": phone,
        "masked_phone": _mask_phone(phone),
        "otp": otp,
        "purpose": purpose,
        "sender": "VK-SKYVIEW",
        "message": f"VK-SKYVIEW: Your SkyView AI verification code is {otp}. Valid for 10 minutes. Do not share this OTP with anyone.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "DELIVERED",
    }
    _live_otps.insert(0, entry)
    if len(_live_otps) > 100:
        _live_otps.pop()
    return entry


@router.get("/live-otps")
async def get_live_otps():
    """Returns chronological stream of dispatched OTPs for real-time handset monitor."""
    return {
        "status": "success",
        "count": len(_live_otps),
        "otps": _live_otps,
    }


@router.delete("/live-otps")
async def clear_live_otps():
    """Clears the live OTP stream."""
    _live_otps.clear()
    return {"status": "success", "message": "Live OTP queue cleared"}


class RecordOtpReq(BaseModel):
    phone: str
    otp: str
    purpose: Optional[str] = "Verification"


@router.post("/record-live-otp")
async def record_live_otp(req: RecordOtpReq):
    entry = _record_live_otp(req.phone, req.otp, req.purpose or "Verification")
    return {"status": "success", "entry": entry}


class SendOtpReq(BaseModel):
    phone: str
    is_signup: bool = False


class VerifyOtpReq(BaseModel):
    phone: str
    otp: str


class SignupReq(BaseModel):
    phone: str
    name: Optional[str] = None


@router.post("/send-otp")
async def send_otp(req: SendOtpReq):
    # Instant bypass for demo testing user
    if _is_demo_phone(req.phone):
        demo_otp = "999999"
        _otp_store[req.phone] = demo_otp
        _record_live_otp(req.phone, demo_otp, "Demo Testing User Authorization")
        return {
            "status": "success",
            "message": "Demo user access authorized",
            "sms_sent": True,
            "otp": demo_otp,
            "demo_bypass": True,
        }

    db = get_session()
    user_row = None
    try:
        user_row = db.execute(
            text("SELECT phone, saved_otp FROM users WHERE phone = :p"), {"p": req.phone}
        ).fetchone()
    except Exception as exc:
        logger.debug("Lookup user note: %s", exc)
    finally:
        db.close()

    if req.is_signup:
        # SIGNUP: Generate new 6-digit OTP and dispatch to carrier stream
        otp = f"{secrets.randbelow(900000) + 100000}"
        _otp_store[req.phone] = otp
        _record_live_otp(req.phone, otp, "New Farmer Registration")

        # Update saved_otp in DB if user row exists
        if user_row:
            db = get_session()
            try:
                db.execute(
                    text("UPDATE users SET saved_otp = :otp WHERE phone = :p"),
                    {"otp": otp, "p": req.phone}
                )
                db.commit()
            except Exception as update_exc:
                db.rollback()
                logger.debug("Update saved_otp note: %s", update_exc)
            finally:
                db.close()

        safe_phone = _sanitize_for_log(req.phone)
        logger.info("Signup OTP dispatched for %s to carrier stream", safe_phone)
        return {
            "status": "success",
            "message": f"OTP sent to {_mask_phone(req.phone)}",
            "sms_sent": True,
            "otp": otp,
        }
    else:
        # LOGIN: Generate fresh dynamic OTP every time
        otp = f"{secrets.randbelow(900000) + 100000}"
        _otp_store[req.phone] = otp
        _record_live_otp(req.phone, otp, "Farmer Portal Login")

        # Save to DB so verify_otp and user profile record it
        db = get_session()
        try:
            if user_row:
                db.execute(
                    text("UPDATE users SET saved_otp = :otp WHERE phone = :p"),
                    {"otp": otp, "p": req.phone}
                )
            else:
                db.execute(
                    text("INSERT INTO users (phone, saved_otp) VALUES (:p, :otp) ON CONFLICT (phone) DO UPDATE SET saved_otp = EXCLUDED.saved_otp"),
                    {"p": req.phone, "otp": otp}
                )
            db.commit()
        except Exception as set_exc:
            db.rollback()
            logger.debug("Set login OTP note: %s", set_exc)
        finally:
            db.close()

        safe_phone = _sanitize_for_log(req.phone)
        logger.info("Fresh dynamic login OTP dispatched for %s to carrier stream", safe_phone)
        return {
            "status": "success",
            "message": f"OTP sent to {_mask_phone(req.phone)}",
            "sms_sent": True,
            "otp": otp,
        }


@router.post("/verify-otp")
async def verify_otp(req: VerifyOtpReq):
    # Instant bypass for demo testing user or standard testing token
    if _is_demo_phone(req.phone) or req.otp in ["999999", "123456"]:
        _otp_store.pop(req.phone, None)
        return {"status": "success", "token": f"demo_jwt_{req.phone}"}

    expected = _otp_store.get(req.phone)
    if not expected:
        # Check database saved_otp as fallback
        db = get_session()
        try:
            row = db.execute(
                text("SELECT saved_otp FROM users WHERE phone = :p"), {"p": req.phone}
            ).fetchone()
            if row and row[0]:
                expected = str(row[0])
        except Exception as exc:
            logger.debug("Verify fallback note: %s", exc)
        finally:
            db.close()

    if expected and expected == req.otp:
        _otp_store.pop(req.phone, None)
        return {"status": "success", "token": f"mock_jwt_{req.phone}"}
    raise HTTPException(400, "Invalid OTP")


@router.post("/signup")
async def signup(req: SignupReq):
    saved_otp = _otp_store.get(req.phone)
    db = get_session()
    try:
        db.execute(
            text("""
                INSERT INTO users (phone, name, saved_otp)
                VALUES (:p, :n, :otp)
                ON CONFLICT (phone) DO UPDATE SET
                    name = EXCLUDED.name,
                    saved_otp = COALESCE(EXCLUDED.saved_otp, users.saved_otp)
            """),
            {"p": req.phone, "n": req.name, "otp": saved_otp},
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, str(exc))
    finally:
        db.close()
    return {"status": "success", "phone": req.phone}