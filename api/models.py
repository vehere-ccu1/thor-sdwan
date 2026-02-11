"""
Shared Pydantic models and helpers for API. Used by main.py and page modules.
"""
from uuid import UUID

from pydantic import BaseModel


def row_to_dict(columns: list, row: tuple) -> dict:
    return dict(zip(columns, (str(x) if isinstance(x, UUID) else x for x in row)))


# ---------- Account ----------
class AccountCreate(BaseModel):
    name: str = ""
    billing_email: str
    country: str = ""
    notifications: bool = False


class AccountUpdate(BaseModel):
    name: str | None = None
    billing_email: str | None = None
    country: str | None = None
    notifications: bool | None = None
    owner_name: str | None = None
    owner_job_title: str | None = None


# ---------- Group ----------
class GroupCreate(BaseModel):
    account_id: str
    name: str
    parent_group_id: str | None = None


class GroupUpdate(BaseModel):
    name: str | None = None
    parent_group_id: str | None = None


# ---------- Organization ----------
class OrganizationCreate(BaseModel):
    account_id: str
    group_id: str | None = None
    name: str
    group_name: str = ""
    tunnel_key_exchange: str = "ikev2"
    is_default: bool = False


class OrganizationUpdate(BaseModel):
    group_id: str | None = None
    name: str | None = None
    group_name: str | None = None
    tunnel_key_exchange: str | None = None
    is_default: bool | None = None


# ---------- User ----------
class UserCreate(BaseModel):
    account_id: str
    email: str
    name: str = ""
    job_title: str = ""
    password_hash: str = ""
    role_id: str | None = None
    role: str | None = None  # role name: 'owner' | 'manager' | 'viewer'; resolved to role_id if role_id not set
    is_owner: bool = False
    enabled: bool = True
    organizations: list[str] = []  # organization IDs the user can access
    organization_group_ids: list[str] = []  # group IDs (all orgs in these groups are accessible)


class UserUpdate(BaseModel):
    name: str | None = None
    job_title: str | None = None
    role_id: str | None = None
    role: str | None = None  # role name: 'owner' | 'manager' | 'viewer'; resolved to role_id if present
    is_owner: bool | None = None
    enabled: bool | None = None
    organizations: list[str] | None = None  # when set, replaces user's organizations
    organization_group_ids: list[str] | None = None  # when set, replaces user's organization groups


# ---------- Permission ----------
class PermissionCreate(BaseModel):
    permission_to: str
    entity_id: str
    entity_name: str = ""
    role: str


class PermissionUpdate(BaseModel):
    entity_name: str | None = None
    role: str | None = None


# ---------- Token ----------
class TokenCreate(BaseModel):
    organization_id: str
    label: str = ""
