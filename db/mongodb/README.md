# MongoDB schema for Thor SD-WAN CMS

When `db_type=mongodb` in API config, schema sync on startup creates the collections listed in `collections.txt`. Collections are created empty; indexes can be added via `create_indexes.js`.

**Files:**
- `collections.txt` – list of collection names (one per line)
- `create_indexes.js` – optional MongoDB shell script to create indexes
- `create_collections.js` – optional MongoDB shell script to create collections

**Config:** `db_type`, `db_host`, `db_port`, `db_name`, `db_user`, `db_password`. Default port 27017.

**Manual run (MongoDB shell):**
```bash
mongosh --host localhost --port 27017 sdwan_cms < db/mongodb/create_indexes.js
```
