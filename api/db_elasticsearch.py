"""
Elasticsearch backend for Thor SD-WAN CMS API.
Provides execute(), execute_many(), get_client() by dispatching query patterns to native ES operations.
Uses one index per collection: {DB_NAME}_users, {DB_NAME}_accounts, etc.
"""
import re
import threading
from contextlib import contextmanager
from datetime import datetime, timezone

from config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_SCHEME, DB_USER, DB_VERIFY_SSL

_local = threading.local()
_INDEX_PREFIX = (DB_NAME or "sdwan_cms").lower().replace(" ", "_")


def _es_client():
    from elasticsearch import Elasticsearch
    if not hasattr(_local, "es_client") or _local.es_client is None:
        url = f"{DB_SCHEME}://{DB_HOST}:{DB_PORT}"
        # 7.x API: hosts list, http_auth, verify_certs, timeout (plain application/json, no 406)
        kwargs = {"verify_certs": DB_VERIFY_SSL, "timeout": 30}
        if DB_USER or DB_PASSWORD:
            kwargs["http_auth"] = (DB_USER or "", DB_PASSWORD or "")
        _local.es_client = Elasticsearch([url], **kwargs)
    return _local.es_client


def _index(collection: str) -> str:
    return f"{_INDEX_PREFIX}_{collection}"


def _normalize_query(q: str) -> str:
    q = re.sub(r"\s+", " ", q)
    q = re.sub(r"\s+FINAL\s+", " ", q, flags=re.IGNORECASE)
    q = re.sub(r"\s+FINAL$", "", q, flags=re.IGNORECASE)
    db = re.escape(DB_NAME or "sdwan_cms")
    q = re.sub(r"from\s+" + db + r"\.", " from ", q, flags=re.IGNORECASE)
    q = re.sub(r"into\s+" + db + r"\.", " into ", q, flags=re.IGNORECASE)
    q = re.sub(r"\s+", " ", q).strip().lower()  # collapse spaces again after replacements
    return q


def _doc_to_tuple(doc: dict | None, source: dict, keys: list[str]) -> tuple:
    if not doc or "_source" not in doc:
        return ()
    s = doc["_source"]
    return tuple(s.get(k) for k in keys)


