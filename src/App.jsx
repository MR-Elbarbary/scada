import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import PumpNode from './PumpNode.jsx';
import TankNode from './TankNode.jsx';
import FlowmeterNode from './FlowmeterNode.jsx';
import TransformerNode from './TransformerNode.jsx';
import IndustrialPipesCanvas from './IndustrialPipesCanvas.jsx';


const Node_TEMPLATE = {
  label: 'Pump',
  color: 'amber',
  metrics: ['Flow', 'Pressure', 'Power', 'Temp', 'rpm'],
};

const NODE_COMPONENTS = {
  pump: PumpNode,
  tank: TankNode,
  flowmeter: FlowmeterNode,
  transformer: TransformerNode
};


const initialNodes = [
  {
    id: 'p1',
    type: 'pump',
    label: 'PMP-01',
    x: 120,
    y: 180,
      mode: 'auto',
      isFaulted: false,
      telemetry: {
        flow: 120,
        pressure: 4.2,
        power: 78,
        temp: 45.5,
        rpm: 2950,
      },

  },
  {
    id: 't1',
    type:'tank',
    label:'TNK-01',
    x: 300,
    y: 400,
    mode: 'auto',
      isFaulted: false,
      telemetry: {
      },
  }]
const initialConnections = [{ id: 'c1', from: 'p1', to: 't1' }];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}


// refactor this function

function getNodeCenter(node) {
  // Center relative to 100x110 SVG dimensions of PumpNode
  return { x: node.x + 50, y: node.y + 50 };
}

