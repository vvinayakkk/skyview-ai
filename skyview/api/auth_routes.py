import os
import re
import secrets
from typing import Any, Dict, List, Optional
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from skyview.data.db import get_session
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/api/auth", tags=["Auth"])
logger = get_logger(__name__)

_otp_store: Dict[str, str] = {}  # phone → current active OTP


def _sanitize_for_log(val: Any) -> str:
    """Sanitize strings for secure logging (prevents SonarCloud S5145 log injection)."""
    if val is None:
        return ""
    cleaned = re.sub(r'[\r\n\t]', ' ', str(val))
    return re.sub(r'[^a-zA-Z0-9+_ -]', '', cleaned)[:32]


def _get_api_keys() -> List[str]:
    raw = os.getenv("FAST2SMS_API_KEY", "")
    return [k.strip() for k in raw.split(",") if k.strip()]


def send_fast2sms_otp(phone: str, otp: str) -> bool:
    """Dispatches real OTP SMS to Indian mobile numbers with automatic multi-key failover."""
    keys = _get_api_keys()
    if not keys:
        logger.info("Fast2SMS API key not set; skipping live SMS dispatch.")
        return False

    safe_phone = _sanitize_for_log(phone)
    clean_digits = phone.replace("+91", "").replace(" ", "").replace("-", "")
    if len(clean_digits) != 10 or not clean_digits.isdigit():
        logger.warning("Phone %s is not a 10-digit Indian number for Fast2SMS.", safe_phone)
        return False

    for idx, key in enumerate(keys):
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            payload = {
                "variables_values": otp,
                "route": "otp",
                "numbers": clean_digits,
            }
            headers = {"authorization": key}
            resp = requests.post(url, data=payload, headers=headers, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("return") is True:
                    logger.info("Fast2SMS delivered OTP to %s via key #%d", safe_phone, idx + 1)
                    return True
                logger.warning("Fast2SMS key #%d error: %s", idx + 1, data.get("message"))
            else:
                logger.warning("Fast2SMS key #%d returned HTTP %s: %s", idx + 1, resp.status_code, resp.text)
        except Exception as exc:
            logger.error("Fast2SMS error on key #%d: %s", idx + 1, exc)

    logger.error("All %d Fast2SMS API keys failed to deliver SMS to %s.", len(keys), safe_phone)
    return False


def _mask_phone(phone: str) -> str:
    digits = phone.replace("+91", "").replace(" ", "").replace("-", "")
    if len(digits) >= 4:
        return f"+91 XXXXX X{digits[-4:]}"
    return phone


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
        # SIGNUP: Generate new 6-digit OTP and send live SMS to verify their handset
        otp = f"{secrets.randbelow(900000) + 100000}"
        _otp_store[req.phone] = otp
        sms_sent = send_fast2sms_otp(req.phone, otp)

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
        logger.info("Signup OTP dispatched for %s (SMS sent: %s)", safe_phone, sms_sent)
        return {
            "status": "success",
            "message": f"OTP sent to {_mask_phone(req.phone)}",
            "sms_sent": sms_sent,
            "otp": otp,
        }
    else:
        # LOGIN: Prevent burning credits!
        if not user_row:
            raise HTTPException(404, "Phone not registered. Please sign up first.")

        # Re-use user's profile verified OTP from signup
        saved_otp = user_row[1] if (user_row and len(user_row) > 1 and user_row[1]) else None
        if not saved_otp:
            saved_otp = _otp_store.get(req.phone, "123456")
            db = get_session()
            try:
                db.execute(
                    text("UPDATE users SET saved_otp = :otp WHERE phone = :p"),
                    {"otp": saved_otp, "p": req.phone}
                )
                db.commit()
            except Exception as set_exc:
                db.rollback()
                logger.debug("Set saved_otp note: %s", set_exc)
            finally:
                db.close()

        _otp_store[req.phone] = saved_otp
        safe_phone = _sanitize_for_log(req.phone)
        logger.info("Login OTP accessed for %s using saved profile OTP (0 SMS credits used)", safe_phone)
        return {
            "status": "success",
            "message": f"OTP sent to {_mask_phone(req.phone)}",
            "sms_sent": False,
            "otp": saved_otp,
        }


@router.post("/verify-otp")
async def verify_otp(req: VerifyOtpReq):
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