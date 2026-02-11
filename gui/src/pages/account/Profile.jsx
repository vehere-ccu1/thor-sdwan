import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getDataPageStyles } from '../../styles/dataPageStyles';
import { countries, getFlagEmoji } from '../../data/countries';
import { IconEdit, IconGrid, IconTicket, IconTrash } from '../../components/Icons';
import { fetchAccounts, updateAccount, deleteAccount } from '../../api/client';

export default function Profile({ onLogout }) {
  const { theme: t } = useTheme();
  const dataPageStyles = getDataPageStyles(t);
  const styles = {
    ...dataPageStyles,
    grid: dataPageStyles.grid('minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(100px,1.2fr) minmax(80px,1fr) 80px 120px'),
    flag: { fontSize: '1.5rem' },
  };
  const cellClip = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

  // Edit account form: same look and feel as Create Owner Account (card, header bar, form layout)
  const editCard = {
    card: {
      background: t.color.surface,
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      width: '100%',
      maxWidth: 480,
      overflow: 'hidden',
    },
    header: {
      background: t.widgetHeader?.background ?? t.color.primary,
      color: t.widgetHeader?.color ?? '#ffffff',
      padding: `${t.widgetHeader?.paddingVertical ?? 16}px ${t.widgetHeader?.paddingHorizontal ?? 24}px`,
      textAlign: 'left',
    },
    title: {
      margin: 0,
      fontSize: t.widgetHeaderFontSize ?? t.fontSize.lg,
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    formContainer: { padding: 24 },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: {
      display: 'block',
      fontSize: t.fontSize.sm,
      fontWeight: 500,
      color: t.color.text,
      marginBottom: 4,
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.color.border,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      fontSize: t.fontSize.base,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.color.border,
      borderRadius: t.button.borderRadius,
      fontFamily: t.fontFamily.sans,
      background: t.color.surface,
      color: t.color.text,
      boxSizing: 'border-box',
    },
    checkboxRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    buttonRow: { display: 'flex', gap: 12, marginTop: 8 },
    btnPrimary: {
      padding: `${t.button.paddingVertical} ${t.button.paddingHorizontal}`,
      fontSize: t.button.fontSize,
      fontWeight: t.button.fontWeight,
      fontFamily: t.fontFamily.sans,
      color: t.button.primaryColor,
      background: t.button.primaryBg,
      border: 'none',
      borderRadius: t.button.borderRadius,
      cursor: 'pointer',
    },
    btnSecondary: {
      padding: `${t.button.paddingVertical} ${t.button.paddingHorizontal}`,
      fontSize: t.button.fontSize,
      fontWeight: t.button.fontWeight,
      fontFamily: t.fontFamily.sans,
      color: t.button.secondaryColor,
      background: t.button.secondaryBg,
      border: `1px solid ${t.button.secondaryBorder}`,
      borderRadius: t.button.borderRadius,
      cursor: 'pointer',
    },
  };
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    owner_name: '',
    owner_job_title: '',
    billing_email: '',
    country: '',
    notifications: false,
  });

  const resetForm = () => {
    setForm({ name: '', owner_name: '', owner_job_title: '', billing_email: '', country: '', notifications: false });
    setEditingId(null);
  };

  const currentAccountId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sdwan_cms_account_id') : null;
  useEffect(() => {
    fetchAccounts().then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setRecords(currentAccountId ? arr.filter((r) => String(r.id) === String(currentAccountId)) : arr);
    });
  }, [currentAccountId]);

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      name: rec.name || '',
      owner_name: rec.owner_name || '',
      owner_job_title: rec.owner_job_title || '',
      billing_email: rec.billing_email || '',
      country: rec.country || '',
      notifications: !!rec.notifications,
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !form.billing_email.trim()) return;
    const res = await updateAccount(editingId, {
      name: form.name.trim() || form.billing_email.trim(),
      owner_name: form.owner_name.trim(),
      owner_job_title: form.owner_job_title.trim(),
      billing_email: form.billing_email.trim(),
      country: form.country || '',
      notifications: !!form.notifications,
    });
    if (res) {
      fetchAccounts().then((list) => setRecords(Array.isArray(list) ? list : []));
      resetForm();
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, name: form.name.trim(), billing_email: form.billing_email.trim(), country: form.country || null, notifications: form.notifications }
            : r
        )
      );
      resetForm();
    }
  };

  const navigate = useNavigate();
  const handleDelete = async (id) => {
    const isOwnAccount = String(id) === String(currentAccountId);
    const message = isOwnAccount
      ? 'This will permanently delete your account, all users, sites, site-groups, and master-organization. You will be logged out. Are you sure?'
      : 'Delete this account? All users in this account will also be removed.';
    if (!window.confirm(message)) return;
    const res = await deleteAccount(id);
    if (res && res.deleted) {
      if (isOwnAccount) {
        onLogout?.();
        navigate('/login', { replace: true });
      } else {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        fetchAccounts().then((list) => setRecords(Array.isArray(list) ? list : []));
      }
    }
  };

  const countryName = (code) => countries.find((c) => c.code === code)?.name || code || '—';

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ ...styles.toolbar, marginLeft: 'auto' }}>
          <button
            type="button"
            style={styles.iconBtn}
            onClick={() => setViewMode(viewMode === 'grid' ? 'ticket' : 'grid')}
            title={viewMode === 'grid' ? 'Ticket view' : 'Grid view'}
            aria-label={viewMode === 'grid' ? 'Ticket view' : 'Grid view'}
          >
            {viewMode === 'grid' ? <IconTicket size={16} /> : <IconGrid size={16} />}
          </button>
        </div>
      </div>

      {editingId && (
        <div style={{ marginBottom: 24 }}>
          <div style={editCard.card}>
            <div style={editCard.header}>
              <h2 style={editCard.title}>Edit account</h2>
            </div>
            <div style={editCard.formContainer}>
              <form
                style={editCard.form}
                onSubmit={(e) => { e.preventDefault(); if (editingId) handleUpdate(); }}
              >
                <div style={editCard.field}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    style={editCard.input}
                    disabled
                    placeholder="Organization or account name"
                  />
                </div>
                <div style={editCard.field}>
                  <input
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                    style={editCard.input}
                    placeholder="Owner name"
                  />
                </div>
                <div style={editCard.field}>
                  <input
                    type="text"
                    value={form.owner_job_title}
                    onChange={(e) => setForm((f) => ({ ...f, owner_job_title: e.target.value }))}
                    style={editCard.input}
                    placeholder="Owner job title"
                  />
                </div>
                <div style={editCard.field}>
                  <input
                    type="email"
                    value={form.billing_email}
                    onChange={(e) => setForm((f) => ({ ...f, billing_email: e.target.value }))}
                    style={editCard.input}
                    disabled
                    placeholder="Owner email ID"
                  />
                </div>
                <div style={editCard.field}>
                  <select
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    style={editCard.select}
                  >
                    <option value="">— Select country —</option>
                    <option value="IN">{getFlagEmoji('IN')} India</option>
                    {countries
                      .filter((c) => c.code !== 'IN')
                      .map((c) => (
                        <option key={c.code} value={c.code}>
                          {getFlagEmoji(c.code)} {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div style={editCard.field}>
                  <label style={{ ...editCard.label, ...editCard.checkboxRow, marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      checked={form.notifications}
                      onChange={(e) => setForm((f) => ({ ...f, notifications: e.target.checked }))}
                      style={{ margin: 0, accentColor: t.iconColor }}
                    />
                    Notifications
                  </label>
                </div>
                <div style={editCard.buttonRow}>
                  <button type="submit" style={editCard.btnPrimary}>
                    Update
                  </button>
                  <button type="button" style={editCard.btnSecondary} onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <p style={styles.empty}>No accounts available.</p>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{ ...styles.grid, ...styles.gridHeader }}>
            <span>Organization / Account name</span>
            <span>Owner Name</span>
            <span>Owner Job Title</span>
            <span>Owner Email ID</span>
            <span>Country</span>
            <span>Notifications</span>
            <span>Actions</span>
          </div>
          {records.map((r) => (
            <div key={r.id} style={styles.grid}>
              <span style={cellClip} title={r.name || ''}>{r.name || '—'}</span>
              <span style={cellClip} title={r.owner_name || ''}>{r.owner_name || '—'}</span>
              <span style={cellClip} title={r.owner_job_title || ''}>{r.owner_job_title || '—'}</span>
              <span style={cellClip} title={r.billing_email || ''}>{r.billing_email || '—'}</span>
              <span style={cellClip} title={countryName(r.country)}>
                <span style={styles.flag}>{getFlagEmoji(r.country)}</span> {countryName(r.country)}
              </span>
              <span>{r.notifications ? 'Yes' : 'No'}</span>
              <div style={styles.actions}>
                <button type="button" style={styles.iconBtn} onClick={() => handleEdit(r)} title="Edit account">
                  <IconEdit size={16} />
                </button>
                <button type="button" style={styles.iconBtn} onClick={() => handleDelete(r.id)} title={String(r.id) === String(currentAccountId) ? 'Delete my account' : 'Delete'}>
                  <IconTrash size={16} />
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={styles.ticketList}>
          {records.map((r) => (
            <div key={r.id} style={styles.ticketCard}>
              <div style={styles.ticketMain}>
                <span style={styles.flag}>{getFlagEmoji(r.country)}</span>
                <strong>{r.name || r.billing_email}</strong>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{r.billing_email}</span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>
                  Owner: {r.owner_name || '—'}
                  {r.owner_job_title ? ` (${r.owner_job_title})` : ''}
                </span>
                <span style={{ color: t.color.textMuted, fontSize: t.fontSize.sm }}>{countryName(r.country)}</span>
                <span style={{ fontSize: t.fontSize.sm }}>{r.notifications ? 'Notifications on' : 'Notifications off'}</span>
              </div>
              <div style={styles.actions}>
                <button type="button" style={styles.iconBtn} onClick={() => handleEdit(r)} title="Edit account">
                  <IconEdit size={16} />
                </button>
                <button type="button" style={styles.iconBtn} onClick={() => handleDelete(r.id)} title={String(r.id) === String(currentAccountId) ? 'Delete my account' : 'Delete'}>
                  <IconTrash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
