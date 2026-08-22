"use client";

import { useState } from "react";
import { OutageCard, type OutageCardData } from "./outage-card";
import { EmptyOutageState } from "./empty-state";

type TabKey = "today" | "tomorrow" | "upcoming" | "history";

const tabs: { key: TabKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "upcoming", label: "Upcoming" },
  { key: "history", label: "History" },
];

export function OutageTabs({
  today,
  tomorrow,
  upcoming,
  history,
}: Record<TabKey, OutageCardData[]>) {
  const [active, setActive] = useState<TabKey>("today");
  const data = { today, tomorrow, upcoming, history };
  const activeList = data[active];

  return (
    <div>
      <div className="flex gap-1 border-b border-glass-border" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-status ${
              active === tab.key
                ? "border-b-2 border-amber-status text-white"
                : "text-gray-dim hover:text-white"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 tabular-nums-mono text-xs text-gray-dim">
              {data[tab.key].length}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {activeList.length === 0 ? (
          <EmptyOutageState label={tabs.find((t) => t.key === active)!.label.toLowerCase()} />
        ) : (
          activeList.map((outage) => <OutageCard key={outage.id} outage={outage} />)
        )}
      </div>
    </div>
  );
}
