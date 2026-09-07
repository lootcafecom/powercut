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
  ongoing: "#E53935",
  scheduled: "#FB8C00",
  restored: "#43A047",
  normal: "#1E88E5",
  muted: "#9AA1B0",
};

function makeIcon(status: MapMarker["status"], size: number) {
  const color = STATUS_COLOR[status];
  // Classic map-pin (teardrop) shape, matching the pin-drop style used
  // by powercut.live's Live Grid Status map rather than plain dots.
  const w = size;
  const h = size * 1.35;
  return L.divIcon({
    className: "",
    html: `<svg width="${w}" height="${h}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
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
        style={{ height: "100%", width: "100%", background: "#e8e8e8" }}
      >
        <TileLayer
          // Standard OpenStreetMap tiles — matches the labeled, colored
          // map style used by powercut.live's "Live Grid Status" map,
          // rather than the minimal dark canvas used before. Free,
          // keyless, the original/default OSM tile source.
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={makeIcon(m.status, m.status === "muted" ? 22 : 32)}
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
