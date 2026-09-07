"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { Fragment } from "react";
import "leaflet/dist/leaflet.css";

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
