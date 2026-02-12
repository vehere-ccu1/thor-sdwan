import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  getStoredApiConfig,
  testApiWithToken,
  testDbConnection,
  saveConnectionConfig,
  saveGuiConfigToServer,
} from '../api/client';

const DB_TYPES = [
  { value: 'clickhouse', label: 'ClickHouse' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'elasticsearch', label: 'Elasticsearch' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'oracle', label: 'Oracle' },
];

function initialFromStored() {
  const c = getStoredApiConfig();
  if (!c) return {};
  return {
    apiIp: c.apiIp ?? '',
    apiPort: c.apiPort ?? '3443',
    api_prefix: c.api_prefix ?? '/sdwan_cms_api/',
    handshakingToken: c.handshakingToken ?? '',
  };
}

export default function ConfigDialog({ onSuccess }) {
  const { theme: t } = useTheme();
  const stored = initialFromStored();
  const [apiIp, setApiIp] = useState(stored.apiIp ?? '');
  const [apiPort, setApiPort] = useState(stored.apiPort ?? '3443');
  const [apiPrefix, setApiPrefix] = useState(stored.api_prefix ?? '/sdwan_cms_api/');
  const [handshakingToken, setHandshakingToken] = useState(stored.handshakingToken ?? '');
  const [apiTestMessage, setApiTestMessage] = useState('');
  const [apiTestOk, setApiTestOk] = useState(false);

  const [dbType, setDbType] = useState('clickhouse');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('9000');
  const [dbUser, setDbUser] = useState('default');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('sdwan_cms');
  const [dbTestMessage, setDbTestMessage] = useState('');
  const [dbTestOk, setDbTestOk] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const defaultDbPorts = { clickhouse: '9000', mysql: '3306', elasticsearch: '9200', mongodb: '27017', oracle: '1521' };
  useEffect(() => {
    setDbPort(defaultDbPorts[dbType] || '');
  }, [dbType]);

  const styles = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: t.authBackground,
      fontFamily: t.fontFamily.sans,
      padding: 24,
    },
    card: {
      background: t.color.surface,
      padding: 0,
      borderRadius: 12,
      boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
      width: '100%',
      maxWidth: 520,
      overflow: 'hidden',
    },
    header: {
      background: t.widgetHeader.background,
      color: t.widgetHeader.color,
      padding: `${t.widgetHeader.paddingVertical}px ${t.widgetHeader.paddingHorizontal}px`,
      textAlign: 'left',
    },
    title: {
      margin: 0,
      fontSize: t.widgetHeaderFontSize,
      fontWeight: 700,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
    },
    formContainer: { padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    sectionTitle: {
      fontSize: t.fontSize.base,
      fontWeight: 600,
      color: t.color.text,
      marginBottom: 8,
    },
    row: { display: 'flex', gap: 12, alignItems: 'center' },
    label: {
      flex: '0 0 120px',
      fontSize: t.fontSize.sm,
      color: t.color.textMuted,
    },
    input: {
      flex: 1,
      width: '100%',
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      border: `1px solid ${t.color.border}`,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
    },
    select: {
      flex: 1,
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      border: `1px solid ${t.color.border}`,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
    },
    button: {
      padding: `${t.button.paddingVertical} ${t.button.paddingHorizontal}`,
      fontSize: t.button.fontSize,
      fontWeight: t.button.fontWeight,
      fontFamily: t.fontFamily.sans,
      color: t.button.primaryColor,
      background: t.button.primaryBg,
      border: 'none',
      borderRadius: t.button.borderRadius,
      cursor: 'pointer',
      marginTop: 8,
    },
    messageOk: { fontSize: t.fontSize.sm, color: t.color.success, marginTop: 8 },
    messageErr: { fontSize: t.fontSize.sm, color: t.color.error, marginTop: 8 },
    divider: { height: 1, background: t.color.border, margin: '20px 0' },
  };

  const baseUrlFromFields = () => {
    const host = (apiIp || 'localhost').trim();
    const port = (apiPort || '3443').trim();
    const prefix = (apiPrefix || '/sdwan_cms_api/').trim();
    const path = prefix.startsWith('/') ? prefix : `/${prefix}`;
    const pathWithSlash = path.endsWith('/') ? path : `${path}/`;
    const protocol = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${host}:${port}${pathWithSlash}`;
  };

  const handleTestApi = async () => {
    setApiTestMessage('');
    setApiTestOk(false);
    const token = handshakingToken.trim();
    if (!token) {
      setApiTestMessage('Enter handshaking token (must match API config).');
      return;
    }
    const base = baseUrlFromFields();
    const { ok, error } = await testApiWithToken(base, token);
    if (ok) {
      setApiTestMessage('API OK. Token valid.');
      setApiTestOk(true);
    } else {
      setApiTestMessage(error || 'API test failed.');
    }
  };

  const handleTestDb = async () => {
    setDbTestMessage('');
    setDbTestOk(false);
    const base = baseUrlFromFields();
    const port = parseInt(dbPort, 10) || (dbType === 'clickhouse' ? 9000 : 0);
    const { ok, error } = await testDbConnection(base, handshakingToken, {
      db_type: dbType,
      host: dbHost.trim() || 'localhost',
      port,
      user: dbUser.trim(),
      password: dbPassword,
      db_name: dbName.trim() || 'sdwan_cms',
    });
    if (ok) {
      setDbTestMessage('DB connection OK.');
      setDbTestOk(true);
    } else {
      setDbTestMessage(error || 'DB test failed.');
    }
  };

  const handleSaveAndProceed = async () => {
    if (!apiTestOk || !dbTestOk) return;
    setSaveError('');
    setSaving(true);
    const base = baseUrlFromFields();
    const port = parseInt(dbPort, 10) || (dbType === 'clickhouse' ? 9000 : 0);
    const token = handshakingToken.trim();
    const payload = {
      db_type: dbType,
      db_host: dbHost.trim() || 'localhost',
      db_port: port,
      db_name: dbName.trim() || 'sdwan_cms',
      db_user: dbUser.trim() || undefined,
      db_password: dbPassword || undefined,
    };
    const { ok, error } = await saveConnectionConfig(base, token, payload);
    if (ok) {
      const guiPayload = {
        baseUrl: base,
        handshakingToken: token,
        api_prefix: (apiPrefix || '/sdwan_cms_api/').trim() || '/sdwan_cms_api/',
        apiIp: (apiIp || 'localhost').trim(),
        apiPort: (apiPort || '3443').trim(),
      };
      const guiResult = await saveGuiConfigToServer(guiPayload);
      if (guiResult.ok) {
        onSuccess?.();
      } else {
        setSaveError(guiResult.error || 'API config saved but GUI config save failed.');
      }
    } else {
      setSaveError(error || 'Failed to save config.');
    }
    setSaving(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Connection setup</h1>
        </div>
        <div style={styles.formContainer}>
          <h2 style={styles.sectionTitle}>API</h2>
          <div style={styles.form}>
            <div style={styles.row}>
              <span style={styles.label}>API IP</span>
              <input
                type="text"
                value={apiIp}
                onChange={(e) => setApiIp(e.target.value)}
                style={styles.input}
                placeholder="localhost"
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>API Port</span>
              <input
                type="text"
                value={apiPort}
                onChange={(e) => setApiPort(e.target.value)}
                style={styles.input}
                placeholder="3443"
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>API prefix</span>
              <input
                type="text"
                value={apiPrefix}
                onChange={(e) => setApiPrefix(e.target.value)}
                style={styles.input}
                placeholder="/sdwan_cms_api/"
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Handshaking token</span>
              <input
                type="password"
                value={handshakingToken}
                onChange={(e) => setHandshakingToken(e.target.value)}
                style={styles.input}
                placeholder="Must match the API server handshaking token"
              />
            </div>
            <button type="button" style={styles.button} onClick={handleTestApi}>
              TEST-API
            </button>
            {apiTestMessage && (
              <div style={apiTestOk ? styles.messageOk : styles.messageErr}>{apiTestMessage}</div>
            )}
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.formContainer}>
          <h2 style={styles.sectionTitle}>DB connectivity</h2>
          <div style={styles.form}>
            <div style={styles.row}>
              <span style={styles.label}>DB type</span>
              <select
                value={dbType}
                onChange={(e) => setDbType(e.target.value)}
                style={styles.select}
              >
                {DB_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>IP</span>
              <input
                type="text"
                value={dbHost}
                onChange={(e) => setDbHost(e.target.value)}
                style={styles.input}
                placeholder="localhost"
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Port</span>
              <input
                type="text"
                value={dbPort}
                onChange={(e) => setDbPort(e.target.value)}
                style={styles.input}
                placeholder={dbType === 'clickhouse' ? '9000' : ''}
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>User</span>
              <input
                type="text"
                value={dbUser}
                onChange={(e) => setDbUser(e.target.value)}
                style={styles.input}
                placeholder="default"
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Password</span>
              <input
                type="password"
                value={dbPassword}
                onChange={(e) => setDbPassword(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>DB name</span>
              <input
                type="text"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                style={styles.input}
                placeholder="sdwan_cms"
              />
            </div>
            <button type="button" style={styles.button} onClick={handleTestDb}>
              TEST-DB
            </button>
            {dbTestMessage && (
              <div style={dbTestOk ? styles.messageOk : styles.messageErr}>{dbTestMessage}</div>
            )}
          </div>
        </div>

        {apiTestOk && dbTestOk && (
          <>
            <div style={styles.divider} />
            <div style={styles.formContainer}>
              {saveError && <div style={styles.messageErr}>{saveError}</div>}
              <button
                type="button"
                style={styles.button}
                onClick={handleSaveAndProceed}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save and continue to login'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
