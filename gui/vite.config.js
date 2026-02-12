import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const GUI_CONFIG_PATH = path.resolve(process.cwd(), 'gui_config.json');
const GUI_CONFIG_ROUTE = '/sdwan_cms_gui_config';

const GUI_CONFIG_KEYS = ['baseUrl', 'api_prefix', 'apiIp', 'apiPort', 'handshakingToken'];

function onlyApiConfig(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  const out = {};
  for (const k of GUI_CONFIG_KEYS) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/** Encode token for storage and transport (base64). Never store or send plain token. */
function encodeToken(plain) {
  if (plain == null || plain === '') return '';
  const s = String(plain);
  return Buffer.from(s, 'utf8').toString('base64');
}

/** Decode token from storage; if already plain or invalid base64, return as-is. */
function decodeToken(encoded) {
  if (encoded == null || encoded === '') return '';
  const s = String(encoded).trim();
  if (!s) return '';
  try {
    return Buffer.from(s, 'base64').toString('utf8');
  } catch (_) {
    return s;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function guiConfigPlugin() {
  return {
    name: 'gui-config-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== GUI_CONFIG_ROUTE && req.url !== GUI_CONFIG_ROUTE + '/') {
          next();
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET') {
          try {
            const raw = fs.existsSync(GUI_CONFIG_PATH)
              ? fs.readFileSync(GUI_CONFIG_PATH, 'utf8')
              : '';
            const data = raw ? JSON.parse(raw) : null;
            res.statusCode = 200;
            res.end(JSON.stringify(onlyApiConfig(data)));
          } catch (_) {
            res.statusCode = 200;
            res.end('null');
          }
          return;
        }
        if (req.method === 'POST') {
          try {
            const body = await readBody(req);
            const data = body ? JSON.parse(body) : {};
            const rawToken = data.handshakingToken != null ? String(data.handshakingToken) : '';
            const payload = {
              baseUrl: data.baseUrl != null ? (data.baseUrl.endsWith('/') ? data.baseUrl : data.baseUrl + '/') : '',
              api_prefix: data.api_prefix != null ? String(data.api_prefix) : '/sdwan_cms_api/',
              apiIp: data.apiIp,
              apiPort: data.apiPort,
              handshakingToken: rawToken ? encodeToken(rawToken) : '',
            };
            fs.writeFileSync(GUI_CONFIG_PATH, JSON.stringify(payload, null, 2), 'utf8');
            res.statusCode = 200;
            res.end(JSON.stringify(payload));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: e?.message || 'Invalid JSON' }));
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), guiConfigPlugin()],
  build: {
    outDir: 'build',
  },
});
