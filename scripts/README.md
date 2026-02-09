# Scripts

- **api_start.sh** / **api_start.bat** – start the API (Python FastAPI with uvicorn on port 3443). Requires `api/vdev` (run `cd api && ./setup_vdev.sh` first). Optional env: `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`.
- **gui_start.sh** / **gui_start.bat** – start the GUI (Vite dev server)

## If npm fails for the GUI (e.g. "Cannot find module .../npm-prefix.js")

Your system npm may be broken. Use a working Node/npm for the GUI only:

1. **Option A – `run-with-node`**  
   Edit `scripts/run-with-node` and set `NODE_DIR` to the directory that contains your working `node` and `npm`.  
   `gui_start.sh` sources this file when present.

2. **Option B – environment variable**  
   Set `NODE_DIR` before running:
   ```bash
   export NODE_DIR=/path/to/node/bin
   ./scripts/gui_start.sh
   ```

To find a working node path: in a shell where `node` and `npm` work, run `dirname "$(which node)"` and use that as `NODE_DIR`.
