import { useState, useEffect } from 'react';
import {
  IxApplication,
  IxApplicationHeader,
  IxContent,
  IxContentHeader,
  IxCard,
  IxButton,
  IxLayoutGrid,
  IxCol,
} from '@siemens/ix-react';

export default function WaterTreatmentScada() {
  // Real-time telemetry simulation state
  const [pumpActive, setPumpActive] = useState(true);
  const [tankLevel, setTankLevel] = useState(65); // percentage (0-100)
  const [psiPressure, setPsiPressure] = useState(42.5);

  // Simulating real-time Modbus/MQTT data streaming
  useEffect(() => {
    const interval = setInterval(() => {
      if (pumpActive) {
        setTankLevel((prev) => Math.min(100, Number((prev + (Math.random() - 0.3)).toFixed(1))));
        setPsiPressure(() => Number((40 + Math.random() * 5).toFixed(1)));
      } else {
        setTankLevel((prev) => Math.max(0, Number((prev - 0.2).toFixed(1))));
        setPsiPressure((prev) => Math.max(0, Number((prev * 0.9).toFixed(1))));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pumpActive]);

  return (
    <IxApplication theme="theme-corporate-dark">
      {/* 1. Global Application Header */}
      <IxApplicationHeader name="Enterprise SCADA Node v2.6">
        <div className="placeholder-logo" slot="logo"></div>
      </IxApplicationHeader>

      {/* 2. Main Content Canvas */}
      <IxContent>
        <IxContentHeader 
          title="Wastewater Filtration Facility" 
          headerSubtitle="Substation Node 04 - Active Telemetry"
        >
          <IxButton 
            variant={pumpActive ? "danger" : "primary"} 
            onClick={() => setPumpActive(!pumpActive)}
          >
            {pumpActive ? 'Emergency Pump Stop' : 'Initiate Main Pump'}
          </IxButton>
        </IxContentHeader>

        {/* 3. Industrial Grid Layout */}
        <IxLayoutGrid columns={12}>
          
          {/* COLUMN A: Dynamic 2D Schematic Mocked Vector Area */}
          <IxCol size={8} sizeMd={12} sizeLg={8}>
            <IxCard variant="insight" headerTitle="Process Schematic Diagram">
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '24px', background: '#1d252d', borderRadius: '4px' }}>
                
                {/* REPRESENTATION: 2D Custom SVGs with interactive dynamic hooks */}
                <div style={{ textAlign: 'center' }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    {/* Pump Housing */}
                    <circle cx="50" cy="50" r="40" fill="#2d3748" stroke="#718096" strokeWidth="3" />
                    {/* Dynamic Status Indicator Fill */}
                    <circle cx="50" cy="50" r="30" fill={pumpActive ? '#00875a' : '#dee2e6'} opacity="0.15" />
                    {/* Rotating Fin Indicators */}
                    <g className={pumpActive ? 'pump-rotor active' : 'pump-rotor'}>
                      <path d="M50,15 L50,85 M15,50 L85,50" stroke={pumpActive ? '#00ce7d' : '#a0aec0'} strokeWidth="4" strokeLinecap="round" />
                    </g>
                  </svg>
                  <div style={{ color: '#e2e8f0', marginTop: '8px', fontWeight: 'bold' }}>Main Pump (P-101)</div>
                </div>

                {/* Connection Pipeline Graphic */}
                <svg width="120" height="20">
                  <rect x="0" y="5" width="120" height="10" fill="#2d3748" stroke="#4a5568" />
                  {/* Fluid flow animation overlay conditional on pump state */}
                  {pumpActive && (
                    <line x1="0" y1="10" x2="120" y2="10" stroke="#3182ce" strokeWidth="4" strokeDasharray="10, 10" className="fluid-flow-animation" />
                  )}
                </svg>

                {/* Processing Container Storage Tank */}
                <div style={{ textAlign: 'center' }}>
                  <svg width="120" height="160" viewBox="0 0 120 160">
                    {/* Structural Outline */}
                    <rect x="10" y="10" width="100" height="140" fill="none" stroke="#a0aec0" strokeWidth="3" rx="5" />
                    {/* Dynamic Fluid Content level transformation */}
                    <rect 
                      x="12" 
                      y={10 + (140 - (140 * (tankLevel / 100)))} 
                      width="96" 
                      height={140 * (tankLevel / 100)} 
                      fill={tankLevel > 85 ? '#de1a1a' : '#3182ce'} 
                      opacity="0.7"
                      rx="2"
                    />
                    {/* Grid Overlay markings */}
                    <line x1="10" y1="45" x2="25" y2="45" stroke="#fff" strokeWidth="2" />
                    <line x1="10" y1="80" x2="35" y2="80" stroke="#fff" strokeWidth="2" />
                    <line x1="10" y1="115" x2="25" y2="115" stroke="#fff" strokeWidth="2" />
                  </svg>
                  <div style={{ color: '#e2e8f0', marginTop: '8px', fontWeight: 'bold' }}>Holding Tank (T-204)</div>
                </div>

              </div>
            </IxCard>
          </IxCol>

          {/* COLUMN B: Instrumentation & Telemetry Panels */}
          <IxCol size={4} sizeMd={12} sizeLg={4}>
            
            <IxCard variant="insight" headerTitle="Process Telemetry Metrics" style={{ marginBottom: '16px' }}>
              <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <span aria-hidden="true" style={{ fontSize: '28px', color: '#4a5568', marginRight: '12px', lineHeight: 1 }}>◔</span>
                  <div>
                    <small style={{ color: '#a0aec0', display: 'block' }}>SYSTEM PRESSURE</small>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: psiPressure > 44 ? '#de1a1a' : '#e2e8f0' }}>
                      {psiPressure} PSI
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span aria-hidden="true" style={{ fontSize: '28px', color: '#4a5568', marginRight: '12px', lineHeight: 1 }}>▣</span>
                  <div>
                    <small style={{ color: '#a0aec0', display: 'block' }}>VOLUME CAPACITY</small>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#e2e8f0' }}>
                      {tankLevel}%
                    </span>
                  </div>
                </div>
              </div>
            </IxCard>

            <IxCard variant="insight" headerTitle="Active Supervisor Alarms">
              <div style={{ padding: '12px' }}>
                {tankLevel > 85 ? (
                  <div style={{ background: 'rgba(222,26,26,0.15)', borderLeft: '4px solid #de1a1a', padding: '8px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                    <span aria-hidden="true" style={{ color: '#de1a1a', marginRight: '8px', fontSize: '16px' }}>⚠</span>
                    <span style={{ color: '#ff8080', fontSize: '12px', fontWeight: 'bold' }}>CRITICAL: T-204 HIGH LEVEL OVERFLOW THRESHOLD</span>
                  </div>
                ) : (
                  <div style={{ color: '#a0aec0', fontSize: '13px', fontStyle: 'italic' }}>
                    All local loops running within normal parameters.
                  </div>
                )}
              </div>
            </IxCard>

          </IxCol>
        </IxLayoutGrid>
      </IxContent>

      {/* Global CSS injection for fluid pipeline vector velocity animation handling */}
      <style>{`
        .fluid-flow-animation {
          stroke-dasharray: 8;
          animation: dash 1s linear infinite;
        }

        .pump-rotor {
          transform-box: fill-box;
          transform-origin: center;
        }

        .pump-rotor.active {
          animation: pump-spin 1.2s linear infinite;
        }

        @keyframes dash {
          to {
            stroke-dashoffset: -16;
          }
        }

        @keyframes pump-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </IxApplication>
  );
}
