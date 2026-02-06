import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { getDataPageStyles } from '../../../styles/dataPageStyles';
import { IconCopy } from '../../../components/Icons';

export default function Command() {
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const [commandName, setCommandName] = useState('');
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const handleRunCommand = () => {
    setRunning(true);
    setOutput('');
    setTimeout(() => {
      setOutput('# Placeholder output\n$ ' + (command || '(no command)') + '\n\n(Output will appear here when API is connected.)');
      setRunning(false);
    }, 500);
  };

  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  return (
    <>
      <h2 style={{ margin: '0 0 16px', fontSize: t.fontSize.lg, fontWeight: 600, color: t.color.text }}>Command</h2>
      <div style={s.formRow}>
        <label style={s.label}>Command Name</label>
        <input type="text" value={commandName} onChange={(e) => setCommandName(e.target.value)} style={{ ...s.input, width: '100%', maxWidth: '100%' }} placeholder="e.g. Show interfaces" />
      </div>
      <div style={s.formRow}>
        <label style={s.label}>Command</label>
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          style={{ ...s.input, width: '100%', maxWidth: '100%', minHeight: 140, resize: 'vertical', fontFamily: 'monospace', fontSize: t.fontSize.sm }}
          placeholder="Enter command to run on device..."
          rows={6}
        />
        <div style={{ marginTop: 10 }}>
          <button type="button" style={{ ...s.btn, ...s.btnPrimary }} onClick={handleRunCommand} disabled={running}>
            {running ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>
      <div style={s.formRow}>
        <label style={s.label}>Output</label>
        <div style={{ position: 'relative', width: '100%' }}>
          <textarea
            readOnly
            value={output}
            style={{
              ...s.input,
              width: '100%',
              maxWidth: '100%',
              minHeight: 260,
              paddingTop: 12,
              paddingRight: 44,
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: t.fontSize.sm,
              background: t.color.background,
              cursor: 'default',
            }}
            placeholder="Output will appear here after running the command."
            rows={12}
          />
          <button
            type="button"
            onClick={handleCopyOutput}
            disabled={!output}
            title="Copy output"
            aria-label="Copy output"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: 6,
              border: 'none',
              background: t.color.surface,
              borderRadius: 6,
              cursor: output ? 'pointer' : 'default',
              color: output ? t.color.text : t.color.textMuted,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <IconCopy size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
