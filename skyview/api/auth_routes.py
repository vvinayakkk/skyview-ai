"""
Authentication Routes
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/signup
"""

import random
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from skyview.data.db import get_session
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/api/auth", tags=["Auth"])
logger = get_logger(__name__)

_otp_store: Dict[str, str] = {}  # phone → otp


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
    if not req.is_signup:
        db = get_session()
        try:
            user = db.execute(
                text("SELECT phone FROM users WHERE phone = :p"), {"p": req.phone}
            ).fetchone()
        finally:
            db.close()
        if not user:
            raise HTTPException(404, "Phone not registered. Please sign up first.")

    otp = str(random.randint(100000, 999999))
    _otp_store[req.phone] = otp
    logger.info("OTP for %s: %s", req.phone, otp)  # console — no real SMS in dev
    return {"status": "success", "message": "OTP sent.", "otp": otp}


@router.post("/verify-otp")
async def verify_otp(req: VerifyOtpReq):
    expected = _otp_store.get(req.phone)
    if expected and expected == req.otp:
        _otp_store.pop(req.phone, None)
        return {"status": "success", "token": f"mock_jwt_{req.phone}"}
    raise HTTPException(400, "Invalid OTP")


@router.post("/signup")
async def signup(req: SignupReq):
    db = get_session()
    try:
        db.execute(
            text("""
                INSERT INTO users (phone, name)
                VALUES (:p, :n)
                ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
            """),
            {"p": req.phone, "n": req.name},
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, str(exc))
    finally:
        db.close()
    return {"status": "success", "phone": req.phone}