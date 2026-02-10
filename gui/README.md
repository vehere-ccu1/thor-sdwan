# SD-WAN-CMS GUI

React UI for the SD-WAN CMS API. All source code lives in `src/`.

Dependencies (React, Vite, react-router-dom) use permissive licenses (MIT) and are free for commercial use. See project root `DEPENDENCIES.md` for the full list.

## Setup

```bash
npm install
```

If your system npm is broken, use the same Node/npm as the backend (e.g. a `run-with-node` wrapper or nvm):

```bash
# Example from repo root when backend has run-with-node:
./backend/run-with-node bash -c "cd gui && npm install && npm run build"
```

## Develop

```bash
npm run dev
```

## Build

```bash
npm run build
```

Output goes to `build/`. Point the API’s `clientStaticDir` to `../gui/build` (relative to the api directory) to serve this UI.

## Theme

Edit `src/theme.js` for product name, organization/vendor name, fonts, colors, button style, header background, and side menu styling. Icons use `theme.iconColor`.
