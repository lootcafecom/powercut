"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LocalityCoord {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  citySlug: string;
  stateSlug: string;
}

// Real coordinates for our covered localities. Distance is computed with
// the actual Haversine formula — not a guess — so "nearest" is genuine.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// If the nearest known locality is farther than this, we're honestly
// outside coverage — don't pretend some far-off match is "your area."
const MAX_REASONABLE_KM = 60;

export function UseLocationButton({ localities }: { localities: LocalityCoord[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "locating" | "error" | "outside">("idle");

  function handleClick() {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest: LocalityCoord | null = null;
        let nearestDist = Infinity;
        for (const l of localities) {
          const d = haversineKm(latitude, longitude, l.lat, l.lng);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = l;
          }
        }
        if (!nearest || nearestDist > MAX_REASONABLE_KM) {
          setStatus("outside");
          return;
        }
        router.push(`/power-cut/${nearest.stateSlug}/${nearest.citySlug}?locality=${nearest.slug}`);
      },
      () => setStatus("error")
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "locating"}
        className="flex items-center gap-1.5 text-xs font-semibold text-purple hover:text-magenta disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {status === "locating" ? "Finding you..." : "Use my location"}
      </button>
      {status === "error" && (
        <p className="text-xs text-pink mt-1">Couldn&rsquo;t access your location — check browser permissions.</p>
      )}
      {status === "outside" && (
        <p className="text-xs text-pink mt-1">You&rsquo;re outside our covered areas right now — Bengaluru only, so far.</p>
      )}
    </div>
  );
}
