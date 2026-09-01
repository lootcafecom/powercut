export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 420"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF17C9" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#A020F0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#A020F0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="building-face-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A1070" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#160540" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="building-face-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A0C58" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0F0330" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="building-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6020B0" />
          <stop offset="100%" stopColor="#3A1070" />
        </linearGradient>
        <filter id="glow-sm" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-lg" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Ambient glow behind everything */}
      <circle cx="240" cy="230" r="180" fill="url(#core-glow)" opacity="0.5" />

      {/* Isometric city blocks — each a 3-face pseudo-3D box for depth */}
      {[
        { x: 60, w: 46, h: 120, y: 300 },
        { x: 120, w: 40, h: 90, y: 330 },
        { x: 340, w: 44, h: 100, y: 320 },
        { x: 395, w: 38, h: 140, y: 280 },
      ].map((b, i) => (
        <g key={i}>
          {/* front face */}
          <path
            d={`M${b.x},${b.y + b.h} L${b.x},${b.y} L${b.x + b.w * 0.75},${b.y - b.w * 0.2} L${b.x + b.w * 0.75},${b.y + b.h - b.w * 0.2} Z`}
            fill="url(#building-face-a)"
            stroke="rgba(190,50,255,0.4)"
            strokeWidth="1"
          />
          {/* side face for depth */}
          <path
            d={`M${b.x + b.w * 0.75},${b.y + b.h - b.w * 0.2} L${b.x + b.w * 0.75},${b.y - b.w * 0.2} L${b.x + b.w},${b.y - b.w * 0.35} L${b.x + b.w},${b.y + b.h - b.w * 0.35} Z`}
            fill="url(#building-face-b)"
            stroke="rgba(190,50,255,0.3)"
            strokeWidth="1"
          />
          {/* top face */}
          <path
            d={`M${b.x},${b.y} L${b.x + b.w * 0.25},${b.y - b.w * 0.35} L${b.x + b.w},${b.y - b.w * 0.35} L${b.x + b.w * 0.75},${b.y - b.w * 0.2} Z`}
            fill="url(#building-top)"
          />
          {/* window lights */}
          {[0, 1, 2].map((row) => (
            <rect
              key={row}
              x={b.x + 6}
              y={b.y + 14 + row * 26}
              width="7"
              height="9"
              fill={row === 1 ? "#FF17C9" : "#3B9EFF"}
              opacity="0.85"
              filter="url(#glow-sm)"
            />
          ))}
        </g>
      ))}

      {/* Transmission tower — lattice structure */}
      <g stroke="#FF17C9" strokeWidth="1.5" opacity="0.85" filter="url(#glow-sm)">
        <line x1="240" y1="60" x2="200" y2="300" />
        <line x1="240" y1="60" x2="280" y2="300" />
        <line x1="205" y1="120" x2="275" y2="120" />
        <line x1="200" y1="180" x2="280" y2="180" />
        <line x1="196" y1="240" x2="284" y2="240" />
        <line x1="205" y1="120" x2="240" y2="60" />
        <line x1="275" y1="120" x2="240" y2="60" />
        {/* cross braces */}
        <line x1="205" y1="120" x2="280" y2="180" opacity="0.5" />
        <line x1="275" y1="120" x2="200" y2="180" opacity="0.5" />
        <line x1="200" y1="180" x2="284" y2="240" opacity="0.5" />
        <line x1="280" y1="180" x2="196" y2="240" opacity="0.5" />
        {/* crossarms */}
        <line x1="160" y1="100" x2="320" y2="100" strokeWidth="2" />
      </g>

      {/* Power lines trailing off to the sides, glowing */}
      <path d="M160,100 Q80,140 20,110" stroke="#A020F0" strokeWidth="1.5" opacity="0.6" filter="url(#glow-sm)" fill="none" />
      <path d="M320,100 Q400,140 460,110" stroke="#A020F0" strokeWidth="1.5" opacity="0.6" filter="url(#glow-sm)" fill="none" />

      {/* Central glowing power core with lightning bolt */}
      <circle cx="240" cy="230" r="34" fill="#0F0330" stroke="#FF17C9" strokeWidth="2" filter="url(#glow-lg)" />
      <path
        d="M248,205 L222,235 L238,235 L230,258 L258,226 L242,226 Z"
        fill="#FFD400"
        filter="url(#glow-sm)"
      />

      {/* Ground glow line */}
      <ellipse cx="240" cy="360" rx="200" ry="8" fill="#A020F0" opacity="0.15" filter="url(#glow-lg)" />
    </svg>
  );
}
