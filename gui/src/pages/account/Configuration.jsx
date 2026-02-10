import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { fetchConfig, updateConfig } from '../../api/client';

const DEFAULT_FORM = {
  api_host: '0.0.0.0',
  api_port: 3443,
  api_prefix: '/sdwan_cms_api',
  product: '',
  company: '',
  audit_log_retention_in_days: 30,
  log_path: '/var/log/sdwan_cms_api',
  clickhouse_host: 'localhost',
  clickhouse_port: 9000,
  clickhouse_database: 'sdwan_cms',
  clickhouse_user: 'default',
  clickhouse_password: '',
};

export default function Configuration() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDb, setShowDb] = useState(false);

  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);

  useEffect(() => {
    fetchConfig().then((c) => {
      if (c && typeof c === 'object') {
        setForm((prev) => ({
          ...DEFAULT_FORM,
          ...prev,
          ...c,
          clickhouse_password: c.clickhouse_password === '****' ? prev.clickhouse_password || '' : (c.clickhouse_password || ''),
        }));
      }
      setLoading(false);
    });
  }, []);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const payload = {
      api_host: form.api_host,
      api_port: Number(form.api_port) || 3443,
      api_prefix: form.api_prefix || '/sdwan_cms_api',
      product: form.product,
      company: form.company,
      audit_log_retention_in_days: Number(form.audit_log_retention_in_days) || 30,
      log_path: form.log_path || '/var/log/sdwan_cms_api',
    };
    if (showDb) {
      payload.clickhouse_host = form.clickhouse_host;
      payload.clickhouse_port = Number(form.clickhouse_port) || 9000;
      payload.clickhouse_database = form.clickhouse_database;
      payload.clickhouse_user = form.clickhouse_user;
      if (form.clickhouse_password) payload.clickhouse_password = form.clickhouse_password;
    }
    const res = await updateConfig(payload);
    setSaving(false);
    if (res) {
      setForm((prev) => ({ ...prev, ...res, clickhouse_password: res.clickhouse_password === '****' ? prev.clickhouse_password : (res.clickhouse_password || '') }));
      setMessage({ type: 'success', text: 'Configuration saved. Changes to API host, port, or prefix require an API restart to take effect.' });
    } else {
      setMessage({ type: 'error', text: 'Failed to save configuration.' });
    }
  };

  if (loading) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Configuration</h1>
        <p style={{ color: t.color.textMuted }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Configuration</h1>
        <p style={{ margin: 0, fontSize: t.fontSize.sm, color: t.color.textMuted }}>
          Edit api/resource/config.json. API host, port, and prefix take effect after restart.
        </p>
      </div>

      <div style={s.formCard}>
        <h2 style={{ margin: '0 0 16px', fontSize: t.fontSize.lg, fontWeight: 600 }}>API</h2>
        <div style={s.formRow}>
          <label style={s.label}>API host (bind address)</label>
          <input
            type="text"
            value={form.api_host}
            onChange={(e) => update('api_host', e.target.value)}
            style={s.input}
            placeholder="0.0.0.0"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>API listener port</label>
          <input
            type="number"
            value={form.api_port}
            onChange={(e) => update('api_port', e.target.value)}
            style={s.input}
            placeholder="3443"
            min={1}
            max={65535}
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>API prefix (URL path)</label>
          <input
            type="text"
            value={form.api_prefix}
            onChange={(e) => update('api_prefix', e.target.value)}
            style={s.input}
            placeholder="/sdwan_cms_api"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Product name</label>
          <input
            type="text"
            value={form.product}
            onChange={(e) => update('product', e.target.value)}
            style={s.input}
            placeholder="SD-WAN-CMS"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Organization name</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
            style={s.input}
            placeholder="R & D"
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>Audit log retention (days)</label>
          <input
            type="number"
            value={form.audit_log_retention_in_days}
            onChange={(e) => update('audit_log_retention_in_days', e.target.value)}
            style={s.input}
            min={1}
            max={3650}
          />
        </div>
        <div style={s.formRow}>
          <label style={s.label}>API log path (directory)</label>
          <input
            type="text"
            value={form.log_path ?? ''}
            onChange={(e) => update('log_path', e.target.value)}
            style={s.input}
            placeholder="/var/log/sdwan_cms_api"
          />
        </div>
      </div>

      <div style={s.formCard}>
        <button
          type="button"
          style={{ ...s.btn, ...s.btnSecondary, marginBottom: 12 }}
          onClick={() => setShowDb((v) => !v)}
        >
          {showDb ? 'Hide' : 'Show'} ClickHouse settings
        </button>
        {showDb && (
          <>
            <div style={s.formRow}>
              <label style={s.label}>ClickHouse host</label>
              <input
                type="text"
                value={form.clickhouse_host}
                onChange={(e) => update('clickhouse_host', e.target.value)}
                style={s.input}
              />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>ClickHouse port</label>
              <input
                type="number"
                value={form.clickhouse_port}
                onChange={(e) => update('clickhouse_port', e.target.value)}
                style={s.input}
              />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>ClickHouse database</label>
              <input
                type="text"
                value={form.clickhouse_database}
                onChange={(e) => update('clickhouse_database', e.target.value)}
                style={s.input}
              />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>ClickHouse user</label>
              <input
                type="text"
                value={form.clickhouse_user}
                onChange={(e) => update('clickhouse_user', e.target.value)}
                style={s.input}
              />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>ClickHouse password (leave blank to keep current)</label>
              <input
                type="password"
                value={form.clickhouse_password}
                onChange={(e) => update('clickhouse_password', e.target.value)}
                style={s.input}
                placeholder="••••••••"
              />
            </div>
          </>
        )}
      </div>

      {message && (
        <p style={{ color: message.type === 'error' ? t.color.error : t.color.primary, marginBottom: 16 }}>
          {message.text}
        </p>
      )}
      <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save configuration'}
      </button>
    </div>
  );
}
