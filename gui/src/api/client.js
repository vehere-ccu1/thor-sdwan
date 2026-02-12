/**
 * CMS API client. API connection details (and handshaking token in encoded form) are stored
 * on the GUI server (gui_config.json). The token is stored and transported base64-encoded
 * only; decoded value is kept in memory for API requests and never appears in page source.
 */
const GUI_CONFIG_URL = '/sdwan_cms_gui_config';

/** In-memory cache of config (with decoded handshakingToken for API use). */
let _serverConfigCache = null;

/** Decode base64 token from server; return plain string for in-memory use. */
function decodeTokenFromServer(encoded) {
  if (encoded == null || encoded === '') return '';
  const s = String(encoded).trim();
  if (!s) return '';
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch (_) {
    try {
      return atob(s);
    } catch (__) {
      return s;
    }
  }
}

/** Load config from GUI server. Token in response is base64-encoded; we decode for in-memory use. */
export async function loadGuiConfigFromServer() {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(window.location.origin + GUI_CONFIG_URL);
    if (!res.ok) {
      _serverConfigCache = null;
      return null;
    }
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === 'object') {
      const decoded = decodeTokenFromServer(data.handshakingToken);
      _serverConfigCache = { ...data, handshakingToken: decoded };
    } else {
      _serverConfigCache = null;
    }
    return _serverConfigCache;
  } catch (_) {
    _serverConfigCache = null;
    return null;
  }
}

/**
 * Save config to GUI server (writes gui_config.json). Server stores handshakingToken in base64.
 * We send the plain token; server encodes before saving. Response contains encoded token; we keep plain in memory.
 */
