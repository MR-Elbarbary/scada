import React from 'react';

export default function IndustrialPipesCanvas({
  connectionData,
  onSelectConnection,
}) {
  return (
    <svg
      className="connection-layer"
      width="100%"
      height="100%"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <linearGradient
          id="pipe-steel-grad"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="30%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <linearGradient
          id="pipe-amber-grad"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>

        <filter
          id="pipe-shadow"
          x="-10%"
          y="-10%"
          width="130%"
          height="130%"
        >
          <feDropShadow
            dx="2"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.7"
          />
        </filter>
      </defs>

      {connectionData.map((conn) => {
        const strokeGrad = conn.isSelected
          ? 'url(#pipe-amber-grad)'
          : 'url(#pipe-steel-grad)';

        const fluidColor = conn.isSelected
          ? '#fbbf24'
          : '#38bdf8';

        return (
          <g
            key={conn.id}
            onClick={() => onSelectConnection?.(conn.id)}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
            filter="url(#pipe-shadow)"
          >
            {/* Invisible wider hitbox */}
            <path
              d={conn.d}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              style={{
                pointerEvents: 'stroke',
              }}
            />

            {/* Outer pipe */}
            <path
              d={conn.d}
              fill="none"
              stroke="#090d16"
              strokeWidth="14"
              strokeLinejoin="bevel"
              strokeLinecap="square"
              pointerEvents="none"
            />

            {/* Metallic body */}
            <path
              d={conn.d}
              fill="none"
              stroke={strokeGrad}
              strokeWidth="10"
              strokeLinejoin="bevel"
              strokeLinecap="square"
              pointerEvents="none"
            />

            {/* Interior */}
            <path
              d={conn.d}
              fill="none"
              stroke="#020617"
              strokeWidth="4"
              strokeLinejoin="bevel"
              opacity="0.8"
              pointerEvents="none"
            />

            {/* Fluid */}
            <path
              d={conn.d}
              fill="none"
              stroke={fluidColor}
              strokeWidth="2.5"
              strokeDasharray="6 10"
              strokeLinejoin="bevel"
              className="animate-pipe-flow"
              pointerEvents="none"
            />

            {/* Elbow joints */}
            <circle
              cx={conn.midX}
              cy={conn.start.y}
              r="7"
              fill="#334155"
              stroke="#94a3b8"
              strokeWidth="1.5"
              pointerEvents="none"
            />

            <circle
              cx={conn.midX}
              cy={conn.end.y}
              r="7"
              fill="#334155"
              stroke="#94a3b8"
              strokeWidth="1.5"
              pointerEvents="none"
            />
          </g>
        );
      })}

      <style>
        {`
          @keyframes pipeFlow {
            from {
              stroke-dashoffset: 32;
            }

            to {
              stroke-dashoffset: 0;
            }
          }

          .animate-pipe-flow {
            animation: pipeFlow 1.2s linear infinite;
          }
        `}
      </style>
    </svg>
  );
}