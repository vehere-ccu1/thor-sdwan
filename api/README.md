# Thor SD-WAN CMS – API

Runs on the API server. Stores Account, Group, Organization, and User data in ClickHouse.

## Setup

```bash
cd api
./setup_vdev.sh
source vdev/bin/activate
```

## Run API (Account & Users)

From the `api` directory (so `config` and `db` resolve):

```bash
cd api
source vdev/bin/activate
export CLICKHOUSE_HOST=localhost   # optional, default localhost
export CLICKHOUSE_PORT=9000       # optional
uvicorn main:app --host 0.0.0.0 --port 3443
```

**API prefix:** `sdwan_cms_api`. All routes are under `/sdwan_cms_api/` (e.g. `GET/POST /sdwan_cms_api/accounts`, `GET /sdwan_cms_api/health`). The agent API uses prefix `sdwan_agent_api` (separate service).

Apply the ClickHouse schema first (see project `db/README.md`): run `01_schema.sql` then `02_schema_accounts.sql`.

Dependencies are in `api/requirements.txt`. For the agent (runs on other machines), use the `agent/` folder and `agent/vdev`.
