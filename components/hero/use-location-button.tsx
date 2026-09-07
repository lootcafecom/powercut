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
    <div className="relative sm:mx-2 mb-2.5 sm:mb-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "locating"}
        title="Use my location"
        aria-label="Use my location"
        className="w-full sm:w-14 h-14 flex items-center justify-center rounded-2xl bg-glass border border-glass-border text-purple hover:text-magenta hover:border-magenta/50 disabled:opacity-60 transition-colors"
      >
        {/* Crosshair / target icon, matching the reference image */}
        <svg viewBox="0 0 24 24" className={`w-5 h-5 ${status === "locating" ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M12 1v3M12 20v3M1 12h3M20 12h3" strokeLinecap="round" />
        </svg>
        <span className="sm:hidden ml-2 text-sm font-semibold">
          {status === "locating" ? "Finding you..." : "Use my location"}
        </span>
      </button>
      {status === "error" && (
        <p className="absolute bottom-full left-0 mb-2 z-10 text-xs text-pink whitespace-nowrap bg-bg-deep/95 px-2 py-1 rounded-md border border-pink/30">
          Location access denied.
        </p>
      )}
      {status === "outside" && (
        <p className="absolute bottom-full left-0 mb-2 z-10 text-xs text-pink whitespace-nowrap bg-bg-deep/95 px-2 py-1 rounded-md border border-pink/30">
          Outside our covered areas — Bengaluru only, so far.</p>
      )}
    </div>
  );
}
