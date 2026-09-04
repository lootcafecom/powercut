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
          // Carto's free basemap tiles started requiring an API key on
          // ~Aug 28, 2026 (a real, dated, external change — confirmed
          // across multiple unrelated projects hitting the same break
          // that week). Esri's Dark Gray Canvas remains free/keyless and
          // is what other affected projects switched to for the same
          // reason — no signup required.
          url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <TileLayer
          url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
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
