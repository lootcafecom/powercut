"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "./interactive-map";

const InteractiveMap = dynamic(
  () => import("./interactive-map").then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 w-full items-center justify-center rounded-lg border border-line-soft bg-bg-panel text-sm text-text-muted">
        Loading map…
      </div>
    ),
  }
);

export function MapLoader(props: {
  center: [number, number];
  zoom: number;
  markers: MapMarker[];
  heightClassName?: string;
}) {
  return <InteractiveMap {...props} />;
}

export type { MapMarker };
