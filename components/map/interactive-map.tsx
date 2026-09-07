"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON } from "react-leaflet";
import L from "leaflet";
import { Fragment } from "react";
import "leaflet/dist/leaflet.css";

// Simplified India outline, embedded directly (no runtime fetch).
// This is deliberately NOT survey-precision — it's a recognizable
// approximation for a decorative glow effect. An earlier version tried
// fetching a real boundary file from geoBoundaries at runtime, but that
// project has an open, acknowledged bug specifically affecting India's
// country-level data (github.com/wmgeolab/geoBoundaries issue #4265),
// plus any runtime fetch depends on an external host's uptime/CORS
// behavior we can't guarantee. Embedding avoids both problems entirely.
// For survey-accurate borders, provide a specific GeoJSON file to bundle.
const INDIA_OUTLINE: GeoJSON.Feature = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [77.0, 35.5], [78.5, 34.0], [80.0, 31.0], [81.5, 30.2], [88.0, 27.5],
        [92.0, 26.8], [97.3, 28.5], [96.5, 26.0], [95.0, 24.0], [93.5, 22.5],
        [92.0, 22.0], [90.5, 22.8], [88.9, 22.0], [88.5, 21.5], [86.9, 20.5],
        [86.5, 19.5], [84.0, 17.5], [82.2, 16.5], [80.3, 13.8], [80.0, 13.0],
        [79.3, 10.3], [78.2, 8.9], [77.5, 8.1], [76.6, 8.3], [76.0, 10.0],
        [75.4, 11.8], [74.5, 12.8], [74.5, 14.5], [73.5, 15.8], [73.0, 17.0],
        [72.8, 19.1], [70.5, 20.9], [69.0, 22.4], [69.6, 23.6], [71.0, 24.3],
        [70.2, 27.9], [71.5, 29.9], [73.5, 30.9], [74.4, 32.3], [75.5, 32.8],
        [77.0, 35.5],
      ],
    ],
  },
};

function IndiaOutline() {
  return (
    <GeoJSON
      data={INDIA_OUTLINE}
      style={{
        color: "#FF17C9",
        weight: 2,
        fillColor: "#FF17C9",
        fillOpacity: 0.03,
        opacity: 0.8,
      }}
    />
  );
}


export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  /** Drives marker color. "muted" = dim, non-live placeholder. */
  status: "ongoing" | "scheduled" | "restored" | "normal" | "muted";
  popupContent?: string;
  href?: string;
}

const STATUS_STYLE: Record<MapMarker["status"], { color: string; icon: string; pulse: boolean }> = {
  ongoing: { color: "#FF4D6D", icon: "⚡", pulse: true },
  scheduled: { color: "#FFB020", icon: "◷", pulse: false },
  restored: { color: "#27DFA0", icon: "✓", pulse: false },
  normal: { color: "#1E88E5", icon: "", pulse: false },
  muted: { color: "#6B7280", icon: "", pulse: false },
};

function makeIcon(status: MapMarker["status"], size: number) {
  const { color, icon, pulse } = STATUS_STYLE[status];
  const pulseRing = pulse
    ? `<div style="
        position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
        width:${size * 2}px; height:${size * 2}px; border:2px solid ${color};
        border-radius:50%; animation:powercutPulse 2s infinite;
      "></div>`
    : "";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative; width:${size}px; height:${size}px;">
        ${pulseRing}
        <div style="
          position:relative; width:${size}px; height:${size}px; border-radius:50%;
          background:${color}; border:2px solid white;
          box-shadow:0 0 8px ${color}, 0 0 20px ${color}99;
          display:flex; align-items:center; justify-content:center;
          font-size:${size * 0.5}px; color:white;
        ">${icon}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Approximate affected-area radius in meters — deliberately shown as a
// soft circle, not a precise boundary we don't actually have data for.
const AREA_RADIUS_M: Record<MapMarker["status"], number> = {
  ongoing: 1500,
  scheduled: 1200,
  restored: 0,
  normal: 0,
  muted: 0,
};

export function InteractiveMap({
  center,
  zoom,
  markers,
  heightClassName = "h-96",
}: {
  center: [number, number];
  zoom: number;
  markers: MapMarker[];
  heightClassName?: string;
}) {
  return (
    <div className={`${heightClassName} w-full overflow-hidden rounded-lg`}>
      <style>{`
        @keyframes powercutPulse {
          0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.9; }
          100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
        }
        .powercut-popup .leaflet-popup-content-wrapper {
          background: #0D1126; color: #F8F7FF; border-radius: 10px;
          border: 1px solid rgba(168,85,247,0.35);
        }
        .powercut-popup .leaflet-popup-tip { background: #0D1126; }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#070A18" }}
      >
        <TileLayer
          // Dark tiles — Esri's free/keyless Dark Gray Canvas. (Carto's
          // equivalent free tiles started requiring an API key on
          // ~Aug 28, 2026, confirmed across multiple unrelated projects
          // hitting the same break that week — this is the no-signup
          // alternative other affected projects switched to.)
          url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <TileLayer
          url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        />
        <IndiaOutline />
        {markers.map((m) => {
          const radius = AREA_RADIUS_M[m.status];
          return (
            <Fragment key={m.id}>
              {radius > 0 && (
                <Circle
                  center={[m.lat, m.lng]}
                  radius={radius}
                  pathOptions={{
                    color: STATUS_STYLE[m.status].color,
                    weight: 1,
                    fillColor: STATUS_STYLE[m.status].color,
                    fillOpacity: 0.1,
                  }}
                />
              )}
              <Marker position={[m.lat, m.lng]} icon={makeIcon(m.status, m.status === "muted" ? 16 : 26)}>
                <Popup className="powercut-popup">
                  <div style={{ minWidth: 160 }}>
                    <div style={{ color: STATUS_STYLE[m.status].color, fontWeight: 700, fontSize: 11, letterSpacing: "0.06em" }}>
                      {m.status.toUpperCase()}
                    </div>
                    <strong style={{ fontSize: 16 }}>{m.label}</strong>
                    {m.popupContent && <p style={{ margin: "6px 0 0", color: "#9DA4C0", fontSize: 13 }}>{m.popupContent}</p>}
                    {m.href && (
                      <a href={m.href} style={{ color: "#A855F7", display: "block", marginTop: 8, fontSize: 13 }}>
                        View details →
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