export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [connections, setConnections] = useState(initialConnections);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [liveMode, setLiveMode] = useState(true);
  const [connectionMode, setConnectionMode] = useState(false);
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState(null);
  const dragState = useRef(null);
  const schemaPanelRef = useRef(null);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(true);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsCanvasFullscreen(document.fullscreenElement === schemaPanelRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Live Telemetry Simulation for Pumps
  useEffect(() => {
    if (!liveMode) return undefined;

    // fix this !!!!!
    const interval = setInterval(() => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.mode === 'off' || node.isFaulted) {
            return {
              ...node,
              telemetry: {
                ...node.telemetry,
                flow: 0,
                pressure: Number((node.telemetry.pressure * 0.85).toFixed(1)),
                power: 0,
                rpm: 0,
              },
            };
          }

          return {
            ...node,
            telemetry: {
              flow: Math.round(clamp(node.telemetry.flow + (Math.random() - 0.5) * 20, 50, 180)),
              pressure: Number(clamp(node.telemetry.pressure + (Math.random() - 0.5) * 0.8, 2.0, 8.5).toFixed(1)),
              power: Math.round(clamp(node.telemetry.power + (Math.random() - 0.5) * 15, 30, 100)),
              temp: Number(clamp(node.telemetry.temp + (Math.random() - 0.5) * 2, 30, 85).toFixed(1)),
              rpm: Math.round(clamp(node.telemetry.rpm + (Math.random() - 0.5) * 100, 2400, 3200)),
            },
          };
        })
      );
    }, 1800);

    return () => clearInterval(interval);
  }, [liveMode]);

  const selectedNode = nodes.find((p) => p.id === selectedId) ?? nodes[0] ?? null;
  const canvasBounds = useMemo(
    () => ({
      width: Math.max(900, ...nodes.map((node) => node.x + 190)),
      height: Math.max(560, ...nodes.map((node) => node.y + 140)),
    }),
    [nodes]
  );

  const handleNodePointerDown = (event, node) => {
    if (connectionMode) return;
    if (!editMode) return;

    const rect = event.currentTarget.getBoundingClientRect();

    dragState.current = {
      nodeId: node.id,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    setSelectedId(node.id);
    setSelectedConnectionId(null);
  };

  const handleNodeChange = (nodeId, changes) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...changes,
              },
            }
          : node
      )
    );
  };

  // Generate path vectors between dynamic SVG pump coordinates
  const connectionData = useMemo(() => {
    return connections
      .map((connection) => {
        const fromNode = nodes.find((n) => n.id === connection.from);
        const toNode = nodes.find((n) => n.id === connection.to);

        if (!fromNode || !toNode) return null;

        const start = getNodeCenter(fromNode);
        const end = getNodeCenter(toNode);
        const midX = start.x + (end.x - start.x) / 2;

        return {
          ...connection,
          start,
          end,
          midX,
          isSelected: connection.id === selectedConnectionId,
          // 90-degree orthogonal elbow routing path
          d: `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`,
        };
      })
      .filter(Boolean);
  }, [connections, nodes, selectedConnectionId]);

  const addNode = (type) => {
    const nextId = `p-${Date.now()}`;
    const telemetry = type === 'tank'
      ? { level: 68, volume: 13.6, capacity: 20.0, inflow: 45.2, outflow: 42.0, temperature: 24.5 }
      : { flow: 110, pressure: 4.0, power: 75, temp: 40.0, rpm: 2900 };
    const newNode = {
      id: nextId,
      type,
      label: `${type.toUpperCase()}-${nodes.length + 1}`,
      x: 100 + (nodes.length % 4) * 120,
      y: 150 + Math.floor(nodes.length / 4) * 120,
      mode: 'auto',
      isFaulted: false,
      telemetry,
      editMode: editMode
    };

    setNodes((current) => [...current, newNode]);
    setSelectedId(nextId);
  };


  const addConnection = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;

    setConnections((current) => {
      const alreadyExists = current.some(
        (c) => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
      );
      if (alreadyExists) return current;
      return [...current, { id: `c-${Date.now()}`, from: fromId, to: toId }];
    });
  };

  const deleteConnection = (connectionId) => {
    setConnections((current) => current.filter((c) => c.id !== connectionId));
    setSelectedConnectionId((current) => (current === connectionId ? null : current));
  };

  

  const deleteNode = (nodeId) => {
    if (!nodeId) return;
    setNodes((current) => current.filter((p) => p.id !== nodeId));
    setConnections((current) => current.filter((c) => c.from !== nodeId && c.to !== nodeId));
    setSelectedId((current) => (current === nodeId ? null : current));
    setSelectedConnectionId(null);
    setPendingConnectionSourceId((current) => (current === nodeId ? null : current));
  };

  const handleNodeClick = (nodeId) => {
    if (connectionMode) {
      if (pendingConnectionSourceId && pendingConnectionSourceId !== nodeId) {
        addConnection(pendingConnectionSourceId, nodeId);
      }
      setConnectionMode(false);
      setPendingConnectionSourceId(null);
      setSelectedId(nodeId);
      return;
    }

    setSelectedId(nodeId);
    setSelectedConnectionId(null);
  };

  // Node Dragging Handler
  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragState.current) return;
      const { nodeId, offsetX, offsetY } = dragState.current;
      const canvas = document.querySelector('.schema-canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const nextX = clamp(event.clientX - rect.left - offsetX, 10, rect.width - 110);
      const nextY = clamp(event.clientY - rect.top - offsetY, 10, rect.height - 120);

      setNodes((current) =>
        current.map((node) => (node.id === nodeId ? { ...node, x: nextX, y: nextY } : node))
      );
    };

    const handlePointerUp = () => {
      dragState.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const handleModeChange = (nodeId, newMode) => {
    setNodes((current) =>
      current.map((p) => (p.id === nodeId ? { ...p, mode: newMode } : p))
    );
  };

  const toggleCanvasFullscreen = () => {
    if (!schemaPanelRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    if (schemaPanelRef.current.requestFullscreen) {
      schemaPanelRef.current.requestFullscreen();
    } else {
      setIsCanvasFullscreen(true);
    }
  };

  return (
    <div className="scada-app">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">PMP</div>
          <div>
            <p className="eyebrow">CONTROL SYSTEM</p>
            <h1>PUMP LOOP SCADA</h1>
          </div>
        </div>

        <div className="palette">
          <p className="panel-label">DEVICE LIBRARY</p>
          {Object.keys(NODE_COMPONENTS).map((key) => (
            <button
              key={key}
              type="button"
              className="asset-button"
              onClick={() => addNode(key)}
            >
              <span className={`dot dot-${Node_TEMPLATE.color}`} />
              Add {key} Node
            </button>
          ))}
        </div>

        <div className="quick-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (!selectedId) return;
              setConnectionMode((value) => {
                const next = !value;
                setPendingConnectionSourceId(next ? selectedId : null);
                setSelectedConnectionId(null);
                return next;
              });
            }}
          >
            {connectionMode ? 'Cancel Connection' : 'Connect Selected'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => selectedConnectionId && deleteConnection(selectedConnectionId)}
          >
            Delete Connection
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => selectedId && deleteNode(selectedId)}
          >
            Delete Node
          </button>
          <button type="button" className="secondary" onClick={() => setLiveMode((v) => !v)}>
            {liveMode ? 'Pause Telemetry' : 'Resume Telemetry'}
          </button>

          <button type="button" className={`secondary ${editMode? 'on' : 'off'}`} onClick={() => setEditMode((v) => !v)}>
            {editMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">PROCESS SCHEMATIC</p>
            <h2>Pumping Substation Network</h2>
          </div>
          <div className="topbar-metrics">
            <div className="mini-metric">
              <span>STATUS</span>
              <strong className="good">ONLINE</strong>
            </div>
            <div className="mini-metric">
              <span>ACTIVE Nodes</span>
              <strong>{nodes.filter((p) => p.mode !== 'off' && !p.isFaulted).length}</strong>
            </div>
          </div>
        </header>

        <div className="content-grid">
          <section
            ref={schemaPanelRef}
            className={`schema-panel ${isCanvasFullscreen ? 'is-fullscreen' : ''}`}
          >
            <div className="panel-header">
              <span>CANVAS DIAGRAM</span>
              <div className="panel-header-actions">
                <span className="status-pill">LIVE</span>
                <button
                  type="button"
                  className="fullscreen-button"
                  onClick={toggleCanvasFullscreen}
                  aria-label={isCanvasFullscreen ? 'Exit full screen' : 'Open canvas in full screen'}
                >
                  {isCanvasFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                </button>
              </div>
            </div>

            <div
              className="schema-canvas"
              style={{
                position: 'relative',
                minWidth: `${canvasBounds.width}px`,
                minHeight: `${canvasBounds.height}px`,
              }}
            >
              {/* Dynamic Connecting Lines SVG Layer */}
              {/* 1. Industrial Pipes Canvas Layer */}
              <IndustrialPipesCanvas
                connectionData={connectionData}
                onSelectConnection={(id) => {
                  setSelectedConnectionId(id);
                  setSelectedId(null);
                }}
              />
              {/* Nodes */}
              {nodes.map((node) => {
                const NodeComponent = NODE_COMPONENTS[node.type];

                if (!NodeComponent) return null;

                return (
                  <div
                    key={node.id}
                    className="node-wrapper"
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                    }}
                    onPointerDown={(event) =>
                      handleNodePointerDown(event, node)
                    }
                  >
                    <NodeComponent
                      id={node.id}
                      label={node.label}
                      initialMode={node.mode}
                      isFaulted={node.isFaulted}
                      telemetry={node.telemetry}
                      editMode={editMode}
                      onModeChange={handleModeChange}
                      onChange={handleNodeChange}
                      onClick={() => handleNodeClick(node.id)}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Side Monitor Inspector */}
          <aside className="monitor-panel">
            <div className="panel-header">
              <span>INSPECTOR</span>
            </div>

            <div className="detail-card">
              <p className="panel-label">
                {selectedConnectionId
                  ? 'SELECTED PATH'
                  : selectedNode
                  ? 'SELECTED PUMP'
                  : 'NO SELECTION'}
              </p>

              {selectedConnectionId ? (
                <>
                  <h3>
                    {connections.find((c) => c.id === selectedConnectionId)?.from} →{' '}
                    {connections.find((c) => c.id === selectedConnectionId)?.to}
                  </h3>
                  <p className="detail-meta">Pipe Pipeline Link</p>
                </>
              ) : selectedNode ? (
                <>
                  <h3>{selectedNode.label}</h3>
                  <p className="detail-meta">ID: {selectedNode.id}</p>
                  <div className="detail-list">
                    <span>Mode: {selectedNode.mode.toUpperCase()}</span>
                    <span>Flow: {selectedNode.telemetry.flow} m³/h</span>
                    <span>Pressure: {selectedNode.telemetry.pressure} bar</span>
                    <span>Power: {selectedNode.telemetry.power}%</span>
                    <span>Temp: {selectedNode.telemetry.temp} °C</span>
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}