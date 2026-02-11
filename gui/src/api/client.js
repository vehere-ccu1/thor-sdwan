/**
 * CMS API client. Uses baseUrl from window.__FLEXIWAN_SERVER_CONFIG__ or '/sdwan_cms_api/'.
 * Agent API prefix is sdwan_agent_api (separate service).
 * All functions return data or []/null on failure (no throw) so UI can fallback to local state.
 */
function getBaseUrl() {
  const c = typeof window !== 'undefined' && window.__FLEXIWAN_SERVER_CONFIG__;
  if (c && c.baseUrl) return c.baseUrl;
  if (typeof window === 'undefined') return '/sdwan_cms_api/';
  const host = window.location.hostname || 'localhost';
  const apiPort = (c && c.apiPort) || '3443';
  if (window.location.port === apiPort) return '/sdwan_cms_api/';
  return `${window.location.protocol}//${host}:${apiPort}/sdwan_cms_api/`;
}

async function request(path, options = {}) {
  try {
    const base = getBaseUrl().replace(/\/$/, '');
    const url = path.startsWith('/') ? base + path : base + '/' + path;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (typeof window !== 'undefined') {
      const userId = sessionStorage.getItem('sdwan_cms_user_id');
      if (userId) headers['X-User-Id'] = userId;
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

/** Login: validate credentials; returns { user_id, email, name, account_id, is_owner } or null. */
export async function login(body) {
  return request('/login', { method: 'POST', body: JSON.stringify({ email: body.email || body.username, password: body.password }) });
}

/** Application config (api/resource/config.json). */
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

export async function fetchOrganizations(accountId) {
  const path = accountId ? `/organizations?account_id=${encodeURIComponent(accountId)}` : '/organizations';
  const data = await request(path);
  return Array.isArray(data) ? data : [];
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

export async function createOrganization(body) {
  return request('/organizations', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateOrganization(id, body) {
  return request(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteOrganization(id) {
  return request(`/organizations/${id}`, { method: 'DELETE' });
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
