#!/usr/bin/env bash
# Create Elasticsearch index for Thor SD-WAN CMS (manual).
# Usage: ./db/elasticsearch/create_index.sh [index_name] [host:port]
# Default index_name=sdwan_cms, host:port=localhost:9200

INDEX="${1:-sdwan_cms}"
HOST="${2:-localhost:9200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

curl -s -X PUT "http://${HOST}/${INDEX}" \
  -H 'Content-Type: application/json' \
  -d @"${SCRIPT_DIR}/index_mapping.json"
