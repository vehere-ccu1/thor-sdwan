"""
MongoDB backend for Thor SD-WAN CMS API.
Provides execute(), execute_many(), get_client() by dispatching query patterns to native pymongo operations.
Documents use the same field names as SQL columns (id, email, account_id, etc.); id stored as string.
"""
import re
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from uuid import UUID

from config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER

_local = threading.local()


def _mongo_db():
    from pymongo import MongoClient
    from urllib.parse import quote_plus
    if not hasattr(_local, "mongo_db") or _local.mongo_db is None:
        uri = f"mongodb://{DB_HOST}:{DB_PORT}"
        if DB_USER or DB_PASSWORD:
            uri = f"mongodb://{quote_plus(DB_USER or '')}:{quote_plus(DB_PASSWORD or '')}@{DB_HOST}:{DB_PORT}"
        _local.mongo_client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        _local.mongo_db = _local.mongo_client[DB_NAME or "sdwan_cms"]
    return _local.mongo_db


def _normalize_query(q: str) -> str:
    q = re.sub(r"\s+", " ", q)
    q = re.sub(r"\s+FINAL\s+", " ", q, flags=re.IGNORECASE)
    q = re.sub(r"\s+FINAL$", "", q, flags=re.IGNORECASE)
    db_name = (DB_NAME or "sdwan_cms").strip().lower()
    q = re.sub(r"from\s+" + re.escape(db_name) + r"\.", " from ", q, flags=re.IGNORECASE)
    q = re.sub(r"insert\s+into\s+" + re.escape(db_name) + r"\.", "insert into ", q, flags=re.IGNORECASE)
    q = re.sub(r"alter\s+table\s+" + re.escape(db_name) + r"\.", "alter table ", q, flags=re.IGNORECASE)
    q = q.strip().lower()
    return q


def _doc_to_tuple(doc: dict | None, keys: list[str]) -> tuple:
    if doc is None:
        return ()
    return tuple(doc.get(k) for k in keys)


def _doc_to_tuple_list(docs: list, keys: list[str]) -> list[tuple]:
    return [_doc_to_tuple(d, keys) for d in docs]


# ---- SELECT handlers: (pattern_regex, (param_keys, result_columns, handler_fn))
# handler_fn(db, params) -> list[tuple]
def _select_user_by_email(db, params):
    doc = db.users.find_one({"email": params["email"]})
    if not doc:
        return []
    row = (
        str(doc.get("id")),
        doc.get("email"),
        doc.get("name"),
        doc.get("account_id"),
        doc.get("is_owner"),
        doc.get("enabled"),
        doc.get("password_hash"),
        doc.get("master_organization_name") if "master_organization_name" in (params or {}) else None,
    )
    # Login query returns: id, email, name, account_id, is_owner, enabled, password_hash
    return [(row[0], row[1], row[2], row[3], row[4], row[5], row[6])]


def _select_user_by_email_full(db, params):
    doc = db.users.find_one({"email": params["email"]})
    if not doc:
        return []
    return [(
        str(doc.get("id")),
        doc.get("email"),
        doc.get("name"),
        str(doc.get("account_id")) if doc.get("account_id") else None,
        1 if doc.get("is_owner") else 0,
        1 if doc.get("enabled") else 0,
        doc.get("password_hash"),
    )]


def _select_account_master_org(db, params):
    doc = db.accounts.find_one({"id": params["id"]})
    if not doc:
        return []
    return [(doc.get("master_organization_name") or "",)]


def _select_count(db, collection: str):
    def fn(db, params):
        n = db[collection].count_documents({})
        return [(n,)]
    return fn


def _select_user_account_owner(db, params):
    doc = db.users.find_one({"id": params["id"]})
    if not doc:
        return []
    return [(str(doc.get("account_id")), bool(doc.get("is_owner")))]


def _select_account_by_id(db, params):
    doc = db.accounts.find_one({"id": params["id"]})
    if not doc:
        return []
    return [(
        str(doc.get("id")),
        doc.get("name"),
        doc.get("billing_email"),
        doc.get("country"),
        doc.get("notifications"),
        doc.get("master_owner_user_id"),
    )]


def _select_user_name_job_by_email(db, params):
    doc = db.users.find_one({"email": params["email"]})
    if not doc:
        return []
    return [(doc.get("name") or "", doc.get("job_title") or "")]


