import { useEffect, useState } from 'react';
import Pumpsvg from "./assets/pump_dynamic.svg?react";

const DEFAULT_TELEMETRY = {
  current: [null, null, null],
  unbalance: null,
  temperature: null,
};

const TAG_OPTIONS = [
  { id: 'heat', label: 'Heat', unit: '°C' },
  { id: 'average-current', label: 'Average Current', unit: 'A' },
  { id: 'c1', label: 'C1', unit: 'A' },
  { id: 'c2', label: 'C2', unit: 'A' },
  { id: 'c3', label: 'C3', unit: 'A' },
];

const PLOT_OPTIONS = [
  { id: 'current', label: 'Current', unit: 'A' },
  { id: 'heat', label: 'Heat', unit: '°C' },
];

function PlotChart({ points, unit, futureStart = 0 }) {
  const width = 1000;
  const height = 320;
  const padding = { top: 18, right: 18, bottom: 28, left: 42 };
  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const x = (index) => padding.left + (index / Math.max(points.length - 1, 1)) * (width - padding.left - padding.right);
  const y = (value) => padding.top + (1 - (value - min) / range) * (height - padding.top - padding.bottom);
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.value)}`).join(' ');
  const dividerX = futureStart ? x(futureStart - 1) : 0;

  return (
    <div className="plot-wrap">
      <svg className="plot-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Telemetry plot in ${unit}`}>
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="plot-axis" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="plot-axis" />
        <path d={path} className="plot-line" />
        {points.map((point, index) => (
          <circle key={`${point.time}-${index}`} cx={x(index)} cy={y(point.value)} r="3" className={index >= futureStart ? 'plot-point plot-point-future' : 'plot-point'} />
        ))}
        {futureStart > 0 && <line x1={dividerX} y1={padding.top} x2={dividerX} y2={height - padding.bottom} className="plot-divider" />}
        <text x="8" y={padding.top + 4} className="plot-label">{max.toFixed(1)} {unit}</text>
        <text x="8" y={height - padding.bottom} className="plot-label">{min.toFixed(1)} {unit}</text>
      </svg>
      {futureStart > 0 && <span className="plot-legend">Dashed boundary marks the prediction horizon</span>}
    </div>
  );
}

