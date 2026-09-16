<svg width="100" height="110" viewBox="0 0 100 110">
          {/* Outer Housing Circle */}
          <circle cx="50" cy="50" r="38" fill="#0f172a" stroke={currentTheme.stroke} strokeWidth="3.5" />

          {/* Dynamic Background Glow */}
          <circle cx="50" cy="50" r="33" fill={currentTheme.fill} />

          {/* Rotating Impeller / Rotor */}
          <g className={`pump-rotor ${isSpinning ? 'spinning' : ''}`}>
            <circle cx="50" cy="50" r="7" fill={currentTheme.stroke} />
            <path
              d="M50,20 L50,80 M20,50 L80,50"
              stroke={currentTheme.stroke}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="50" cy="27" r="3.5" fill={currentTheme.stroke} />
            <circle cx="50" cy="73" r="3.5" fill={currentTheme.stroke} />
            <circle cx="27" cy="50" r="3.5" fill={currentTheme.stroke} />
            <circle cx="73" cy="50" r="3.5" fill={currentTheme.stroke} />
          </g>

          {/* Status Alert Badge for Error */}
          {state === 'error' && (
            <g transform="translate(62, 14)">
              <circle cx="10" cy="10" r="10" fill="#ef4444" />
              <text x="10" y="14" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">!</text>
            </g>
          )}
        </svg>

        const COLOR_MAP = {
    running: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.2)', text: '#10b981' }, // Green
    manual:  { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)',  text: '#3b82f6' }, // Blue
    idle:    { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.2)',   text: '#eab308' }, // Yellow
    error:   { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.25)',  text: '#ef4444' }, // Red
  };