def _select_user_full_by_email_for_reset(db, params):
    doc = db.users.find_one({"email": params["email"]})
    if not doc:
        return []
    return [(
        str(doc.get("id")),
        str(doc.get("account_id")) if doc.get("account_id") else None,
        doc.get("email"),
        doc.get("name") or "",
        doc.get("job_title") or "",
        str(doc.get("role_id")) if doc.get("role_id") else None,
        1 if doc.get("is_owner") else 0,
        1 if doc.get("enabled") else 0,
        str(doc.get("created_by_user_id")) if doc.get("created_by_user_id") else None,
        str(doc.get("master_owner_user_id")) if doc.get("master_owner_user_id") else None,
        doc.get("organizations") or [],
        doc.get("organization_group_ids") or [],
    )]


def _select_entity_id_from_user_permissions(db, params):
    """SELECT entity_id FROM user_permissions_final WHERE user_id = %(user_id)s AND permission_to = %(pt)s."""
    cursor = db.user_permissions.find({"user_id": params["user_id"], "permission_to": params["pt"], "deleted": 0})
    return [(doc.get("entity_id"),) for doc in cursor]


def _select_users_with_roles(db, params):
    """List users with role_name, permissions, account_billing_email (users_with_roles view). Optional account_id filter."""
    filt = {}
    if params.get("account_id"):
        filt["account_id"] = params["account_id"]
    # Role-based list: (account_id = req_account_id AND req_is_owner=1) OR (created_by_user_id = x_user_id)
    if "req_account_id" in params or "x_user_id" in params:
        req_owner = params.get("req_is_owner") == 1 or params.get("req_is_owner") == "1"
        if req_owner and params.get("req_account_id"):
            filt["account_id"] = params["req_account_id"]
        else:
            filt["created_by_user_id"] = params.get("x_user_id")
        if params.get("account_id"):
            filt["account_id"] = params["account_id"]
    cursor = db.users.find(filt).sort("email", 1)
    rows = []
    for u in cursor:
        role = db.roles.find_one({"id": u.get("role_id")}) if u.get("role_id") else None
        acc = db.accounts.find_one({"id": u.get("account_id")}) if u.get("account_id") else None
        rows.append((
            str(u.get("id")),
            u.get("email"),
            u.get("name"),
            u.get("job_title") or "",
            str(u.get("account_id")) if u.get("account_id") else None,
            u.get("entity_id"),
            1 if u.get("is_owner") else 0,
            1 if u.get("enabled") else 0,
            u.get("created_at"),
            u.get("updated_at"),
            (role.get("name") if role else None),
            (role.get("permissions") if role else None),
            (acc.get("billing_email") if acc else None),
            str(u.get("master_owner_user_id")) if u.get("master_owner_user_id") else None,
            str(u.get("created_by_user_id")) if u.get("created_by_user_id") else None,
            u.get("organizations") or [],
            u.get("organization_group_ids") or [],
        ))
    return rows


def _select_groups(db, params):
    """List groups. Optional account_id filter. GROUP_COLS order."""
    filt = {}
    if params.get("account_id"):
        filt["account_id"] = params["account_id"]
    cursor = db.groups.find(filt)
    return [
        (str(d.get("id")), str(d.get("account_id")) if d.get("account_id") else None, d.get("name"), d.get("created_at"), d.get("updated_at"), str(d.get("master_owner_user_id")) if d.get("master_owner_user_id") else None, str(d.get("created_by_user_id")) if d.get("created_by_user_id") else None, str(d.get("parent_group_id")) if d.get("parent_group_id") else None)
        for d in cursor
    ]