def execute(query: str, params: dict | None = None) -> list:
    """Execute SELECT by dispatching to Elasticsearch search. Returns list of tuples."""
    params = params or {}
    q = _normalize_query(query)
    es = _es_client()
    # Login: select from users where email = %(email)s limit 1 (require param placeholder so list_users does not match)
    if "select" in q and "from" in q and "users" in q and "%(email)s" in q and "limit 1" in q:
        r = es.search(index=_index("users"), body={"query": {"term": {"email": params["email"]}}, "size": 1})
        hits = r.get("hits", {}).get("hits", [])
        if not hits:
            return []
        s = hits[0]["_source"]
        return [(
            s.get("id"),
            s.get("email"),
            s.get("name"),
            s.get("account_id"),
            s.get("is_owner"),
            s.get("enabled"),
            s.get("password_hash"),
        )]
    # master_organization_name from accounts
    if "select" in q and "master_organization_name" in q and "accounts" in q and "id" in q:
        r = es.search(index=_index("accounts"), body={"query": {"term": {"id": params["id"]}}, "size": 1})
        hits = r.get("hits", {}).get("hits", [])
        if not hits:
            return []
        return [(hits[0]["_source"].get("master_organization_name") or "",)]
    # master_owner_user_id from accounts where id (create_group, create_site, etc.)
    if "select" in q and "master_owner_user_id" in q and "accounts" in q and "%(id)s" in q:
        r = es.search(index=_index("accounts"), body={"query": {"term": {"id": params["id"]}}, "size": 1})
        hits = r.get("hits", {}).get("hits", [])
        if not hits:
            return []
        return [(hits[0]["_source"].get("master_owner_user_id"),)]
    # count() from accounts/users/sites
    if "select" in q and "count()" in q and "from" in q:
        if "accounts" in q:
            r = es.count(index=_index("accounts"))
            return [(r.get("count", 0),)]
        if "users" in q:
            r = es.count(index=_index("users"))
            return [(r.get("count", 0),)]
        if "sites" in q:
            r = es.count(index=_index("sites"))
            return [(r.get("count", 0),)]
    # select 1 from users where email (exists check; require %(email)s so list_users does not match)
    if "select" in q and "1" in q and "users" in q and "%(email)s" in q:
        r = es.search(index=_index("users"), body={"query": {"term": {"email": params["email"]}}, "size": 1})
        return [(1,)] if r.get("hits", {}).get("hits") else []
    # account_id, is_owner from users where id (require %(id)s so list_users/join query does not match)
    if "select" in q and "account_id" in q and "is_owner" in q and "users" in q and "%(id)s" in q:
        r = es.search(index=_index("users"), body={"query": {"term": {"id": params["id"]}}, "size": 1})
        hits = r.get("hits", {}).get("hits", [])
        if not hits:
            return []
        s = hits[0]["_source"]
        return [(s.get("account_id"), s.get("is_owner"))]
    # name, job_title from users where email (list_accounts owner fallback)
    if "select" in q and "name" in q and "job_title" in q and "users" in q and "%(email)s" in q:
        r = es.search(index=_index("users"), body={"query": {"term": {"email": params["email"]}}, "size": 1})
        hits = r.get("hits", {}).get("hits", [])
        if not hits:
            return []
        s = hits[0]["_source"]
        return [(s.get("name") or "", s.get("job_title") or "")]
    # account_id from users where id (list_accounts requester)
    if "select" in q and "account_id" in q and "from" in q and "users" in q and "%(id)s" in q:
        r = es.search(index=_index("users"), body={"query": {"term": {"id": params["id"]}}, "size": 1})
        hits = r.get("hits", {}).get("hits", [])
        if not hits:
            return []
        return [(hits[0]["_source"].get("account_id"),)]
    # accounts list with owner (join accounts + users): a.id, a.name, billing_email, country, notifications, created_at, updated_at, owner_name, owner_job_title
    if "select" in q and "a.id" in q and "billing_email" in q and "owner_name" in q and "accounts" in q and "left join" in q and "users" in q:
        account_id_param = params.get("account_id")
        if account_id_param is not None:
            r = es.search(index=_index("accounts"), body={"query": {"term": {"id": str(account_id_param)}}, "size": 1})
        else:
            r = es.search(index=_index("accounts"), body={"query": {"match_all": {}}, "size": 500, "sort": [{"created_at": {"order": "desc"}}]})
        hits = r.get("hits", {}).get("hits", [])
        out = []
        for h in hits:
            src = h.get("_source", {})
            uid = src.get("master_owner_user_id")
            owner_name = ""
            owner_job_title = ""
            if uid:
                ru = es.search(index=_index("users"), body={"query": {"term": {"id": str(uid)}}, "size": 1})
                uhits = ru.get("hits", {}).get("hits", [])
                if uhits:
                    u = uhits[0]["_source"]
                    owner_name = (u.get("name") or "") or ""
                    owner_job_title = (u.get("job_title") or "") or ""
            out.append((
                src.get("id"),
                src.get("name") or "",
                src.get("billing_email") or "",
                src.get("country") or "",
                src.get("notifications"),
                src.get("created_at"),
                src.get("updated_at"),
                owner_name,
                owner_job_title,
            ))
        return out
    # List users: users_with_roles (WHERE account_id = %(account_id)s) or JOIN query with req_account_id/x_user_id
    if ("users_with_roles" in q) or ("left join" in q and "roles" in q and "accounts" in q and "users" in q and ("req_account_id" in q or "x_user_id" in q)):
        account_id_filter = params.get("account_id")
        req_account_id = params.get("req_account_id") or ""
        req_is_owner = params.get("req_is_owner") or 0
        x_user_id = params.get("x_user_id") or ""
        if "users_with_roles" in q:
            if account_id_filter:
                r = es.search(index=_index("users"), body={"query": {"term": {"account_id": str(account_id_filter)}}, "size": 500, "sort": [{"email": "asc"}]})
            else:
                r = es.search(index=_index("users"), body={"query": {"match_all": {}}, "size": 500, "sort": [{"email": "asc"}]})
        else:
            should_clauses = [{"term": {"created_by_user_id": str(x_user_id)}}]
            if req_is_owner and req_account_id:
                should_clauses.insert(0, {"bool": {"must": [{"term": {"account_id": str(req_account_id)}}, {"term": {"is_owner": 1}}]}})
            if account_id_filter:
                bool_q = {"must": [{"term": {"account_id": str(account_id_filter)}}, {"bool": {"should": should_clauses, "minimum_should_match": 1}}]}
            else:
                bool_q = {"should": should_clauses, "minimum_should_match": 1}
            r = es.search(index=_index("users"), body={"query": {"bool": bool_q}, "size": 500, "sort": [{"email": "asc"}]})
        hits = r.get("hits", {}).get("hits", [])
        out = []
        for h in hits:
            s = h.get("_source", {})
            aid = s.get("account_id")
            account_billing_email = ""
            if aid:
                ra = es.search(index=_index("accounts"), body={"query": {"term": {"id": str(aid)}}, "size": 1})
                ahits = ra.get("hits", {}).get("hits", [])
                if ahits:
                    account_billing_email = ahits[0].get("_source", {}).get("billing_email") or ""
            out.append((
                s.get("id"),
                s.get("email") or "",
                s.get("name") or "",
                s.get("job_title") or "",
                s.get("account_id") or "",
                s.get("entity_id") or s.get("account_id") or "",
                s.get("is_owner"),
                s.get("enabled"),
                s.get("created_at"),
                s.get("updated_at"),
                s.get("role_name") or "",
                s.get("permissions") or [],
                account_billing_email,
                s.get("master_owner_user_id"),
                s.get("created_by_user_id"),
                s.get("organizations") or [],
                s.get("organization_group_ids") or [],
            ))
        return out
    # List groups: select ... from groups where account_id = %(account_id)s (or no where)
    if "from" in q and "groups" in q and "account_id" in q and "name" in q:
        account_id_filter = params.get("account_id")
        if account_id_filter:
            r = es.search(index=_index("groups"), body={"query": {"term": {"account_id": str(account_id_filter)}}, "size": 500})
        else:
            r = es.search(index=_index("groups"), body={"query": {"match_all": {}}, "size": 500})
        hits = r.get("hits", {}).get("hits", [])
        out = []
        for h in hits:
            s = h.get("_source", {})
            out.append((
                s.get("id"),
                s.get("account_id") or "",
                s.get("name") or "",
                s.get("created_at"),
                s.get("updated_at"),
                s.get("master_owner_user_id"),
                s.get("created_by_user_id"),
                s.get("parent_group_id"),
            ))
        return out
    # List sites (sites_with_account): select ... from sites_with_account where account_id = %(account_id)s
    if ("sites_with_account" in q or ("from" in q and "sites" in q and "group_name_resolved" in q)) or ("from" in q and "sites" in q and "account_id" in q and "group_id" in q):
        account_id_filter = params.get("account_id")
        if account_id_filter:
            r = es.search(index=_index("sites"), body={"query": {"term": {"account_id": str(account_id_filter)}}, "size": 500})
        else:
            r = es.search(index=_index("sites"), body={"query": {"match_all": {}}, "size": 500})
        hits = r.get("hits", {}).get("hits", [])
        out = []
        for h in hits:
            s = h.get("_source", {})
            account_billing_email = ""
            aid = s.get("account_id")
            if aid:
                ra = es.search(index=_index("accounts"), body={"query": {"term": {"id": str(aid)}}, "size": 1})
                ahits = ra.get("hits", {}).get("hits", [])
                if ahits:
                    account_billing_email = ahits[0].get("_source", {}).get("billing_email") or ""
            group_name_resolved = ""
            gid = s.get("group_id")
            if gid:
                rg = es.search(index=_index("groups"), body={"query": {"term": {"id": str(gid)}}, "size": 1})
                ghits = rg.get("hits", {}).get("hits", [])
                if ghits:
                    group_name_resolved = ghits[0].get("_source", {}).get("name") or ""
            out.append((
                s.get("id"),
                s.get("account_id") or "",
                s.get("group_id") or "",
                s.get("name") or "",
                s.get("group_name") or "",
                s.get("tunnel_key_exchange") or "ikev2",
                s.get("is_default"),
                s.get("created_at"),
                s.get("updated_at"),
                s.get("master_owner_user_id"),
                s.get("created_by_user_id"),
                account_billing_email,
                group_name_resolved,
            ))
        return out
    # user_permissions_final: select entity_id where user_id = %(user_id)s and permission_to = %(pt)s
    if "entity_id" in q and "user_permissions" in q and "%(user_id)s" in q and ("%(pt)s" in q or "permission_to" in q):
        r = es.search(
            index=_index("user_permissions"),
            body={
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"user_id": str(params.get("user_id", ""))}},
                            {"term": {"permission_to": str(params.get("pt", ""))}},
                        ]
                    }
                },
                "size": 500,
            },
        )
        hits = r.get("hits", {}).get("hits", [])
        return [(h.get("_source", {}).get("entity_id"),) for h in hits]
    # permission_to, entity_id from user_permissions where user_id and role (audit_trail _get_user_context)
    if "permission_to" in q and "entity_id" in q and "user_permissions" in q and "%(user_id)s" in q and "role" in q:
        r = es.search(
            index=_index("user_permissions"),
            body={"query": {"term": {"user_id": str(params.get("user_id", ""))}}, "size": 500},
        )
        hits = r.get("hits", {}).get("hits", [])
        return [(h.get("_source", {}).get("permission_to"), h.get("_source", {}).get("entity_id")) for h in hits]
    # audit_trail: select id, ts, user_id, user_email, action, resource, resource_id, details, ip, user_agent, account_id, organization_id [WHERE ...] order by ts desc limit 1000
    if "audit_trail" in q and "ts" in q and "user_id" in q:
        must = []
        if params.get("viewer_user_id") is not None or params.get("viewer_account_id") is not None or params.get("permitted_org_ids"):
            should = []
            if params.get("viewer_user_id") is not None:
                should.append({"term": {"user_id": str(params["viewer_user_id"])}})
            if params.get("viewer_account_id") is not None:
                should.append({"term": {"account_id": str(params["viewer_account_id"])}})
            if params.get("permitted_org_ids"):
                should.append({"terms": {"organization_id": [str(x) for x in params["permitted_org_ids"]]}})
            if should:
                must.append({"bool": {"should": should, "minimum_should_match": 1}})
        if params.get("date_from"):
            must.append({"range": {"ts": {"gte": params["date_from"]}}})
        if params.get("date_to"):
            must.append({"range": {"ts": {"lte": params["date_to"]}}})
        if params.get("action"):
            must.append({"term": {"action": str(params["action"])}})
        if params.get("resource"):
            must.append({"term": {"resource": str(params["resource"])}})
        body = {"size": 1000, "sort": [{"ts": {"order": "desc"}}]}
        body["query"] = {"bool": {"must": must}} if must else {"match_all": {}}
        r = es.search(index=_index("audit_trail"), body=body)
        hits = r.get("hits", {}).get("hits", [])
        out = []
        for h in hits:
            s = h.get("_source", {})
            out.append((
                s.get("id"),
                s.get("ts"),
                s.get("user_id"),
                s.get("user_email"),
                s.get("action"),
                s.get("resource"),
                s.get("resource_id"),
                s.get("details"),
                s.get("ip"),
                s.get("user_agent"),
                s.get("account_id"),
                s.get("organization_id"),
            ))
        return out
    # Fallback: raise so we can add more handlers
    raise NotImplementedError(f"Elasticsearch backend: no handler for query: {q[:200]}")


