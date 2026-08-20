interface IndiaMapProps {
  className?: string;
  /** Named cities to render as glowing nodes. Only Bengaluru is "live" today. */
  highlightBengaluru?: boolean;
}

// Rough node positions on the 0-400 x 0-500 viewBox, positioned to roughly
// correspond to real relative locations without claiming survey accuracy.
const CITY_NODES = [
  { name: "Delhi", x: 170, y: 90, live: false },
  { name: "Mumbai", x: 120, y: 260, live: false },
  { name: "Kolkata", x: 300, y: 190, live: false },
  { name: "Hyderabad", x: 190, y: 300, live: false },
  { name: "Chennai", x: 220, y: 380, live: false },
  { name: "Bengaluru", x: 185, y: 355, live: true },
];

export function IndiaMapGlow({ className, highlightBengaluru = true }: IndiaMapProps) {
  return (
    <svg
      viewBox="0 0 400 500"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="india-outline" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D9FF" />
          <stop offset="100%" stopColor="#1687FF" />
        </linearGradient>
        <filter id="india-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Stylized landmass outline */}
      <path
        d="M130,20 C180,10 260,25 300,60 C340,90 365,120 355,150
           C345,175 320,175 300,160 C320,200 310,240 290,270
           C270,310 250,350 235,400 C228,430 222,455 210,478
           C200,455 195,430 188,405 C175,365 155,335 165,300
           C140,320 120,300 115,270 C105,240 115,210 100,190
           C85,175 80,150 95,130 C85,110 95,85 115,70
           C105,50 115,30 130,20 Z"
        stroke="url(#india-outline)"
        strokeWidth="2"
        fill="rgba(22,135,255,0.04)"
        filter="url(#india-glow)"
      />

      {/* City nodes */}
      {CITY_NODES.map((node) => {
        const isLive = highlightBengaluru && node.live;
        return (
          <g key={node.name}>
            <circle
              cx={node.x}
              cy={node.y}
              r={isLive ? 7 : 3.5}
              fill={isLive ? "#FFD400" : "#1687FF"}
              opacity={isLive ? 1 : 0.45}
              filter="url(#india-glow)"
            />
            {isLive && (
              <circle
                cx={node.x}
                cy={node.y}
                r="14"
                fill="none"
                stroke="#FFD400"
                strokeWidth="1.5"
                opacity="0.5"
              />
            )}
          </g>
        );
      })}

      {/* Central lightning bolt */}
      <path
        d="M212,180 L182,240 L204,240 L188,300 L232,225 L208,225 Z"
        fill="#FFD400"
        filter="url(#india-glow)"
      />
    </svg>
  );
}
