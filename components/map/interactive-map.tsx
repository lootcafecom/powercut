"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
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

const STATUS_COLOR: Record<MapMarker["status"], string> = {
  ongoing: "#FF3B4A",
  scheduled: "#FFB800",
  restored: "#19D66B",
  normal: "#00A8FF",
  muted: "#3A4A66",
};

function makeIcon(status: MapMarker["status"], size: number) {
  const color = STATUS_COLOR[status];
  const glow = status === "muted" ? "none" : `0 0 8px ${color}`;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};box-shadow:${glow};
      border:2px solid rgba(255,255,255,0.85);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

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
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#06142D" }}
      >
        <TileLayer
          // Dark tiles to match the site theme — free, attribution required.
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={makeIcon(m.status, m.status === "muted" ? 12 : 18)}
          >
            <Popup>
              <div style={{ minWidth: 140 }}>
                <strong>{m.label}</strong>
                {m.popupContent && <p style={{ margin: "4px 0 0" }}>{m.popupContent}</p>}
                {m.href && (
                  <a href={m.href} style={{ color: "#1687FF" }}>
                    View details →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