def _select_sites_with_account(db, params):
    """List sites with account_billing_email and group_name_resolved. Optional account_id filter. SITE_COLS order."""
    filt = {}
    if params.get("account_id"):
        filt["account_id"] = params["account_id"]
    cursor = db.sites.find(filt)
    rows = []
    for s in cursor:
        acc = db.accounts.find_one({"id": s.get("account_id")}) if s.get("account_id") else None
        grp = db.groups.find_one({"id": s.get("group_id")}) if s.get("group_id") else None
        master_owner = s.get("master_owner_user_id") or (acc.get("master_owner_user_id") if acc else None)
        rows.append((
            str(s.get("id")),
            str(s.get("account_id")) if s.get("account_id") else None,
            str(s.get("group_id")) if s.get("group_id") else None,
            s.get("name"),
            s.get("group_name") or "",
            s.get("tunnel_key_exchange") or "ikev2",
            1 if s.get("is_default") else 0,
            s.get("created_at"),
            s.get("updated_at"),
            str(master_owner) if master_owner else None,
            str(s.get("created_by_user_id")) if s.get("created_by_user_id") else None,
            (acc.get("billing_email") if acc else None),
            (grp.get("name") if grp else None),
        ))
    return rows


def _select_accounts_list(db, params):
    cursor = db.accounts.find({})
    if params.get("account_id"):
        cursor = db.accounts.find({"id": params["account_id"]})
    rows = []
    for doc in cursor:
        acc_id = str(doc.get("id"))
        master_owner = doc.get("master_owner_user_id")
        owner_doc = db.users.find_one({"id": master_owner}) if master_owner else None
        rows.append((
            acc_id,
            doc.get("name") or "",
            doc.get("billing_email"),
            doc.get("country") or "",
            doc.get("notifications") or 0,
            doc.get("created_at"),
            doc.get("updated_at"),
            (owner_doc.get("name") or "") if owner_doc else "",
            (owner_doc.get("job_title") or "") if owner_doc else "",
        ))
    if params.get("account_id"):
        return rows
    return sorted(rows, key=lambda r: (r[6] or datetime.min).isoformat() if hasattr(r[6], "isoformat") else str(r[6] or ""), reverse=True)


# Build dispatch: normalized query pattern -> (param_keys, handler)
def _build_select_handlers():
    return [
        (re.compile(r"select\s+1\s+from\s+users\s+where\s+email\s*=\s*%\(email\)s\s+limit\s+1"), ["email"], lambda db, p: [(1,)] if db.users.find_one({"email": p["email"]}) else []),
        (re.compile(r"select\s+id,email,name,account_id,is_owner,enabled,password_hash\s+from\s+users\s+where\s+email\s*="), ["email"], lambda db, p: _select_user_by_email_full(db, p)),
        (re.compile(r"select\s+.*\s+from\s+users\s+where\s+email\s*=\s*%\(email\)s\s+limit\s+1"), ["email"], lambda db, p: _select_user_by_email_full(db, p)),
        (re.compile(r"select\s+master_organization_name\s+from\s+accounts\s+where\s+id\s*="), ["id"], _select_account_master_org),
        (re.compile(r"select\s+count\(\)\s+from\s+accounts\s*$"), [], lambda db, p: [(db.accounts.count_documents({}),)]),
        (re.compile(r"select\s+count\(\)\s+from\s+users\s*$"), [], lambda db, p: [(db.users.count_documents({}),)]),
        (re.compile(r"select\s+count\(\)\s+from\s+sites\s*$"), [], lambda db, p: [(db.sites.count_documents({}),)]),
        (re.compile(r"select\s+account_id,is_owner\s+from\s+users\s+where\s+id\s*="), ["id"], _select_user_account_owner),
        (re.compile(r"select\s+id,name,billing_email,country,notifications,master_owner_user_id\s+from\s+accounts\s+where\s+id\s*="), ["id"], _select_account_by_id),
        (re.compile(r"select\s+1\s+from\s+accounts\s+where\s+id\s*="), ["id"], lambda db, p: [(1,)] if db.accounts.find_one({"id": p["id"]}) else []),
        (re.compile(r"select\s+name,job_title\s+from\s+.*users.*where.*email\s*=\s*%\(email\)s"), ["email"], _select_user_name_job_by_email),
        (re.compile(r"select\s+account_id\s+from\s+users\s+where\s+id\s*="), ["id"], lambda db, p: [(str(db.users.find_one({"id": p["id"]})["account_id"]),)] if db.users.find_one({"id": p["id"]}) else []),
        (re.compile(r"select\s+master_owner_user_id\s+from\s+accounts\s+where\s+id\s*="), ["id"], lambda db, p: [(str(db.accounts.find_one({"id": p["id"]})["master_owner_user_id"]),)] if db.accounts.find_one({"id": p["id"]}) else []),
        (re.compile(r"select\s+id\s+from\s+users\s+where\s+email\s*="), ["email"], lambda db, p: [(str(db.users.find_one({"email": p["email"]})["id"]),)] if db.users.find_one({"email": p["email"]}) else []),
        (re.compile(r"select\s+id,account_id,email,name,job_title,role_id,is_owner,enabled,created_by_user_id,master_owner_user_id,organizations,organization_group_ids\s+from\s+users\s+where\s+email"), ["email"], lambda db, p: _select_user_full_by_email_for_reset(db, p)),
        (re.compile(r"select\s+a\.id.*a\.name.*billing_email.*owner_name.*owner_job_title.*from.*accounts"), [], _select_accounts_list),
        (re.compile(r"select\s+entity_id\s+from\s+user_permissions_final\s+where\s+user_id\s*=\s*%\(user_id\)s\s+and\s+permission_to\s*=\s*%\(pt\)s"), ["user_id", "pt"], _select_entity_id_from_user_permissions),
        (re.compile(r"select\s+id,email,name,job_title,account_id,entity_id,is_owner,enabled,created_at,updated_at,role_name,permissions,account_billing_email,master_owner_user_id,created_by_user_id,organizations,organization_group_ids\s+from\s+users_with_roles"), ["account_id"], _select_users_with_roles),
        (re.compile(r"where\s+\(\(u\.account_id\s*=\s*%\(req_account_id\)s\s+and\s+%\(req_is_owner\)s\s*=\s*1\)\s+or\s+\(u\.created_by_user_id\s*=\s*%\(x_user_id\)s\)\)"), ["req_account_id", "req_is_owner", "x_user_id", "account_id"], _select_users_with_roles),
        (re.compile(r"select\s+id,account_id,name,created_at,updated_at,master_owner_user_id,created_by_user_id,parent_group_id\s+from\s+groups"), ["account_id"], _select_groups),
        (re.compile(r"select\s+id,account_id,group_id,name,group_name,tunnel_key_exchange,is_default,created_at,updated_at,master_owner_user_id,created_by_user_id,account_billing_email,group_name_resolved\s+from\s+sites_with_account"), ["account_id"], _select_sites_with_account),
    ]


