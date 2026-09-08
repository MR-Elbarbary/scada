import React, { useState, useEffect } from 'react'; // Add '?react' if using Vite (vite-plugin-svgr)
import Flowmetersvg from "./assets/flow_meter_dynamic.svg?react";

const DEFAULT_TELEMETRY = {
  flow: 120,       // m³/h
  pressure: 4.2,   // bar
  power: 78,       // %
  temp: 45.5,      // °C
  rpm: 2950,       // RPM
};

export default function FlowmeterNode({
  id = 'FM-101',
  label = 'Main Flow Meter',
  initialMode = 'auto', // 'auto' | 'manual' | 'off'
  isFaulted = false,    // set true to test error state
  telemetry = DEFAULT_TELEMETRY,
  onModeChange,
  editMode,
  onClick,
}) {
  const [mode, setMode] = useState(initialMode);
  const [hasError, setHasError] = useState(isFaulted);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [liveData, setLiveData] = useState(telemetry);

  // Compute active status: 'error' | 'running' | 'manual' | 'idle'
  const state = hasError
    ? 'error'
    : mode === 'auto'
    ? 'running'
    : mode === 'manual'
    ? 'manual'
    : 'idle';

  const isSpinning = state === 'running' || state === 'manual';

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

  // Live telemetry simulation logic
  useEffect(() => {
    if (!isSpinning) {
      setLiveData((prev) => ({
        ...prev,
        flow: 0,
        pressure: Number((prev.pressure * 0.85).toFixed(1)),
        power: 0,
        rpm: 0,
      }));
      return;
    }

    const interval = setInterval(() => {
      setLiveData((prev) => ({
        flow: Math.round(100 + (Math.random() - 0.5) * 20),
        pressure: Number((3.8 + (Math.random() - 0.5) * 0.8).toFixed(1)),
        power: Math.round(70 + (Math.random() - 0.5) * 15),
        temp: Number((42 + (Math.random() - 0.5) * 4).toFixed(1)),
        rpm: Math.round(2900 + (Math.random() - 0.5) * 100),
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, [isSpinning]);

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
      className="flow-meter-pure"
      onClick={handleNodeClick}
      style={{
        width: "100px",
        height: "75px",
        '--stroke': currentTheme.stroke,
        '--fill': currentTheme.fill,
      }}
      >
          <Flowmetersvg width="100%" height="100%" />
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
                    <span className="metric-label">Flow Rate</span>
                    <span className="metric-value">{liveData.flow} <small>m³/h</small></span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Pressure</span>
                    <span className="metric-value">{liveData.pressure} <small>bar</small></span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Motor Load</span>
                    <span className="metric-value">{liveData.power} <small>%</small></span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">RPM</span>
                    <span className="metric-value">{liveData.rpm}</span>
                  </div>
                  <div className="metric-card full-width">
                    <span className="metric-label">Temperature</span>
                    <span className={`metric-value ${liveData.temp > 50 ? 'warning' : ''}`}>
                      {liveData.temp} <small>°C</small>
                    </span>
                  </div>
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
        .flow-meter-pure {
          cursor: pointer;
          user-select: none;
          transition: transform 0.15s ease;
        }
        .flow-meter-pure:hover {
          transform: scale(1.08);
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