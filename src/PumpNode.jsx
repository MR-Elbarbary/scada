import { useState } from 'react';
import Pumpsvg from "./assets/pump_dynamic.svg?react";

const DEFAULT_TELEMETRY = {
  current: [null, null, null],
  unbalance: null,
  temperature: null,
};

const TAG_OPTIONS = [
  { id: 'heat', label: 'Heat', unit: '°C' },
  { id: 'average-current', label: 'Average Current', unit: 'A' },
];

export default function PumpNode({
  id = 'P-101',
  label = 'Main Feed Pump',
  initialMode = 'auto', // 'auto' | 'manual' | 'off'
  isFaulted = false,    // set true to test error state
  telemetry = DEFAULT_TELEMETRY,
  initialTags = ['heat'],
  onModeChange,
  onTagsChange,
  editMode,
  onClick,
}) {
  const [mode, setMode] = useState(initialMode);
  const [hasError, setHasError] = useState(isFaulted);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const liveData = telemetry;
  const tags = initialTags ?? [];
  const currentValues = (liveData.current ?? []).filter((value) => value != null && !Number.isNaN(Number(value)));
  const averageCurrent = currentValues.length
    ? currentValues.reduce((total, value) => total + Number(value), 0) / currentValues.length
    : null;

  const toggleTag = (tagId) => {
    const nextTags = tags.includes(tagId)
      ? tags.filter((tag) => tag !== tagId)
      : [...tags, tagId];
    onTagsChange?.(id, nextTags);
  };

  // Compute active status: 'error' | 'running' | 'manual' | 'idle'
  const state = hasError
    ? 'error'
    : mode === 'auto'
    ? 'running'
    : mode === 'manual'
    ? 'manual'
    : 'idle';

  // State color mapping
  const COLOR_MAP = {
  running: { 
    fill: '#1CB66C', stroke: '#07704B', text: '#1CB66C' },
  
  manual: { 
    fill: '#3B82F6',
    stroke: '#1D4ED8',
    text: '#3B82F6' 
  },
  
  // Yellow/Amber (Idle / Standby)
  idle: { 
    fill: '#EAB308',    // Amber/yellow body fill
    stroke: '#A16207',  // Dark gold accent/shadow stroke
    text: '#EAB308' 
  },
  
  // Red (Error / Alarm)
  error: { 
    fill: '#EF4444',    // Bright alarm red body fill
    stroke: '#991B1B',  // Dark maroon accent/shadow stroke
    text: '#EF4444' 
  },
};

  const currentTheme = COLOR_MAP[state];

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    if (onModeChange) onModeChange(id, newMode);
  };

  const handleNodeClick = (e) => {
    e.stopPropagation();
    if (!editMode) {
      setIsDialogOpen(true);
    }
    if (onClick) onClick(id);
  };

  return (
    <>
      {/* 1. Pure SVG Node (No outer card background or frame) */}
      <div
        className="pump-node-pure"
        onClick={handleNodeClick}
        style={{
          width: "150px",
          height: "100px",
          '--stroke': currentTheme.stroke,
          '--fill': currentTheme.fill,
        }}
      >
          <div className="pump-tags">
            {tags.includes('heat') && (
              <div className={`pump-tag ${liveData.temperature > 50 ? 'warning' : ''}`}>
                <span>HEAT</span>
                <strong>{liveData.temperature ?? '—'}°C</strong>
              </div>
            )}
            {tags.includes('average-current') && (
              <div className="pump-tag current-tag">
                <span>CURRENT</span>
                <strong>{averageCurrent == null ? '—' : averageCurrent.toFixed(2)} A</strong>
              </div>
            )}
          </div>
          <Pumpsvg width="100%" height="100%" />
      </div>

      {/* 2. Modal Dialog with Rotary Switch Control */}
      {isDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="dialog-modal" onClick={(e) => e.stopPropagation()}>
            <header className="dialog-header">
              <div>
                <h3>{label}</h3>
                <span className="device-id">ID: {id}</span>
              </div>
              <button className="close-btn" onClick={() => setIsDialogOpen(false)}>
                ✕
              </button>
            </header>

            <div className="dialog-body">
              {/* Status Header */}
              <div className="status-banner" style={{ borderColor: currentTheme.stroke }}>
                <span className="status-title">Current State:</span>
                <span className="status-badge" style={{ color: currentTheme.text }}>
                  {state.toUpperCase()}
                </span>
              </div>

              {/* Live Telemetry Grid */}
              <section className="readings-section">
                <h4>Live Telemetry</h4>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <span className="metric-label">Phase L1</span>
                    <span className="metric-value">{liveData.current?.[0] ?? '—'} <small>A</small></span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Phase L2</span>
                    <span className="metric-value">{liveData.current?.[1] ?? '—'} <small>A</small></span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Phase L3</span>
                    <span className="metric-value">{liveData.current?.[2] ?? '—'} <small>A</small></span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Imbalance</span>
                    <span className="metric-value">{liveData.unbalance ?? '—'} <small>%</small></span>
                  </div>
                  <div className="metric-card full-width">
                    <span className="metric-label">Temperature</span>
                    <span className={`metric-value ${liveData.temperature > 50 ? 'warning' : ''}`}>
                      {liveData.temperature ?? '—'} <small>°C</small>
                    </span>
                  </div>
                </div>
              </section>

              <section className="control-section tag-config-section">
                <div className="control-section-header">
                  <h4>Visible Pump Tags</h4>
                  <span className="device-id">{tags.length} selected</span>
                </div>
                <div className="tag-options">
                  {TAG_OPTIONS.map((tag) => (
                    <label className="tag-option" key={tag.id}>
                      <input
                        type="checkbox"
                        checked={tags.includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                      />
                      <span>{tag.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Rotary Mode Switch Controller */}
              <section className="control-section">
                <div className="control-section-header">
                  <h4>Device Mode Control</h4>
                  <button
                    className={`trip-toggle-btn ${hasError ? 'active' : ''}`}
                    onClick={() => setHasError(!hasError)}
                  >
                    {hasError ? 'Clear Fault' : 'Simulate Fault'}
                  </button>
                </div>

                <div className="rotary-switch-container">
                  <div className="rotary-labels">
                    <span
                      className={`label-auto ${mode === 'auto' ? 'active' : ''}`}
                      onClick={() => handleModeSwitch('auto')}
                    >
                      AUTO
                    </span>
                    <span
                      className={`label-manual ${mode === 'manual' ? 'active' : ''}`}
                      onClick={() => handleModeSwitch('manual')}
                    >
                      MANUAL
                    </span>
                    <span
                      className={`label-off ${mode === 'off' ? 'active' : ''}`}
                      onClick={() => handleModeSwitch('off')}
                    >
                      OFF
                    </span>
                  </div>

                  <div className="rotary-dial-wrapper">
                    <div className={`rotary-knob position-${mode}`}>
                      <div className="knob-indicator" />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Component Styles */}
      <style>{`
        /* Pure SVG Node */
        .pump-node-pure {
          position: relative;
          cursor: pointer;
          user-select: none;
          transition: transform 0.15s ease;
        }
        .pump-node-pure:hover {
          transform: scale(1.08);
        }
        .pump-tags {
          position: absolute;
          bottom: calc(100% - 8px);
          left: -8px;
          z-index: 1;
          display: flex;
          flex-direction: column-reverse;
          gap: 4px;
          align-items: flex-start;
          pointer-events: none;
        }
        .pump-tag {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 52px;
          padding: 4px 6px;
          border: 1px solid rgba(251, 191, 36, 0.55);
          border-radius: 5px;
          background: rgba(15, 23, 42, 0.94);
          color: #fbbf24;
          box-shadow: 0 3px 8px rgba(2, 6, 23, 0.4);
        }
        .pump-tag.current-tag {
          border-color: rgba(96, 165, 250, 0.65);
          color: #93c5fd;
        }
        .pump-tag span {
          color: #94a3b8;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.08em;
          line-height: 1;
        }
        .pump-tag strong {
          font-size: 11px;
          line-height: 1.1;
        }
        .pump-tag.warning {
          border-color: rgba(248, 113, 113, 0.7);
          color: #f87171;
        }
        .tag-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .tag-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 6px;
          color: #cbd5e1;
          font-size: 12px;
          cursor: pointer;
        }
        .tag-option input {
          accent-color: #22d3ee;
        }
        .node-label-text {
          font-family: system-ui, -apple-system, sans-serif;
          pointer-events: none;
        }

        /* Impeller Rotation */
        .pump-rotor {
          transform-box: fill-box;
          transform-origin: center;
        }
        .pump-rotor.spinning {
          animation: spin 1.2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Dialog & Modal */
        .dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .dialog-modal {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          width: 360px;
          color: #f8fafc;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .dialog-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
        .device-id { font-size: 11px; color: #94a3b8; }
        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 18px;
          cursor: pointer;
        }
        .dialog-body { padding: 16px; }

        .status-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1e293b;
          border-left: 4px solid;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        .status-title { font-size: 12px; color: #94a3b8; }
        .status-badge { font-weight: 700; font-size: 13px; letter-spacing: 0.5px; }

        /* Metrics */
        .readings-section h4, .control-section h4 {
          margin: 0 0 10px 0;
          font-size: 12px;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.5px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 20px;
        }
        .metric-card {
          background: #1e293b;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #334155;
        }
        .metric-card.full-width { grid-column: span 2; }
        .metric-label { font-size: 10px; color: #94a3b8; display: block; }
        .metric-value { font-size: 16px; font-weight: 700; color: #38bdf8; }
        .metric-value small { font-size: 11px; color: #94a3b8; font-weight: 400; }
        .metric-value.warning { color: #f87171; }

        /* Controls & Rotary Dial */
        .control-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .trip-toggle-btn {
          background: #334155;
          border: none;
          color: #f8fafc;
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
        .trip-toggle-btn.active {
          background: #ef4444;
        }

        .rotary-switch-container {
          background: #1e293b;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .rotary-labels {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .rotary-labels span {
          cursor: pointer;
          color: #64748b;
          transition: color 0.2s;
        }
        .rotary-labels span.active.label-auto { color: #10b981; }
        .rotary-labels span.active.label-manual { color: #3b82f6; }
        .rotary-labels span.active.label-off { color: #eab308; }

        .rotary-dial-wrapper {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #0f172a;
          border: 3px solid #334155;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rotary-knob {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(145deg, #334155, #1e293b);
          border: 1px solid #475569;
          position: relative;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .knob-indicator {
          width: 4px;
          height: 16px;
          background: #38bdf8;
          border-radius: 2px;
          position: absolute;
          top: 4px;
          left: calc(50% - 2px);
        }

        /* Dial Rotation Positions */
        .rotary-knob.position-auto { transform: rotate(-45deg); }
        .rotary-knob.position-manual { transform: rotate(0deg); }
        .rotary-knob.position-off { transform: rotate(45deg); }
      `}</style>
    </>
  );
}