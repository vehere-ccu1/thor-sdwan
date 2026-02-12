# Elasticsearch schema for Thor SD-WAN CMS

When `db_type=elasticsearch` in API config, schema sync on startup creates the index using the mappings in `index_mapping.json`.

**Files:**
- `index_mapping.json` – index mapping and settings (used by API schema_sync)
- `create_index.sh` – optional manual script to create the index via curl

**Config:** `db_type`, `db_host`, `db_port`, `db_name`, `db_user`, `db_password`. Default port 9200.

**Manual create (index name = db_name, default sdwan_cms):**
```bash
curl -X PUT "http://localhost:9200/sdwan_cms" -H 'Content-Type: application/json' -d @db/elasticsearch/index_mapping.json
```
