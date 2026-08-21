interface IndiaMapProps {
  className?: string;
  highlightBengaluru?: boolean;
  /** Real ongoing-outage count to show on Bengaluru's node, if any. */
  bengaluruCount?: number;
}

// Faceted/low-poly India outline — straight segments between anchor points
// rather than smooth cartographic curves. This is a deliberate stylistic
// choice (fits a "circuit board" electric-grid read) as well as a
// practical one: it's far easier to keep a hand-authored polygon
// non-self-intersecting and recognizable than to hand-tune smooth bezier
// curves without being able to render a preview.
const OUTLINE_POINTS: [number, number][] = [
  [160, 20], [210, 15], [250, 30], [270, 50], // north border into NE neck
  [330, 60], [350, 90], [320, 115], [300, 105], // NE states bulge (Assam/Arunachal)
  [310, 150], [290, 200], [265, 260], [235, 340], // east coast tapering down
  [205, 430], [190, 500], // Kanyakumari — southern tip
  [165, 420], [145, 340], [120, 280], // west coast going back up (Kerala/Karnataka/Konkan)
  [70, 260], [100, 220], // Gujarat / Kathiawar bulge out west, then Kutch back in
  [90, 170], [110, 110], [130, 60], // Rajasthan / Punjab back up
];

const CITY_NODES = [
  { name: "Delhi", x: 190, y: 110, live: false },
  { name: "Mumbai", x: 140, y: 300, live: false },
  { name: "Kolkata", x: 295, y: 165, live: false },
  { name: "Hyderabad", x: 230, y: 320, live: false },
  { name: "Chennai", x: 218, y: 378, live: false },
  { name: "Bengaluru", x: 190, y: 380, live: true },
];

export function IndiaMapGlow({
  className,
  highlightBengaluru = true,
  bengaluruCount,
}: IndiaMapProps) {
  const pathData =
    "M" + OUTLINE_POINTS.map(([x, y]) => `${x},${y}`).join(" L ") + " Z";

  return (
    <svg
      viewBox="0 0 400 520"
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
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={pathData}
        stroke="url(#india-outline)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="rgba(22,135,255,0.05)"
        filter="url(#india-glow)"
      />

      {CITY_NODES.map((node) => {
        const isLive = highlightBengaluru && node.live;
        return (
          <g key={node.name}>
            {isLive && bengaluruCount !== undefined && bengaluruCount > 0 ? (
              <>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="16"
                  fill="#FF3B4A"
                  filter="url(#india-glow)"
                />
                <text
                  x={node.x}
                  y={node.y + 5}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {bengaluruCount}
                </text>
              </>
            ) : (
              <circle
                cx={node.x}
                cy={node.y}
                r={isLive ? 7 : 3.5}
                fill={isLive ? "#FFD400" : "#1687FF"}
                opacity={isLive ? 1 : 0.45}
                filter="url(#india-glow)"
              />
            )}
            {isLive && (
              <circle
                cx={node.x}
                cy={node.y}
                r={bengaluruCount ? "22" : "14"}
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
        d="M212,190 L182,250 L204,250 L188,310 L232,235 L208,235 Z"
        fill="#FFD400"
        filter="url(#india-glow)"
      />
    </svg>
  );
}
