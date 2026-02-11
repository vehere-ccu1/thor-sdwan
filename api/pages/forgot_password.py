"""
API module corresponding to gui/src/pages/ForgotPassword.jsx.
Business logic for forgot password: request OTP (in-memory stub), reset with OTP.
"""
import hashlib
import os
import time
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import CLICKHOUSE_DATABASE
from db import execute, execute_many

router = APIRouter()

# In-memory OTP store: email -> (otp_code, expiry_ts). Replace with Redis/DB + email send in production.
_otp_store: dict[str, tuple[str, float]] = {}
OTP_TTL_SECONDS = 600


def _password_sha256_hex(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _generate_otp() -> str:
    return str(int.from_bytes(os.urandom(4), "big"))[-6:].zfill(6)


class RequestOtpRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


@router.post("/forgot-password/request-otp")
def request_otp(body: RequestOtpRequest):
    """Request OTP for password reset. In production, send OTP via email. Here we store in memory and return it for testing."""
    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email required.")
    q = f"SELECT id FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE email = %(email)s LIMIT 1"
    rows = execute(q, {"email": email})
    if not rows:
        return {"message": "If this email is registered, an OTP has been sent."}
    otp = _generate_otp()
    _otp_store[email] = (otp, time.time() + OTP_TTL_SECONDS)
    return {"message": "If this email is registered, an OTP has been sent.", "otp": otp}


@router.post("/forgot-password/reset")
def reset_password(body: ResetPasswordRequest):
    """Verify OTP and set new password."""
    email = (body.email or "").strip().lower()
    otp = (body.otp or "").strip()
    new_password = body.new_password or ""
    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP required.")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    stored = _otp_store.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP expired or not requested.")
    stored_otp, expiry = stored
    if time.time() > expiry:
        del _otp_store[email]
        raise HTTPException(status_code=400, detail="OTP expired.")
    if stored_otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
    del _otp_store[email]
    # Preserve existing user fields; only change password_hash.
    # If we insert only a subset of columns into ReplacingMergeTree, missing columns may be replaced with defaults.
    q = f"""SELECT id,
                   account_id,
                   email,
                   name,
                   job_title,
                   role_id,
                   is_owner,
                   enabled,
                   created_by_user_id,
                   master_owner_user_id,
                   organizations,
                   organization_group_ids
            FROM {CLICKHOUSE_DATABASE}.users FINAL
            WHERE email = %(email)s
            LIMIT 1"""
    rows = execute(q, {"email": email})
    if not rows:
        raise HTTPException(status_code=404, detail="User not found.")
    r = rows[0]
    password_hash = _password_sha256_hex(new_password)
    ins = f"""INSERT INTO {CLICKHOUSE_DATABASE}.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled, created_by_user_id, master_owner_user_id, organizations, organization_group_ids, job_title) VALUES"""
    execute_many(
        ins,
        [
            (
                r[0],
                r[1],
                r[2],
                r[3] or "",
                password_hash,
                r[5],
                r[6],
                r[7],
                r[8],
                r[9],
                list(r[10]) if r[10] is not None else [],
                list(r[11]) if r[11] is not None else [],
                r[4] or "",
            )
        ],
    )
    return {"message": "Password has been reset."}
