"use client";

import { useState } from "react";

interface DailyBucket {
  date: string;
  count: number;
}

interface HistoryStats {
  last24h: { count: number; avgMinutes: number };
  last7d: { count: number; avgMinutes: number };
  last30d: { count: number; avgMinutes: number };
  dailyBuckets: DailyBucket[];
}

function formatMinutes(mins: number) {
  if (mins === 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function OutageHistoryChart({ history }: { history: HistoryStats }) {
  const [range, setRange] = useState<"last24h" | "last7d" | "last30d">("last7d");

  const daysToShow = range === "last24h" ? 1 : range === "last7d" ? 7 : 30;
  const buckets = history.dailyBuckets.slice(-daysToShow);
  const stats = history[range];
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-extrabold text-magenta tabular-nums-mono">{stats.count}</div>
            <div className="text-[10px] font-bold text-gray-dim uppercase tracking-wide">Outages</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white tabular-nums-mono">{formatMinutes(stats.avgMinutes)}</div>
            <div className="text-[10px] font-bold text-gray-dim uppercase tracking-wide">Avg Duration</div>
          </div>
        </div>
        <div className="flex gap-1 glass p-1">
          {(["last24h", "last7d", "last30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                range === r ? "bg-purple text-white" : "text-gray-dim hover:text-white"
              }`}
            >
              {r === "last24h" ? "24h" : r === "last7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-[2px] h-16">
        {buckets.map((b, i) => (
          <div
            key={b.date + i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(4, (b.count / maxCount) * 100)}%`,
              background: b.count > 0 ? "#A020F0" : "rgba(255,255,255,0.06)",
              boxShadow: b.count > 0 ? "0 0 6px rgba(160,32,240,0.5)" : "none",
            }}
            title={`${b.date}: ${b.count} outage(s)`}
          />
        ))}
      </div>
      <p className="text-[11px] text-gray-dim mt-2">
        Real data from our database — on a new deployment this will look sparse until history accumulates.
      </p>
    </div>
  );
}
