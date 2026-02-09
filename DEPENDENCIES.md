# Dependencies – Commercial Use & Safety

All libraries used in **api**, **agent**, and **gui** are chosen to be **safe** and **free for commercial use** (permissive licenses: MIT, Apache-2.0, BSD, ISC). No copyleft (GPL/AGPL) runtime dependencies are used.

## API (`api/requirements.txt`)

| Package           | License   | Commercial use |
|-------------------|-----------|----------------|
| clickhouse-driver | MIT       | Yes            |
| fastapi           | MIT       | Yes            |
| uvicorn           | BSD-3-Clause | Yes         |
| uvicorn[standard] extras (httptools, watchfiles, etc.) | MIT/BSD | Yes |

## Agent (`agent/requirements.txt`)

| Package  | License     | Commercial use |
|----------|-------------|----------------|
| requests | Apache-2.0  | Yes            |

## GUI (`gui/package.json`)

| Package              | License | Commercial use |
|----------------------|---------|----------------|
| react                | MIT     | Yes            |
| react-dom            | MIT     | Yes            |
| react-router-dom     | MIT     | Yes            |
| vite                 | MIT     | Yes            |
| @vitejs/plugin-react | MIT     | Yes            |

## Policy

- **License:** We only add dependencies with MIT, Apache-2.0, BSD, or ISC (or similar permissive) licenses so the project remains free for commercial use.
- **Safety:** Prefer well-maintained, widely used packages; review CVEs before upgrading.

When adding new dependencies, check license (e.g. on PyPI or npm) and ensure it is permissive for commercial use.