_SELECT_HANDLERS = _build_select_handlers()


def execute(query: str, params: dict | None = None) -> list:
    """Execute a SELECT-like query by dispatching to MongoDB operations. Returns list of tuples."""
    params = params or {}
    q = _normalize_query(query)
    db = _mongo_db()
    for pattern, param_keys, handler in _SELECT_HANDLERS:
        if pattern.search(q):
            try:
                return handler(db, params) or []
            except Exception:
                raise
    # Fallback: try generic find by parsing simple "select ... from collection where field = %(field)s"
    m = re.search(r"select\s+(.+?)\s+from\s+(\w+)\s+where\s+(.+?)(?:\s+limit\s+(\d+))?$", q, re.IGNORECASE | re.DOTALL)
    if m:
        cols = [x.strip().split()[-1] for x in m.group(1).split(",")]
        coll = m.group(2)
        limit = int(m.group(4)) if m.group(4) else 0
        filter_dict = {}
        for k in params:
            if f"%({k})s" in q or f"%({k})s" in query:
                filter_dict[k] = params[k]
        if filter_dict and coll in db.list_collection_names():
            cursor = db[coll].find(filter_dict)
            if limit:
                cursor = cursor.limit(limit)
            return _doc_to_tuple_list(list(cursor), cols)
    raise NotImplementedError(f"MongoDB backend: no handler for query pattern: {q[:200]}")


