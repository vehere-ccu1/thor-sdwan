# Inspect users table (debug role / duplicates)

## 1. Via API (no ClickHouse client needed)

With the API running and a valid session, open in browser or use curl:

```bash
# Replace USER_ID with the actual user UUID (e.g. from the Users page or network tab)
curl -s "http://localhost:3443/sdwan_cms_api/users/USER_ID/debug" -H "X-User-Id: YOUR_LOGGED_IN_USER_ID"
```

Or in the browser (while logged in), the frontend may not send `X-User-Id` for GET; if you get 401/403, use curl and pass the header. Get `YOUR_LOGGED_IN_USER_ID` from sessionStorage: `sessionStorage.getItem('sdwan_cms_user_id')`.

Example (replace IDs):

```bash
curl -s "http://localhost:3443/sdwan_cms_api/users/550e8400-e29b-41d4-a716-446655440000/debug" \
  -H "X-User-Id: $(echo 'paste-your-owner-user-id-here')"
```

Response shows:

- **raw_rows**: all rows for that user (without FINAL) – so you see duplicates, each `role_id` and `updated_at`
- **final_row**: the single row the app uses (with FINAL)
- **roles**: list of role `id` and `name` (Viewer = 55555555-..., Manager = 44444444-...)

## 2. Via ClickHouse client

From project root, using default DB `sdwan_cms` and native port `9000`:

```bash
# Default (no password)
clickhouse-client --database sdwan_cms -q "
  SELECT id, email, name, role_id, is_owner, updated_at
  FROM users
  WHERE email = 'the-user@example.com'
  ORDER BY updated_at DESC
"

# With password (if set in api/resource/config.json or CLICKHOUSE_PASSWORD)
clickhouse-client --database sdwan_cms --password 'pk@123' -q "
  SELECT id, email, name, role_id, is_owner, updated_at
  FROM users
  WHERE email = 'the-user@example.com'
  ORDER BY updated_at DESC
"
```

To see **all rows** (including duplicates) for one user by id:

```bash
clickhouse-client --database sdwan_cms -q "
  SELECT id, email, name, role_id, toString(updated_at) AS updated_at
  FROM users
  WHERE id = 'USER_UUID_HERE'
  ORDER BY updated_at DESC
"
```

To see which role_id is Viewer/Manager:

```bash
clickhouse-client --database sdwan_cms -q "SELECT id, name FROM roles FINAL"
```

Expected: Viewer = `55555555-5555-5555-5555-555555555555`, Manager = `44444444-4444-4444-4444-444444444444`.

---

## Blank output from `SELECT ... FROM roles`?

Blank output usually means the **roles table is empty** (seed not applied). Check and fix:

```bash
# 1. See if the table exists and how many rows it has
clickhouse-client --database sdwan_cms -q "SELECT count() FROM roles"

# 2. If it returns 0, run the seed (creates Owner, Manager, Viewer roles)
clickhouse-client --database sdwan_cms --multiquery < db/05_seed_admin.sql
```

If you use a password (e.g. from `api/resource/config.json`):

```bash
clickhouse-client --database sdwan_cms --password 'pk@123' -q "SELECT count() FROM roles"
clickhouse-client --database sdwan_cms --password 'pk@123' --multiquery < db/05_seed_admin.sql
```

Run the seed from the **project root** so the path `db/05_seed_admin.sql` is correct. After the seed, `SELECT id, name FROM roles FINAL` should return three rows (Owner, Manager, Viewer).