def execute_many(query: str, rows: list[tuple]) -> None:
    """Execute INSERT by dispatching to Elasticsearch index/update."""
    q = _normalize_query(query)
    es = _es_client()
    if "insert into accounts" in q:
        # Columns: id, name, billing_email, master_owner_user_id, master_organization_name, country, notifications
        for row in rows:
            doc = {
                "id": str(row[0]),
                "name": row[1] or "",
                "billing_email": row[2],
                "master_owner_user_id": str(row[3]) if len(row) > 3 and row[3] else None,
                "master_organization_name": (row[4] or "") if len(row) > 4 else "",
                "country": (row[5] or "") if len(row) > 5 else "",
                "notifications": row[6] if len(row) > 6 else 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            es.index(index=_index("accounts"), id=str(row[0]), body=doc)
        return
    if "insert into users" in q:
        for row in rows:
            doc = {"id": str(row[0]), "account_id": str(row[1]), "email": row[2], "name": row[3] or "", "password_hash": row[4] or "", "role_id": str(row[5]) if row[5] else None, "is_owner": row[6], "enabled": row[7], "master_owner_user_id": str(row[8]) if len(row) > 8 else None, "created_by_user_id": str(row[9]) if len(row) > 9 else None, "organizations": row[10] if len(row) > 10 else [], "organization_group_ids": row[11] if len(row) > 11 else [], "job_title": row[12] if len(row) > 12 else ""}
            es.index(index=_index("users"), id=str(row[0]), body=doc)
        return
    if "insert into groups" in q:
        for row in rows:
            doc = {"id": str(row[0]), "account_id": str(row[1]), "name": row[2], "master_owner_user_id": str(row[3]) if row[3] else None, "created_by_user_id": str(row[4]) if row[4] else None, "parent_group_id": str(row[5]) if len(row) > 5 and row[5] else None}
            es.index(index=_index("groups"), id=str(row[0]), body=doc)
        return
    if "insert into sites" in q:
        for row in rows:
            doc = {"id": str(row[0]), "account_id": str(row[1]), "group_id": str(row[2]), "name": row[3], "group_name": row[4] or "", "tunnel_key_exchange": row[5] or "ikev2", "is_default": row[6], "master_owner_user_id": str(row[7]) if row[7] else None, "created_by_user_id": str(row[8]) if row[8] else None}
            es.index(index=_index("sites"), id=str(row[0]), body=doc)
        return
    if "insert into organization_tokens" in q:
        for row in rows:
            doc = {"id": str(row[0]), "organization_id": str(row[1]), "token_secret": row[2], "label": row[3] or "", "revoked": row[4]}
            es.index(index=_index("organization_tokens"), id=str(row[0]), body=doc)
        return
    raise NotImplementedError(f"Elasticsearch backend: no execute_many handler: {q[:150]}")


class _ESClient:
    """Fake client for DELETE operations."""

    def execute(self, query: str, params: dict | None = None):
        es = _es_client()
        params = params or {}
        q = re.sub(r"\s+", " ", query).lower()
        if "organization_tokens" in q and "organization_id" in q:
            ids = params.get("org_ids") or []
            if ids:
                es.delete_by_query(index=_index("organization_tokens"), body={"query": {"terms": {"organization_id": [str(x) for x in ids]}}})
        elif "sites" in q and "account_id" in q:
            es.delete_by_query(index=_index("sites"), body={"query": {"term": {"account_id": params.get("account_id")}}})
        elif "groups" in q and "account_id" in q:
            es.delete_by_query(index=_index("groups"), body={"query": {"term": {"account_id": params.get("account_id")}}})
        elif "groups" in q and "id" in q:
            es.delete_by_query(index=_index("groups"), body={"query": {"term": {"id": params.get("id")}}})
        elif "user_permissions" in q:
            uid = params.get("user_ids") or params.get("id")
            if isinstance(uid, (list, tuple)):
                es.delete_by_query(index=_index("user_permissions"), body={"query": {"terms": {"user_id": [str(x) for x in uid]}}})
            else:
                es.delete_by_query(index=_index("user_permissions"), body={"query": {"term": {"user_id": str(uid)}}})
        elif "users" in q and "account_id" in q:
            es.delete_by_query(index=_index("users"), body={"query": {"term": {"account_id": params.get("account_id") or params.get("id")}}})
        elif "users" in q and "id" in q:
            es.delete_by_query(index=_index("users"), body={"query": {"term": {"id": params.get("id")}}})
        elif "accounts" in q:
            es.delete_by_query(index=_index("accounts"), body={"query": {"term": {"id": params.get("id")}}})
        elif "sites" in q and "id" in q:
            es.delete_by_query(index=_index("sites"), body={"query": {"term": {"id": params.get("id")}}})
        else:
            raise NotImplementedError(f"ES client.execute: no handler: {q[:150]}")


def get_client():
    if not hasattr(_local, "es_client_wrapper") or _local.es_client_wrapper is None:
        _local.es_client_wrapper = _ESClient()
    return _local.es_client_wrapper


@contextmanager
def connection():
    yield _es_client()
