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
    # New UI sends a single "name" field. Keep first/last for backward compatibility.
    name: str = ""
    first_name: str = ""
    last_name: str = ""
    job_title: str = ""
    phone_number: str = ""
    country: str = ""
    password: str
    master_organization_name: str = ""


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
        business_email = (body.business_email or "").strip().lower()
        name = (body.name or "").strip()
        first_name = (body.first_name or "").strip()
        last_name = (body.last_name or "").strip()
        job_title = (body.job_title or "").strip()
        password = body.password or ""
        master_org_name = (body.master_organization_name or "").strip()
        country = (body.country or "").strip()

        if not company_name or not business_email:
            raise HTTPException(status_code=400, detail="Organization (Master) and business email are required.")
        if not name and (not first_name or not last_name):
            raise HTTPException(status_code=400, detail="Name is required.")
        if not master_org_name:
            raise HTTPException(status_code=400, detail="Master-Organization name is required.")
        if not job_title:
            raise HTTPException(status_code=400, detail="Job title is required.")
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

        # Enforce unique email (email is treated as the primary identifier).
        # ClickHouse does not enforce uniqueness, so we guard at the API layer.
        exists = execute(
            f"SELECT 1 FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE email = %(email)s LIMIT 1",
            {"email": business_email},
        )
        if exists:
            raise HTTPException(status_code=409, detail="A user with this email already exists.")

        # 1. IDs: account, the first owner (master owner), default site-group, and master organization
        account_id = uuid4()
        user_id = uuid4()
        group_id = uuid4()
        org_id = uuid4()
        full_name = name or f"{first_name} {last_name}".strip()
        password_hash = _password_sha256_hex(password)

        # 2. Create account with master_owner_user_id, master_organization_name, and country/notifications
        q_account = f"""INSERT INTO {CLICKHOUSE_DATABASE}.accounts (id, name, billing_email, master_owner_user_id, master_organization_name, country, notifications) VALUES"""
        execute_many(
            q_account,
            [
                (
                    str(account_id),
                    company_name,
                    business_email,
                    str(user_id),
                    master_org_name,
                    country,
                    0,
                )
            ],
        )

        # 3. Create owner user (master owner: first sign-up from Create Account page)
        q_user = f"""INSERT INTO {CLICKHOUSE_DATABASE}.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled, master_owner_user_id, created_by_user_id, organizations, organization_group_ids, job_title) VALUES"""
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
                    str(user_id),
                    str(user_id),
                    [],
                    [],
                    job_title,
                )
            ],
        )

        # 4. Create default site-group for the master organization.
        #    This represents the top-level Site Group with the same name as the Master-Organization.
        q_group = f"""INSERT INTO {CLICKHOUSE_DATABASE}.groups (id, account_id, name, master_owner_user_id, created_by_user_id, parent_group_id) VALUES"""
        execute_many(
            q_group,
            [
                (
                    str(group_id),
                    str(account_id),
                    master_org_name,
                    str(user_id),
                    str(user_id),
                    "00000000-0000-0000-0000-000000000000",
                )
            ],
        )

        # 5. Create master organization (site where SD-WAN agents will attach).
        # Master-Organization has no parent group: group_id = nil.
        q_org = f"""INSERT INTO {CLICKHOUSE_DATABASE}.organizations (id, account_id, group_id, name, group_name, tunnel_key_exchange, is_default, master_owner_user_id, created_by_user_id) VALUES"""
        execute_many(
            q_org,
            [
                (
                    str(org_id),
                    str(account_id),
                    "00000000-0000-0000-0000-000000000000",
                    master_org_name,
                    "",
                    "ikev2",
                    1,
                    str(user_id),
                    str(user_id),
                )
            ],
        )

        return {
            "account_id": str(account_id),
            "user_id": str(user_id),
            "company_name": company_name,
            "business_email": business_email,
            "name": full_name,
            "master_organization_id": str(org_id),
            "master_organization_name": master_org_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("create-owner-account failed")
        raise HTTPException(status_code=500, detail=f"Failed to create account: {e!s}")
