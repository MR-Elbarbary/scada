import React, { useState, useEffect } from 'react';

const DEFAULT_TELEMETRY = {
  level: 68,         // percentage %
  volume: 13.6,      // m³
  capacity: 20.0,    // m³
  inflow: 45.2,      // m³/h
  outflow: 42.0,     // m³/h
  temperature: 24.5, // °C
};

export default function TankNode({
  id = 'TK-101',
  label = 'Main Storage Tank',
  initialMode = 'auto', // 'auto' | 'manual' | 'drain'
  isFaulted = false,
  telemetry = DEFAULT_TELEMETRY,
  onModeChange,
  editMode = false,
  onClick,
}) {
  const [mode, setMode] = useState(initialMode);
  const [hasError, setHasError] = useState(isFaulted);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [liveData, setLiveData] = useState({ ...DEFAULT_TELEMETRY, ...telemetry });

  // Computed state
  const isHighLevel = liveData.level >= 90;
  const isLowLevel = liveData.level <= 10;
  const state = hasError ? 'error' : isHighLevel ? 'high_alarm' : isLowLevel ? 'low_alarm' : mode;

  // Industrial Skeuomorphic Theme Mapping
  const COLOR_MAP = {
    auto:       { primary: '#0ea5e9', liquidStart: '#0284c7', liquidEnd: '#0369a1', glow: 'rgba(14, 165, 233, 0.4)', text: '#38bdf8' },
    manual:     { primary: '#3b82f6', liquidStart: '#2563eb', liquidEnd: '#1d4ed8', glow: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa' },
    drain:      { primary: '#f59e0b', liquidStart: '#d97706', liquidEnd: '#b45309', glow: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24' },
    error:      { primary: '#ef4444', liquidStart: '#dc2626', liquidEnd: '#991b1b', glow: 'rgba(239, 68, 68, 0.4)', text: '#f87171' },
    high_alarm: { primary: '#ef4444', liquidStart: '#dc2626', liquidEnd: '#991b1b', glow: 'rgba(239, 68, 68, 0.4)', text: '#f87171' },
    low_alarm:  { primary: '#ef4444', liquidStart: '#dc2626', liquidEnd: '#991b1b', glow: 'rgba(239, 68, 68, 0.4)', text: '#f87171' },
  };

  const currentTheme = COLOR_MAP[state] || COLOR_MAP.auto;

  // Telemetry simulation logic
  useEffect(() => {
    if (hasError) return;

    const interval = setInterval(() => {
      setLiveData((prev) => {
        let levelDelta = (Math.random() - 0.5) * 2;
        if (mode === 'drain') levelDelta = -Math.abs(Math.random() * 3);

        const nextLevel = Math.min(Math.max(Number((prev.level + levelDelta).toFixed(1)), 0), 100);
        const nextVolume = Number(((nextLevel / 100) * prev.capacity).toFixed(1));

        return {
          ...prev,
          level: nextLevel,
          volume: nextVolume,
          inflow: mode === 'drain' ? 0 : Math.round(40 + (Math.random() - 0.5) * 10),
          outflow: Math.round(38 + (Math.random() - 0.5) * 10),
          temperature: Number((24 + (Math.random() - 0.5) * 1.5).toFixed(1)),
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [mode, hasError]);

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

  // Liquid Height Calculation for 3D Vessel Geometry (Vessel internal vertical bounds: Y=24 to Y=96, total 72px)
  const maxFillPixels = 72;
  const currentFillPixels = (liveData.level / 100) * maxFillPixels;
  const liquidY = 96 - currentFillPixels;

  return (
    <>
      {/* 1. Isometric / Skeuomorphic SVG Render */}
      <div className="tank-node-industrial flex flex-col items-center select-none" onClick={handleNodeClick}>
        <svg width="180" height="205" viewBox="0 0 120 140" className="drop-shadow-2xl">
          <defs>
            {/* Metallic Steel Vessel Gradient */}
            <linearGradient id={`metallic-body-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="45%" stopColor="#cbd5e1" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="85%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Top Elliptical Dome Metallic Shading */}
            <radialGradient id={`dome-top-${id}`} cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* Pipe Metallic Shading */}
            <linearGradient id={`pipe-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* 3D Liquid Volume Gradient */}
            <linearGradient id={`liquid-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={currentTheme.liquidEnd} stopOpacity="0.85" />
              <stop offset="40%" stopColor={currentTheme.liquidStart} stopOpacity="0.95" />
              <stop offset="100%" stopColor={currentTheme.liquidEnd} stopOpacity="0.9" />
            </linearGradient>

            {/* Glass Cutout Clip Area for Internal Fluid Render */}
            <clipPath id={`vessel-inner-clip-${id}`}>
              <rect x="25" y="24" width="70" height="72" rx="4" />
            </clipPath>
          </defs>

          {/* Top Inlet & Bottom Outlet Flange Pipes (3D Metallic Cylinder) */}
          <rect x="54" y="2" width="12" height="14" fill={`url(#pipe-grad-${id})`} rx="1" />
          <ellipse cx="60" cy="2" rx="9" ry="3" fill="#64748b" stroke="#334155" strokeWidth="1" />
          
          <rect x="54" y="108" width="12" height="14" fill={`url(#pipe-grad-${id})`} rx="1" />
          <ellipse cx="60" cy="122" rx="9" ry="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />

          {/* Tank Concrete Stand Base Shadow */}
          <ellipse cx="60" cy="118" rx="42" ry="10" fill="#000000" fillOpacity="0.5" />

          {/* Steel Support Legs */}
          <rect x="23" y="98" width="8" height="18" fill="url(#pipe-grad-TK-101)" rx="1" />
          <rect x="89" y="98" width="8" height="18" fill="url(#pipe-grad-TK-101)" rx="1" />

          {/* Tank Base Ellipse (Bottom 3D Dome cap) */}
          <ellipse cx="60" cy="96" rx="38" ry="12" fill="#1e293b" stroke="#475569" strokeWidth="1" />

          {/* Main Metallic Tank Vessel Body */}
          <rect x="22" y="24" width="76" height="72" fill={`url(#metallic-body-${id})`} />

          {/* Sight-Glass / Window Frame cut for fluid visibility */}
          <rect x="36" y="24" width="48" height="72" fill="#020617" fillOpacity="0.75" stroke="#334155" strokeWidth="1.5" />

          {/* Internal Liquid Filling with 3D Volume Surface */}
          <g clipPath={`url(#vessel-inner-clip-${id})`}>
            {/* Fluid Main Block */}
            <rect
              x="36"
              y={liquidY}
              width="48"
              height={currentFillPixels + 12}
              fill={`url(#liquid-grad-${id})`}
              className="transition-all duration-500 ease-out"
            />
            {/* 3D Liquid Surface Ellipse */}
            <ellipse
              cx="60"
              cy={liquidY}
              rx="24"
              ry="6"
              fill={currentTheme.primary}
              fillOpacity="0.8"
              stroke="#ffffff"
              strokeWidth="0.75"
              strokeOpacity="0.6"
              className="transition-all duration-500 ease-out"
            />
          </g>

          {/* Glass Reflection Highlight overlay */}
          <rect x="38" y="24" width="8" height="72" fill="#ffffff" fillOpacity="0.08" />

          {/* Top Elliptical Metallic Cap (Dome Roof) */}
          <ellipse cx="60" cy="24" rx="38" ry="12" fill={`url(#dome-top-${id})`} stroke="#94a3b8" strokeWidth="1" />

          {/* Manhole / Maintenance Hatch on Top Cap */}
          <ellipse cx="60" cy="20" rx="14" ry="4" fill="#334155" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="60" cy="19" rx="10" ry="2.5" fill="#475569" />

          {/* Side Industrial Access Ladder */}
          <g stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
            <line x1="20" y1="18" x2="20" y2="106" />
            <line x1="26" y1="18" x2="26" y2="106" />
            {/* Ladder Rungs */}
            {[28, 38, 48, 58, 68, 78, 88, 98].map((rungY) => (
              <line key={rungY} x1="20" y1={rungY} x2="26" y2={rungY} stroke="#cbd5e1" strokeWidth="1" />
            ))}
          </g>

          {/* Graduation Level Marks on Glass */}
          <g stroke="#94a3b8" strokeWidth="1" opacity="0.6">
            <line x1="37" y1="36" x2="43" y2="36" />
            <line x1="37" y1="60" x2="47" y2="60" strokeWidth="1.5" />
            <line x1="37" y1="84" x2="43" y2="84" />
          </g>

          {/* Digital Level Reading Badge */}
          <g transform="translate(60, 60)">
            <rect x="-20" y="-10" width="40" height="20" rx="4" fill="#0f172a" fillOpacity="0.85" stroke="#475569" strokeWidth="1" />
            <text
              x="0"
              y="4"
              fill="#f8fafc"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono tracking-tight"
            >
              {Math.round(liveData.level)}%
            </text>
          </g>

          {/* Industrial Alarm Beacon Light on Top */}
          {(hasError || isHighLevel || isLowLevel) && (
            <g transform="translate(60, 4)">
              <ellipse cx="0" cy="0" rx="8" ry="3" fill="#7f1d1d" />
              <path d="M-6,0 L-4,-12 L4,-12 L6,0 Z" fill="#ef4444" className="animate-pulse" />
              <ellipse cx="0" cy="-12" rx="4" ry="1.5" fill="#fca5a5" />
            </g>
          )}
        </svg>

      </div>

      {/* 2. Heavy Industrial Modal Dialog */}
      {isDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="dialog-modal border-2 border-slate-600 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="dialog-header bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                <div>
                  <h3 className="font-mono uppercase text-sm tracking-wider">{label}</h3>
                  <span className="device-id font-mono">TAG: {id}</span>
                </div>
              </div>
              <button className="close-btn hover:text-white" onClick={() => setIsDialogOpen(false)}>
                ✕
              </button>
            </header>

            <div className="dialog-body bg-slate-950">
              {/* Status Header */}
              <div className="status-banner" style={{ borderColor: currentTheme.primary }}>
                <span className="status-title font-mono uppercase">Vessel Status:</span>
                <span className="status-badge font-mono" style={{ color: currentTheme.text }}>
                  {state.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              {/* Tank Level Progress Bar */}
              <div className="gauge-container mb-4 bg-slate-900 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Capacity Volume</span>
                  <span>{liveData.volume} / {liveData.capacity} m³</span>
                </div>
                <div className="w-full h-4 bg-slate-950 rounded overflow-hidden border border-slate-700 p-0.5">
                  <div
                    className="h-full rounded-xs transition-all duration-300"
                    style={{
                      width: `${liveData.level}%`,
                      background: `linear-gradient(90deg, ${currentTheme.liquidStart}, ${currentTheme.primary})`
                    }}
                  />
                </div>
              </div>

              {/* Live Telemetry Grid */}
              <section className="readings-section">
                <h4 className="font-mono">Telemetry Readout</h4>
                <div className="metrics-grid">
                  <div className="metric-card bg-slate-900 border-slate-800">
                    <span className="metric-label font-mono">Level %</span>
                    <span className="metric-value font-mono">{liveData.level}%</span>
                  </div>
                  <div className="metric-card bg-slate-900 border-slate-800">
                    <span className="metric-label font-mono">Volume</span>
                    <span className="metric-value font-mono">{liveData.volume} <small>m³</small></span>
                  </div>
                  <div className="metric-card bg-slate-900 border-slate-800">
                    <span className="metric-label font-mono">Inflow</span>
                    <span className="metric-value font-mono text-emerald-400">{liveData.inflow} <small>m³/h</small></span>
                  </div>
                  <div className="metric-card bg-slate-900 border-slate-800">
                    <span className="metric-label font-mono">Outflow</span>
                    <span className="metric-value font-mono text-amber-400">{liveData.outflow} <small>m³/h</small></span>
                  </div>
                  <div className="metric-card full-width bg-slate-900 border-slate-800">
                    <span className="metric-label font-mono">Fluid Temp</span>
                    <span className="metric-value font-mono text-slate-200">{liveData.temperature} <small>°C</small></span>
                  </div>
                </div>
              </section>

              {/* Control Panel */}
              <section className="control-section">
                <div className="control-section-header">
                  <h4 className="font-mono">Mode Control</h4>
                  <button
                    className={`trip-toggle-btn font-mono ${hasError ? 'active' : ''}`}
                    onClick={() => setHasError(!hasError)}
                  >
                    {hasError ? 'Clear Trip' : 'Trip Alarm'}
                  </button>
                </div>

                <div className="rotary-switch-container bg-slate-900 border border-slate-800">
                  <div className="rotary-labels font-mono">
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
                      MAN
                    </span>
                    <span
                      className={`label-off ${mode === 'drain' ? 'active' : ''}`}
                      onClick={() => handleModeSwitch('drain')}
                    >
                      DRAIN
                    </span>
                  </div>

                  <div className="rotary-dial-wrapper border-slate-700 bg-slate-950">
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
        .tank-node-industrial {
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .tank-node-industrial:hover {
          transform: translateY(-2px) scale(1.04);
        }

        .dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .dialog-modal {
          background: #090d16;
          border-radius: 8px;
          width: 360px;
          color: #f8fafc;
          overflow: hidden;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid #334155;
        }
        .dialog-header h3 { margin: 0; font-size: 14px; }
        .device-id { font-size: 11px; color: #64748b; }
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
          background: #0f172a;
          border-left: 4px solid;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        .status-title { font-size: 11px; color: #94a3b8; }
        .status-badge { font-weight: 700; font-size: 12px; }

        .readings-section h4, .control-section h4 {
          margin: 0 0 10px 0;
          font-size: 11px;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.5px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }
        .metric-card {
          padding: 8px 10px;
          border-radius: 4px;
          border: 1px solid #1e293b;
        }
        .metric-card.full-width { grid-column: span 2; }
        .metric-label { font-size: 10px; color: #64748b; display: block; }
        .metric-value { font-size: 15px; font-weight: 700; color: #0ea5e9; }
        .metric-value small { font-size: 10px; color: #64748b; font-weight: 400; }

        .control-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .trip-toggle-btn {
          background: #1e293b;
          border: 1px solid #334155;
          color: #f8fafc;
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
        .trip-toggle-btn.active {
          background: #ef4444;
          border-color: #dc2626;
        }

        .rotary-switch-container {
          border-radius: 6px;
          padding: 14px;
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
          margin-bottom: 10px;
        }
        .rotary-labels span {
          cursor: pointer;
          color: #475569;
          transition: color 0.2s;
        }
        .rotary-labels span.active.label-auto { color: #0ea5e9; }
        .rotary-labels span.active.label-manual { color: #3b82f6; }
        .rotary-labels span.active.label-off { color: #f59e0b; }

        .rotary-dial-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 2px solid #334155;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rotary-knob {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: linear-gradient(145deg, #334155, #0f172a);
          border: 1px solid #475569;
          position: relative;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 6px rgba(0,0,0,0.5);
        }
        .knob-indicator {
          width: 4px;
          height: 14px;
          background: #0ea5e9;
          border-radius: 2px;
          position: absolute;
          top: 3px;
          left: calc(50% - 2px);
        }

        .rotary-knob.position-auto { transform: rotate(-45deg); }
        .rotary-knob.position-manual { transform: rotate(0deg); }
        .rotary-knob.position-drain { transform: rotate(45deg); }
      `}</style>
    </>
  );
}