export async function saveGuiConfigToServer(config) {
  if (typeof window === 'undefined') return { ok: false, error: 'No window' };
  const plainToken = config?.handshakingToken != null ? String(config.handshakingToken) : '';
  const payload = {
    baseUrl: config?.baseUrl ? (config.baseUrl.endsWith('/') ? config.baseUrl : config.baseUrl + '/') : '',
    handshakingToken: plainToken,
    api_prefix: config?.api_prefix != null ? String(config.api_prefix) : '/sdwan_cms_api/',
    apiIp: config?.apiIp,
    apiPort: config?.apiPort,
  };
  try {
    const res = await fetch(window.location.origin + GUI_CONFIG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (res.ok && data) {
      _serverConfigCache = { ...data, handshakingToken: plainToken };
      return { ok: true, config: _serverConfigCache };
    }
    return { ok: false, error: data?.error || res.statusText || 'Save failed' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/** Read API config from in-memory cache (loaded from GUI server). Used to prefill config dialog. */
export function getStoredApiConfig() {
  if (typeof window === 'undefined') return null;
  return _serverConfigCache;
}

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const cfg = getStoredApiConfig();
    if (cfg?.baseUrl) return cfg.baseUrl.endsWith('/') ? cfg.baseUrl : cfg.baseUrl + '/';
    const c = window.__FLEXIWAN_SERVER_CONFIG__;
    if (c?.baseUrl) return c.baseUrl;
    const host = window.location.hostname || 'localhost';
    const apiPort = (c?.apiPort) || '3443';
    if (window.location.port === apiPort) return '/sdwan_cms_api/';
    return `${window.location.protocol}//${host}:${apiPort}/sdwan_cms_api/`;
  }
  return '/sdwan_cms_api/';
}

function getHandshakingToken() {
  const cfg = getStoredApiConfig();
  return (cfg && cfg.handshakingToken != null) ? String(cfg.handshakingToken) : '';
}

/** SHA256(str) as hex. Uses Web Crypto when available. */
async function sha256Hex(str) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

/** Generate random hex string (32 chars). */
function randomHex() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Add X-API-Hash and X-API-Random to headers when token is set. Mutates headers. */
async function addHandshakingHeaders(headers, token) {
  const t = token || getHandshakingToken();
  if (!t) return;
  const r = randomHex();
  const hash = await sha256Hex(t + r);
  headers['X-API-Hash'] = hash;
  headers['X-API-Random'] = r;
}

/** Update in-memory cache with baseUrl and handshakingToken (e.g. after API config/save). */
export function setStoredApiConfig(baseUrl, handshakingToken) {
  _serverConfigCache = { ..._serverConfigCache, baseUrl, handshakingToken };
}

async function request(path, options = {}) {
  try {
    const base = getBaseUrl().replace(/\/$/, '');
    const url = path.startsWith('/') ? base + path : base + '/' + path;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (typeof window !== 'undefined') {
      const userId = sessionStorage.getItem('sdwan_cms_user_id');
      if (userId) headers['X-User-Id'] = userId;
      await addHandshakingHeaders(headers);
    }
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (_) {
    return null;
  }
}

export async function fetchAccounts() {
  const data = await request('/accounts');
  return Array.isArray(data) ? data : [];
}

/** Health check. Sends X-API-Hash and X-API-Random when token is in localStorage (or passed). */
export async function healthCheck(baseUrl, handshakingToken) {
  const url = (baseUrl || getBaseUrl()).replace(/\/$/, '') + '/health';
  const headers = { 'Content-Type': 'application/json' };
  await addHandshakingHeaders(headers, handshakingToken);
  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, needsConfig: true };
    return { ok: false };
  } catch (_) {
    return { ok: false };
  }
}

/** Test API with user-entered token: call GET /health with X-API-Hash and X-API-Random. No test-api used. */
export async function testApiWithToken(baseUrl, handshakingToken) {
  const url = (baseUrl || getBaseUrl()).replace(/\/$/, '') + '/health';
  const headers = { 'Content-Type': 'application/json' };
  await addHandshakingHeaders(headers, handshakingToken);
  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, error: 'Invalid handshaking token' };
    return { ok: false, error: res.statusText || 'API test failed' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/** Test DB connectivity. Pass token so we can send hash+random (optional; test-api may be called first). */
export async function testDbConnection(baseUrl, handshakingToken, params) {
  const url = (baseUrl || getBaseUrl()).replace(/\/$/, '') + '/config/test-db';
  const headers = { 'Content-Type': 'application/json' };
  await addHandshakingHeaders(headers, handshakingToken);
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(params || {}) });
    const data = res.ok ? await res.json().catch(() => ({})) : null;
    if (res.ok && data?.ok) return { ok: true };
    return { ok: false, error: data?.detail || 'DB test failed' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/** Save connection config. Persists baseUrl and token to localStorage on success. */
export async function saveConnectionConfig(baseUrl, handshakingToken, payload) {
  const url = (baseUrl || getBaseUrl()).replace(/\/$/, '') + '/config/save';
  const headers = { 'Content-Type': 'application/json' };
  await addHandshakingHeaders(headers, handshakingToken);
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload || {}) });
    const data = res.ok ? await res.json().catch(() => ({})) : null;
    if (res.ok) {
      setStoredApiConfig(baseUrl, handshakingToken);
      return { ok: true, config: data };
    }
    return { ok: false, error: data?.detail || 'Save failed' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/** Login: validate credentials; returns { user_id, email, name, account_id, is_owner } or null. */
export async function login(body) {
  return request('/login', { method: 'POST', body: JSON.stringify({ email: body.email || body.username, password: body.password }) });
}

/** Application config from the CMS API (server-side config). */
export async function fetchConfig() {
  return request('/config');
}

/** Update config file (merge). Returns updated config. */
export async function updateConfig(body) {
  return request('/config', { method: 'PUT', body: JSON.stringify(body) });
}

/** Audit trail: GET with role-based visibility (Owner/Manager/Viewer). No delete. */
export async function fetchAuditTrail(params) {
  const { userId, dateFrom, dateTo, action, resource, groupBy } = params || {};
  if (!userId) return { rows: [], grouped: [] };
  const q = new URLSearchParams({ user_id: userId });
  if (dateFrom) q.set('date_from', dateFrom);
  if (dateTo) q.set('date_to', dateTo);
  if (action) q.set('action', action);
  if (resource) q.set('resource', resource);
  if (groupBy) q.set('group_by', groupBy);
  const data = await request(`/audit-trail?${q.toString()}`);
  if (!data || !Array.isArray(data.rows)) return { rows: [], grouped: data?.grouped || [] };
  return { rows: data.rows, grouped: data.grouped || [] };
}

export async function fetchGroups(accountId) {
  const path = accountId ? `/groups?account_id=${encodeURIComponent(accountId)}` : '/groups';
  const data = await request(path);
  return Array.isArray(data) ? data : [];
}

export async function fetchSites(accountId) {
  const path = accountId ? `/sites?account_id=${encodeURIComponent(accountId)}` : '/sites';
  const data = await request(path);
  return Array.isArray(data) ? data : [];
}

/** @deprecated Use fetchSites. Kept for backward compatibility (Users, Tokens, MainLayout). */
export async function fetchOrganizations(accountId) {
  return fetchSites(accountId);
}

export async function fetchUsers(accountId) {
  const path = accountId ? `/users?account_id=${encodeURIComponent(accountId)}` : '/users';
  const data = await request(path);
  return Array.isArray(data) ? data : [];
}

export async function createAccount(body) {
  return request('/accounts', { method: 'POST', body: JSON.stringify(body) });
}

/** Create owner account (account + owner user). Used by Create Account page. */
export async function createOwnerAccount(body) {
  return request('/create-owner-account', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateAccount(id, body) {
  return request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteAccount(id) {
  return request(`/accounts/${id}`, { method: 'DELETE' });
}

export async function createGroup(body) {
  return request('/groups', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateGroup(id, body) {
  return request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function createSite(body) {
  return request('/sites', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateSite(id, body) {
  return request(`/sites/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteSite(id) {
  return request(`/sites/${id}`, { method: 'DELETE' });
}

export async function deleteGroup(id) {
  return request(`/groups/${id}`, { method: 'DELETE' });
}

export async function createUser(body) {
  return request('/users', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateUser(id, body) {
  return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
}

export async function fetchUserPermissions(userId) {
  const data = await request(`/users/${userId}/permissions`);
  return Array.isArray(data) ? data : [];
}

export async function createUserPermission(userId, body) {
  return request(`/users/${userId}/permissions`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updatePermission(permId, body) {
  return request(`/permissions/${permId}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deletePermission(permId) {
  return request(`/permissions/${permId}`, { method: 'DELETE' });
}

export async function fetchTokens(organizationId) {
  const path = organizationId ? `/tokens?organization_id=${encodeURIComponent(organizationId)}` : '/tokens';
  const data = await request(path);
  return Array.isArray(data) ? data : [];
}

export async function createToken(body) {
  return request('/tokens', { method: 'POST', body: JSON.stringify(body) });
}

export async function revokeToken(tokenId) {
  return request(`/tokens/${tokenId}`, { method: 'DELETE' });
}

// ----- Forgot password / reset password -----
export async function requestForgotPasswordOtp(email) {
  return request('/forgot-password/request-otp', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetForgotPassword(email, otp, newPassword) {
  return request('/forgot-password/reset', { method: 'POST', body: JSON.stringify({ email, otp, new_password: newPassword }) });
}