def execute_many(query: str, rows: list[tuple]) -> None:
    """Execute INSERT by dispatching to MongoDB insert_many/replace."""
    q = _normalize_query(query)
    db = _mongo_db()
    if "insert into accounts" in q:
        for row in rows:
            # (id, name, billing_email[, master_owner_user_id, master_organization_name, country, notifications])
            doc = {"id": str(row[0]), "name": row[1] or "", "billing_email": row[2], "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
            if len(row) >= 7:
                doc["master_owner_user_id"] = str(row[3]) if row[3] else None
                doc["master_organization_name"] = row[4] or ""
                doc["country"] = row[5] or ""
                doc["notifications"] = row[6]
            elif len(row) >= 5:
                doc["country"] = row[3] or ""
                doc["notifications"] = row[4]
            db.accounts.replace_one({"id": doc["id"]}, doc, upsert=True)
        return
    if "insert into users" in q:
        for row in rows:
            doc = {"id": str(row[0]), "account_id": str(row[1]), "email": row[2], "name": row[3] or "", "password_hash": row[4] or "", "role_id": str(row[5]) if row[5] else None, "is_owner": row[6], "enabled": row[7], "master_owner_user_id": str(row[8]) if len(row) > 8 else None, "created_by_user_id": str(row[9]) if len(row) > 9 else None, "organizations": row[10] if len(row) > 10 else [], "organization_group_ids": row[11] if len(row) > 11 else [], "job_title": row[12] if len(row) > 12 else ""}
            db.users.replace_one({"id": doc["id"]}, doc, upsert=True)
        return
    if "insert into groups" in q:
        for row in rows:
            db.groups.replace_one({"id": str(row[0])}, {"id": str(row[0]), "account_id": str(row[1]), "name": row[2], "master_owner_user_id": str(row[3]) if row[3] else None, "created_by_user_id": str(row[4]) if row[4] else None, "parent_group_id": str(row[5]) if len(row) > 5 and row[5] else None, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}, upsert=True)
        return
    if "insert into sites" in q:
        for row in rows:
            db.sites.replace_one({"id": str(row[0])}, {"id": str(row[0]), "account_id": str(row[1]), "group_id": str(row[2]), "name": row[3], "group_name": row[4] or "", "tunnel_key_exchange": row[5] or "ikev2", "is_default": row[6], "master_owner_user_id": str(row[7]) if row[7] else None, "created_by_user_id": str(row[8]) if row[8] else None, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}, upsert=True)
        return
    if "insert into organization_tokens" in q:
        for row in rows:
            db.organization_tokens.replace_one({"id": str(row[0])}, {"id": str(row[0]), "organization_id": str(row[1]), "token_secret": row[2], "label": row[3] or "", "revoked": row[4], "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}, upsert=True)
        return
    raise NotImplementedError(f"MongoDB backend: no execute_many handler for: {q[:150]}")


class _MongoClient:
    """Fake client for DELETE operations (ALTER TABLE ... DELETE WHERE)."""

    def execute(self, query: str, params: dict | None = None):
        q = re.sub(r"\s+", " ", query).strip().lower()
        params = params or {}
        db = _mongo_db()
        if "alter table" in q and "delete where" in q:
            if "organization_tokens" in q and "organization_id" in q:
                ids = params.get("org_ids") or []
                if ids:
                    db.organization_tokens.delete_many({"organization_id": {"$in": [str(x) for x in ids]}})
            elif "sites" in q and "account_id" in q:
                db.sites.delete_many({"account_id": params.get("account_id")})
            elif "groups" in q and "account_id" in q:
                db.groups.delete_many({"account_id": params.get("account_id")})
            elif "groups" in q and "id" in q:
                db.groups.delete_many({"id": params.get("id")})
            elif "user_permissions" in q and "user_id" in q:
                uid = params.get("user_ids") or params.get("id")
                if isinstance(uid, (list, tuple)):
                    db.user_permissions.delete_many({"user_id": {"$in": [str(x) for x in uid]}})
                else:
                    db.user_permissions.delete_many({"user_id": str(uid)})
            elif "users" in q and "account_id" in q:
                db.users.delete_many({"account_id": params.get("account_id") or params.get("id")})
            elif "users" in q and "id" in q:
                db.users.delete_many({"id": params.get("id")})
            elif "accounts" in q:
                db.accounts.delete_many({"id": params.get("id")})
            elif "sites" in q and "id" in q:
                db.sites.delete_many({"id": params.get("id")})
            return
        raise NotImplementedError(f"MongoDB client.execute: no handler for: {q[:150]}")


def get_client():
    if not hasattr(_local, "mongo_client_wrapper") or _local.mongo_client_wrapper is None:
        _local.mongo_client_wrapper = _MongoClient()
    return _local.mongo_client_wrapper


@contextmanager
def connection():
    yield _mongo_db()  # MongoDB uses the same db for "connection"
