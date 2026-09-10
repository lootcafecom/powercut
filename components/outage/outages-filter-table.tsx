"use client";

import { useState } from "react";
import { formatTimeIST } from "@/lib/format";
import { statusLabels } from "@/lib/outage-status";

interface OutageRow {
  id: number;
  locality: string;
  status: "ongoing" | "scheduled" | "starting_soon" | "restored" | "scheduled_window_ended" | "cancelled" | "unknown";
  startTime: string;
  endTime: string;
  affected?: number | null;
}

const DOT_COLOR: Record<string, string> = {
  ongoing: "bg-pink shadow-[0_0_8px_#F87171]",
  starting_soon: "bg-amber-status shadow-[0_0_8px_#FFD400]",
  scheduled: "bg-amber-status shadow-[0_0_8px_#FFD400]",
  restored: "bg-mint shadow-[0_0_8px_#34D399]",
  scheduled_window_ended: "bg-gray-dim",
  cancelled: "bg-gray-dim",
  unknown: "bg-gray-dim",
};

export function OutagesFilterTable({ rows }: { rows: OutageRow[] }) {
  const [filter, setFilter] = useState<"all" | "ongoing" | "scheduled" | "restored">("all");

  const counts = {
    all: rows.length,
    ongoing: rows.filter((r) => r.status === "ongoing").length,
    scheduled: rows.filter((r) => r.status === "scheduled" || r.status === "starting_soon").length,
    restored: rows.filter((r) => r.status === "restored").length,
  };

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "scheduled") return r.status === "scheduled" || r.status === "starting_soon";
    return r.status === filter;
  });

  return (
    <div className="glass overflow-hidden">
      <div className="flex gap-1 p-3 border-b border-glass-border overflow-x-auto">
        {(["all", "ongoing", "scheduled", "restored"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              filter === f ? "bg-purple text-white" : "text-gray-dim hover:text-white"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-dim p-5">No outages in this category.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-extrabold text-gray-dim uppercase tracking-wide border-b border-glass-border">
                <th className="py-2.5 pl-4 pr-2 w-6"></th>
                <th className="py-2.5 pr-2">Area</th>
                <th className="py-2.5 pr-2">Time</th>
                <th className="py-2.5 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-glass-border last:border-0">
                  <td className="pl-4 pr-2 py-3"><span className={`inline-block w-2.5 h-2.5 rounded-full ${DOT_COLOR[r.status]}`} /></td>
                  <td className="pr-2 py-3 font-bold text-white">{r.locality}</td>
                  <td className="pr-2 py-3 text-gray-dim tabular-nums-mono text-xs">
                    {formatTimeIST(r.startTime)}–{formatTimeIST(r.endTime)}
                  </td>
                  <td className="pr-4 py-3 text-xs text-gray-dim">{statusLabels[r.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
