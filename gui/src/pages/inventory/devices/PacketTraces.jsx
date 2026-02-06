import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { getDataPageStyles } from '../../../styles/dataPageStyles';

export default function PacketTraces() {
  const { theme: t } = useTheme();
  const s = getDataPageStyles(t);
  const [totalPackets, setTotalPackets] = useState('1000');
  const [captureDuration, setCaptureDuration] = useState('5');
  const [traceOutput, setTraceOutput] = useState('');
  const [traceSearch, setTraceSearch] = useState('');
  const [tracing, setTracing] = useState(false);

  const handleTrace = () => {
    const packets = parseInt(totalPackets, 10);
    const duration = parseInt(captureDuration, 10);
    const packetsValid = !Number.isNaN(packets) && packets >= 5 && packets <= 65000;
    const durationValid = !Number.isNaN(duration) && duration >= 5 && duration <= 10;
    if (!packetsValid || !durationValid) return;
    setTracing(true);
    setTraceOutput('');
    setTimeout(() => {
      setTraceOutput(
        `# Packet trace (${packets} packets, ${duration}s)\n` +
        `# Placeholder dissected packet information.\n` +
        `# Replace with real API response.\n\n` +
        `Frame 1: 64 bytes on wire\n` +
        `Ethernet II, Src: aa:bb:cc:dd:ee:01, Dst: aa:bb:cc:dd:ee:02\n` +
        `Internet Protocol Version 4, Src: 192.168.1.1, Dst: 192.168.1.2\n\n` +
        `Frame 2: 64 bytes on wire\n` +
        `Ethernet II, Src: aa:bb:cc:dd:ee:02, Dst: aa:bb:cc:dd:ee:01\n` +
        `...\n`
      );
      setTracing(false);
    }, 600);
  };

  const traceLines = traceOutput ? traceOutput.split('\n') : [];
  const filteredTraceLines = traceSearch.trim()
    ? traceLines.filter((line) => line.toLowerCase().includes(traceSearch.trim().toLowerCase()))
    : traceLines;
  const traceDisplayText = filteredTraceLines.join('\n');

  return (
    <>
      <h2 style={{ margin: '0 0 16px', fontSize: t.fontSize.lg, fontWeight: 600, color: t.color.text }}>
        Packet Traces
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <label style={s.label}>Total Packets (5 – 65,000)</label>
          <input
            type="number"
            min={5}
            max={65000}
            value={totalPackets}
            onChange={(e) => setTotalPackets(e.target.value)}
            style={{ ...s.input, width: 140 }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={s.label}>Capture Duration (5–10 sec)</label>
          <input
            type="number"
            min={5}
            max={10}
            value={captureDuration}
            onChange={(e) => setCaptureDuration(e.target.value)}
            style={{ ...s.input, width: 120 }}
          />
        </div>
        <button
          type="button"
          style={{ ...s.btn, ...s.btnPrimary }}
          onClick={handleTrace}
          disabled={tracing}
        >
          {tracing ? 'Tracing…' : 'Trace'}
        </button>
      </div>
      <div style={s.formRow}>
        <label style={s.label}>Search in trace output</label>
        <input
          type="text"
          value={traceSearch}
          onChange={(e) => setTraceSearch(e.target.value)}
          style={{ ...s.input, width: '100%', maxWidth: 400 }}
          placeholder="Search keywords in trace..."
        />
      </div>
      <div style={s.formRow}>
        <label style={s.label}>Dissected packet information</label>
        <textarea
          readOnly
          value={traceDisplayText}
          style={{
            ...s.input,
            width: '100%',
            minHeight: 280,
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: t.fontSize.sm,
            background: t.color.background,
            cursor: 'default',
          }}
          placeholder="Trace output will appear here after clicking Trace."
          rows={14}
        />
      </div>
    </>
  );
}
