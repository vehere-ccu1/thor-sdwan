"""
API module corresponding to gui/src/pages/CreateAccount.jsx.
Business logic for creating an owner account (account + owner user in one step).
"""
import hashlib
import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import CLICKHOUSE_DATABASE
from db import execute, execute_many

logger = logging.getLogger(__name__)

# Owner role UUID from db/05_seed_admin.sql
DEFAULT_OWNER_ROLE_ID = UUID("22222222-2222-2222-2222-222222222222")

router = APIRouter()


class CreateOwnerAccountRequest(BaseModel):
    """Request body for create-owner-account. Matches Create Account form."""
    company_name: str
    business_email: str
    first_name: str
    last_name: str
    job_title: str = ""
    phone_number: str = ""
    password: str


def _password_sha256_hex(password: str) -> str:
    """Return SHA-256 hash of password as hex string (same as DB seed)."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@router.post("/create-owner-account")
def create_owner_account(body: CreateOwnerAccountRequest):
    """
    Create a new account and its owner user in one transaction.
    Used by the Create Account page (gui/src/pages/CreateAccount.jsx).
    """
    try:
        company_name = (body.company_name or "").strip()
        business_email = (body.business_email or "").strip()
        first_name = (body.first_name or "").strip()
        last_name = (body.last_name or "").strip()
        password = body.password or ""

        if not company_name or not business_email:
            raise HTTPException(status_code=400, detail="Company name and business email are required.")
        if not first_name or not last_name:
            raise HTTPException(status_code=400, detail="First name and last name are required.")
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

        # 1. Create account (use string UUIDs so ClickHouse driver serializes correctly)
        account_id = uuid4()
        q_account = f"""INSERT INTO {CLICKHOUSE_DATABASE}.accounts (id, name, billing_email) VALUES"""
        execute_many(q_account, [(str(account_id), company_name, business_email)])

        # 2. Create owner user (password hashed server-side)
        user_id = uuid4()
        full_name = f"{first_name} {last_name}".strip()
        password_hash = _password_sha256_hex(password)
        q_user = f"""INSERT INTO {CLICKHOUSE_DATABASE}.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled) VALUES"""
        execute_many(
            q_user,
            [
                (
                    str(user_id),
                    str(account_id),
                    business_email,
                    full_name,
                    password_hash,
                    str(DEFAULT_OWNER_ROLE_ID),
                    1,
                    1,
                )
            ],
        )

        return {
            "account_id": str(account_id),
            "user_id": str(user_id),
            "company_name": company_name,
            "business_email": business_email,
            "name": full_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("create-owner-account failed")
        raise HTTPException(status_code=500, detail=f"Failed to create account: {e!s}")