export default function PumpNode({
  id = 'P-101',
  label = 'Main Feed Pump',
  initialMode = 'auto', // 'auto' | 'manual' | 'off'
  isFaulted = false,    // set true to test error state
  faultReason = '',
  telemetry = DEFAULT_TELEMETRY,
  initialTags = ['c1', 'c2', 'c3'],
  onModeChange,
  onTagsChange,
  editMode,
  onClick,
}) {
  const [mode, setMode] = useState(initialMode);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('control');
  const [plotVariable, setPlotVariable] = useState('current');
  const [history, setHistory] = useState([]);
  const liveData = telemetry;
  const displayedFaultReason = faultReason || (isFaulted ? 'Pump fault reported by telemetry' : '');
  const displayedTemperature = liveData.temperature ?? '-';
  const tags = initialTags ?? [];
  const currentValues = (liveData.current ?? []).filter((value) => value != null && !Number.isNaN(Number(value)));
  const averageCurrent = currentValues.length
    ? currentValues.reduce((total, value) => total + Number(value), 0) / currentValues.length
    : null;

  useEffect(() => {
    const addSample = () => {
      const sample = {
        time: Date.now(),
        current: averageCurrent ?? 0,
        heat: Number(liveData.temperature ?? 0),
      };
      setHistory((previous) => [...previous, sample].slice(-30));
    };

    addSample();
    const interval = setInterval(addSample, 5000);
    return () => clearInterval(interval);
  }, [averageCurrent, liveData.temperature]);

  const selectedPlotOption = PLOT_OPTIONS.find((option) => option.id === plotVariable) ?? PLOT_OPTIONS[0];
  const historicalPoints = history.map((sample) => ({ time: sample.time, value: sample[plotVariable] }));
  const predictionCount = 8;
  const lastPoint = historicalPoints[historicalPoints.length - 1] ?? { time: 0, value: 0 };
  const previousPoint = historicalPoints[historicalPoints.length - 2] ?? lastPoint;
  const trend = lastPoint.value - previousPoint.value;
  const predictedPoints = Array.from({ length: predictionCount }, (_, index) => ({
    time: lastPoint.time + (index + 1) * 60000,
    value: Math.max(0, lastPoint.value + trend * (index + 1)),
  }));
  const renderedTags = [
    tags.includes('heat') && {
      id: 'heat',
      label: 'HEAT',
      value: `${displayedTemperature}°C`,
    },
    tags.includes('average-current') && {
      id: 'average-current',
      label: 'AVG Curr',
      value: `${averageCurrent == null ? '—' : averageCurrent.toFixed(2)} A`,
      className: 'current-tag',
    },
    ...['c1', 'c2', 'c3'].map((tagId, index) => tags.includes(tagId) && ({
      id: tagId,
      label: tagId.toUpperCase(),
      value: `${liveData.current?.[index] ?? '—'} A`,
      className: 'current-tag',
    })),
  ].filter(Boolean);
  const tagRows = Math.ceil(renderedTags.length / 2);

  const toggleTag = (tagId) => {
    const nextTags = tags.includes(tagId)
      ? tags.filter((tag) => tag !== tagId)
      : [...tags, tagId];
    onTagsChange?.(id, nextTags);
  };

  // Compute active status: 'error' | 'running' | 'manual' | 'idle'
  const state = isFaulted
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
          width: "190px",
          height: "130px",
          '--stroke': currentTheme.stroke,
          '--fill': currentTheme.fill,
        }}
      >
          <div className="pump-tags" style={{ gridTemplateRows: `repeat(${tagRows}, auto)` }}>
            {renderedTags.map((tag, index) => (
              <div
                className={`pump-tag ${tag.className ?? ''}`}
                key={tag.id}
                style={{
                  gridColumn: (index % 2) + 1,
                  gridRow: tagRows - Math.floor(index / 2),
                }}
              >
                <span>{tag.label}</span>
                <strong>{tag.value}</strong>
              </div>
            ))}
          </div>
          <Pumpsvg width="100%" height="100%" />
      </div>

      {/* 2. Modal Dialog with Rotary Switch Control */}
      {isDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="dialog-modal pump-dialog-modal" onClick={(e) => e.stopPropagation()}>
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
              <nav className="pump-dialog-tabs" aria-label="Pump views">
                {['control', 'historian', 'prediction'].map((tab) => (
                  <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>

              {activeTab === 'control' && <div className="pump-control-view">
                <div className="status-banner" style={{ borderColor: currentTheme.stroke }}>
                  <span className="status-title">Current State:</span>
                  <span className="status-badge" style={{ color: currentTheme.text }}>{state.toUpperCase()}</span>
                </div>
                {displayedFaultReason && <div className="alarm-box"><strong>Fault</strong><span>{displayedFaultReason}</span></div>}
                <section className="readings-section">
                  <h4>Live Telemetry</h4>
                  <div className="metrics-grid">
                    {[0, 1, 2].map((index) => <div className="metric-card" key={index}><span className="metric-label">Phase L{index + 1}</span><span className="metric-value">{liveData.current?.[index] ?? '—'} <small>A</small></span></div>)}
                    <div className="metric-card"><span className="metric-label">Imbalance</span><span className="metric-value">{liveData.unbalance ?? '—'} <small>%</small></span></div>
                    <div className="metric-card full-width"><span className="metric-label">Temperature</span><span className="metric-value">{displayedTemperature} <small>°C</small></span></div>
                  </div>
                </section>
              

              {activeTab === 'control' && <section className="control-section tag-config-section">
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
              </section>}

              {activeTab === 'control' && <section className="control-section">
                <div className="control-section-header">
                  <h4>Device Mode Control</h4>
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
              </section>}
              </div>}

              {activeTab !== 'control' && <section className="plot-panel">
                <div className="plot-toolbar">
                  <div><h4>{activeTab === 'historian' ? 'Historian' : 'Prediction'}</h4><span>Frontend telemetry view</span></div>
                  <label>Variable<select value={plotVariable} onChange={(event) => setPlotVariable(event.target.value)}>{PLOT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                </div>
                <PlotChart points={activeTab === 'historian' ? historicalPoints : [...historicalPoints, ...predictedPoints]} unit={selectedPlotOption.unit} futureStart={activeTab === 'prediction' ? historicalPoints.length : 0} />
              </section>}
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
          bottom: calc(100% - 10px);
          left: -10px;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(2, max-content);
          grid-auto-flow: row;
          align-items: end;
          justify-items: start;
          gap: 6px;
          pointer-events: none;
        }
        .pump-tag {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          width: max-content;
          min-width: 95px;
          box-sizing: border-box;
          padding: 4px 7px;
          border: 1px solid rgba(251, 191, 36, 0.55);
          border-radius: 6px;
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
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          line-height: 1;
          white-space: nowrap;
        }
        .pump-tag strong {
          font-size: 14px;
          line-height: 1.15;
          white-space: nowrap;
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
          width: min(90vw, 2000px);
          min-height: min(78vh, 760px);
          max-height: calc(100vh - 32px);
          overflow-x: hidden;
          overflow-y: auto;
          color: #f8fafc;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          font-family: system-ui, -apple-system, sans-serif;
        }
        .dialog-modal.pump-dialog-modal {
          width: 95vw;
          max-width: 2000px;
          min-height: min(78vh, 760px);
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
        .pump-control-view {
          width: min(100%, 760px);
          margin: 0 auto;
        }
        .pump-dialog-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
          border-bottom: 1px solid #334155;
        }
        .pump-dialog-tabs button {
          border: 0;
          border-bottom: 2px solid transparent;
          padding: 9px 14px;
          background: transparent;
          color: #94a3b8;
          font: inherit;
          cursor: pointer;
        }
        .pump-dialog-tabs button.active {
          border-bottom-color: #38bdf8;
          color: #e0f2fe;
        }
        .plot-panel {
          min-height: 410px;
          margin-bottom: 16px;
          padding: 14px;
          border: 1px solid #334155;
          border-radius: 8px;
          background: #111c2d;
        }
        .plot-toolbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 10px;
        }
        .plot-toolbar h4 { margin: 0 0 4px; color: #e0f2fe; }
        .plot-toolbar span { color: #64748b; font-size: 11px; }
        .plot-toolbar label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 11px;
          text-transform: uppercase;
        }
        .plot-toolbar select {
          border: 1px solid #475569;
          border-radius: 5px;
          padding: 6px 8px;
          background: #0f172a;
          color: #e0f2fe;
          font: inherit;
          text-transform: none;
        }
        .plot-wrap { width: 100%; }
        .plot-chart { display: block; width: 100%; height: auto; min-height: 320px; overflow: visible; }
        .plot-axis { stroke: #475569; stroke-width: 1; }
        .plot-line { fill: none; stroke: #38bdf8; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
        .plot-point { fill: #e0f2fe; stroke: #0ea5e9; stroke-width: 2; }
        .plot-point-future { fill: #fbbf24; stroke: #f59e0b; }
        .plot-divider { stroke: #fbbf24; stroke-width: 1; stroke-dasharray: 5 5; }
        .plot-label { fill: #94a3b8; font-size: 10px; }
        .plot-legend { display: block; color: #fbbf24; font-size: 11px; text-align: right; }

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