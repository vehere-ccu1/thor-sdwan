# Scripts

- **api_start.sh** / **api_start.bat** – start the API (backend)
- **gui_start.sh** / **gui_start.bat** – start the GUI (Vite dev server)

## If npm fails (e.g. "Cannot find module .../npm-prefix.js")

Your system npm may be broken. Use a working Node/npm:

1. **Option A – `run-with-node`**  
   Edit `scripts/run-with-node` and set `NODE_DIR` to the directory that contains your working `node` and `npm` (e.g. from nvm: `~/.nvm/versions/node/v18.19.0/bin`, or your opensite install).  
   Both `gui_start.sh` and `api_start.sh` source this file when present.

2. **Option B – environment variable**  
   Set `NODE_DIR` before running:
   ```bash
   export NODE_DIR=/path/to/node/bin
   ./scripts/gui_start.sh
   ```

To find a working node path: in a shell where `node` and `npm` work, run `dirname "$(which node)"` and use that as `NODE_DIR`.
