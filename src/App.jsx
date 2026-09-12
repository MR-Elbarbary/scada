import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import PumpNode from './PumpNode.jsx';
import TankNode from './TankNode.jsx';
import FlowmeterNode from './FlowmeterNode.jsx';
import TransformerNode from './TransformerNode.jsx';
import IndustrialPipesCanvas from './IndustrialPipesCanvas.jsx';
import ValveNode from './ValveNode.jsx';


const Node_TEMPLATE = {
  label: 'Pump',
  color: 'amber',
  metrics: ['Flow', 'Pressure', 'Power', 'Temp', 'rpm'],
};

const NODE_COMPONENTS = {
  pump: PumpNode,
  tank: TankNode,
  flowmeter: FlowmeterNode,
  transformer: TransformerNode,
  valve: ValveNode,
};


const initialNodes = [];
const initialConnections = [];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}


// refactor this function

function getNodeCenter(node) {
  // Center relative to 100x110 SVG dimensions of PumpNode
  return { x: node.x + 50, y: node.y + 50 };
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function readingToTelemetry(reading) {
  const metrics = reading.metrics ?? {};
  const temperatureValid = metrics.temperature_valid ?? metrics.temp_valid ?? metrics.TEMP_VALID
    ?? reading.temperature_valid ?? reading.temp_valid ?? reading.TEMP_VALID;
  const currentValid = metrics.i_valid ?? metrics.I_VALID ?? reading.i_valid ?? reading.I_VALID;
  const backendFault = ['fault', 'error', 'alarm'].includes(String(reading.state).toLowerCase());

  return {
    mode: String(reading.state).toLowerCase() === 'off' ? 'off' : 'auto',
    isFaulted: backendFault,
    faultReason: backendFault ? 'Pump fault reported by telemetry' : '',
    telemetry: {
      current: [metrics.i_l1, metrics.i_l2, metrics.i_l3],
      unbalance: metrics.unbalance_percentage,
      temperature: metrics.temperature,
      temperatureValid,
      currentValid,
    },
  };
}

function createPumpNode(reading, index, id) {
  return {
    id,
    pumpId: String(reading.id),
    type: 'pump',
    label: reading.name || `Pump ${reading.id}`,
    x: 100 + (index % 4) * 180,
    y: 120 + Math.floor(index / 4) * 150,
    tags: ['heat'],
    ...readingToTelemetry(reading),
  };
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
  const generatedNodeId = useRef(0);
  const schemaPanelRef = useRef(null);
  const loadedLayoutGateway = useRef('');
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [gatewayStatus, setGatewayStatus] = useState('Loading gateways...');
  const [pumpReadings, setPumpReadings] = useState([]);
  const [selectedPumpId, setSelectedPumpId] = useState('');
  const generatedConnectionId = useRef(0);

  const layoutStorageKey = selectedGateway ? `scada-layout:${selectedGateway}` : '';

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsCanvasFullscreen(document.fullscreenElement === schemaPanelRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!selectedGateway) return;

    let savedLayout = null;
    try {
      savedLayout = JSON.parse(localStorage.getItem(layoutStorageKey) || 'null');
    } catch {
      savedLayout = null;
    }

    loadedLayoutGateway.current = selectedGateway;
    const restoreTimer = window.setTimeout(() => {
      setNodes(savedLayout?.nodes ?? []);
      setConnections(savedLayout?.connections ?? []);
      setSelectedId(savedLayout?.nodes?.[0]?.id ?? null);
      setSelectedConnectionId(null);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [layoutStorageKey, selectedGateway]);

  useEffect(() => {
    if (!layoutStorageKey || loadedLayoutGateway.current !== selectedGateway) return;
    localStorage.setItem(layoutStorageKey, JSON.stringify({ nodes, connections }));
  }, [layoutStorageKey, nodes, connections, selectedGateway]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/gw`)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load gateways');
        return response.json();
      })
      .then((payload) => {
        const nextGateways = payload.data ?? [];
        setGateways(nextGateways);
        setSelectedGateway(nextGateways[0]?.gw ?? '');
        setGatewayStatus(nextGateways.length ? '' : 'No gateways found');
      })
      .catch(() => setGatewayStatus('Backend unavailable'));
  }, []);

  useEffect(() => {
    if (!selectedGateway) return undefined;

    let isCurrent = true;
    const loadReadings = () => {
      setGatewayStatus('Loading pump data...');
      fetch(`${API_BASE_URL}/api/gw_readings/${encodeURIComponent(selectedGateway)}`)
        .then((response) => {
          if (!response.ok) throw new Error('Unable to load pump data');
          return response.json();
        })
        .then((payload) => {
          if (!isCurrent) return;
          const nextReadings = payload.data ?? [];
          setPumpReadings(nextReadings);
          setSelectedPumpId((current) => (
            nextReadings.some((reading) => String(reading.id) === String(current))
              ? current
              : String(nextReadings[0]?.id ?? '')
          ));
          setNodes((currentNodes) => currentNodes.map((node) => {
            if (node.type !== 'pump') return node;
            const reading = nextReadings.find((item) => String(item.id) === String(node.pumpId));
            return reading ? { ...node, ...readingToTelemetry(reading) } : node;
          }));
          setGatewayStatus(`${nextReadings.length} pump${nextReadings.length === 1 ? '' : 's'} available`);
        })
        .catch(() => {
          if (isCurrent) setGatewayStatus('Unable to load pump data');
        });
    };

    loadReadings();
    const interval = liveMode ? setInterval(loadReadings, 5000) : undefined;

    return () => {
      isCurrent = false;
      if (interval) clearInterval(interval);
    };
  }, [selectedGateway, liveMode]);

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

  const handleTagsChange = (nodeId, tags) => {
    setNodes((current) => current.map((node) => (
      node.id === nodeId ? { ...node, tags } : node
    )));
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
    if (type === 'pump') {
      const reading = pumpReadings.find((item) => String(item.id) === String(selectedPumpId));
      if (!reading || nodes.some((node) => node.pumpId === String(reading.id))) return;
      generatedNodeId.current += 1;
      const nextId = `pump-node-${generatedNodeId.current}`;
      const newNode = createPumpNode(reading, nodes.length, nextId);
      setNodes((current) => [...current, newNode]);
      setSelectedId(nextId);
      return;
    }

    generatedNodeId.current += 1;
    const nextId = `p-${generatedNodeId.current}`;
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
      editMode: editMode,
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
      generatedConnectionId.current += 1;
      return [...current, { id: `c-${generatedConnectionId.current}`, from: fromId, to: toId }];
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
          <label className="panel-label" htmlFor="pump-association">ASSOCIATE PUMP</label>
          <select
            id="pump-association"
            className="gateway-select"
            value={selectedPumpId}
            onChange={(event) => setSelectedPumpId(event.target.value)}
            disabled={!pumpReadings.length}
          >
            {!pumpReadings.length && <option value="">Fetch a gateway first</option>}
            {pumpReadings.map((pump) => {
              const isAttached = nodes.some((node) => node.pumpId === String(pump.id));
              return (
                <option key={pump.id} value={pump.id} disabled={isAttached}>
                  {pump.name || `Pump ${pump.id}`}{isAttached ? ' (added)' : ''}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            className="asset-button"
            onClick={() => addNode('pump')}
            disabled={!selectedPumpId || nodes.some((node) => node.pumpId === String(selectedPumpId))}
          >
            <span className="dot dot-amber" />
            Create Pump Node
          </button>
          {Object.keys(NODE_COMPONENTS).filter((key) => key !== 'pump').map((key) => (
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

        <div className="gateway-picker">
          <label className="panel-label" htmlFor="gateway-select">GATEWAY SITE</label>
          <select
            id="gateway-select"
            className="gateway-select"
            value={selectedGateway}
            onChange={(event) => setSelectedGateway(event.target.value)}
            disabled={!gateways.length}
          >
            {!gateways.length && <option value="">No gateways available</option>}
            {gateways.map((gateway) => (
              <option key={gateway.gw} value={gateway.gw}>
                {gateway.site} ({gateway.gw})
              </option>
            ))}
          </select>
          <span className="gateway-status">{gatewayStatus}</span>
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
            <h2>{gateways.find((gateway) => gateway.gw === selectedGateway)?.site || 'Pumping Substation Network'}</h2>
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
                      faultReason={node.faultReason}
                      telemetry={node.telemetry}
                      initialTags={node.tags}
                      editMode={editMode}
                      onModeChange={handleModeChange}
                      onChange={handleNodeChange}
                      onTagsChange={handleTagsChange}
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
                    <span>Phase L1: {selectedNode.telemetry.current?.[0] ?? '—'} A</span>
                    <span>Phase L2: {selectedNode.telemetry.current?.[1] ?? '—'} A</span>
                    <span>Phase L3: {selectedNode.telemetry.current?.[2] ?? '—'} A</span>
                    <span>Imbalance: {selectedNode.telemetry.unbalance ?? '—'}%</span>
                    <span>Temp: {selectedNode.telemetry.temperature ?? '—'} °C</span>
                    {selectedNode.faultReason && <span className="fault-detail">Fault: {selectedNode.faultReason}</span>}
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