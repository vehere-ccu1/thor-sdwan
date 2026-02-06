import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { getDataPageStyles } from '../../../styles/dataPageStyles';

const READ_ONLY = {
  hostName: 'router-01.example.com',
  serialNumber: 'SN-2024-001234',
  machineId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  deviceVersion: '2.1.0',
};

export default function General() {
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const [deviceName, setDeviceName] = useState('');
  const [description, setDescription] = useState('');
  const [approves, setApproves] = useState(false);
  const ro = { ...s.input, maxWidth: '100%', background: t.color.background, cursor: 'default', color: t.color.textMuted };

  return (
    <>
      <h2 style={{ margin: '0 0 16px', fontSize: t.fontSize.lg, fontWeight: 600, color: t.color.text }}>General</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 24 }}>
        <div style={s.formRow}>
          <label style={s.label}>Device Name</label>
          <input type="text" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} style={{ ...s.input, maxWidth: '100%' }} placeholder="Device display name" />
        </div>
        <div style={s.formRow}>
          <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={approves} onChange={(e) => setApproves(e.target.checked)} style={s.checkbox} />
            Approves
          </label>
        </div>
      </div>
      <div style={s.formRow}>
        <label style={s.label}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...s.input, minHeight: 80, resize: 'vertical', maxWidth: '100%' }} placeholder="Optional description" rows={3} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 24 }}>
        <div style={s.formRow}><label style={s.label}>Host Name</label><input type="text" readOnly value={READ_ONLY.hostName} style={ro} /></div>
        <div style={s.formRow}><label style={s.label}>Serial Number</label><input type="text" readOnly value={READ_ONLY.serialNumber} style={ro} /></div>
        <div style={s.formRow}><label style={s.label}>Machine ID</label><input type="text" readOnly value={READ_ONLY.machineId} style={ro} /></div>
        <div style={s.formRow}><label style={s.label}>Device Version</label><input type="text" readOnly value={READ_ONLY.deviceVersion} style={ro} /></div>
      </div>
      <div style={s.formRow}>
        <label style={s.label}>Device location</label>
        <div style={{ width: '100%', minHeight: 280, borderRadius: 8, border: '1px solid ' + t.color.border, background: t.color.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color.textMuted, fontSize: t.fontSize.sm }} aria-label="GIS map placeholder">
          GIS map widget — device location (map integration can be added here)
        </div>
      </div>
    </>
  );
}
