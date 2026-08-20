import type { Metadata } from "next";
import { getCityBySlug, getOutagesForCity, getActiveReportSummaries, getAllLocalities } from "@/lib/db/queries";
import { computeOutageStatus } from "@/lib/outage-status";
import { formatDateIST, isSameISTDate } from "@/lib/format";
import { OutageTabs } from "@/components/outage/outage-tabs";
import type { OutageCardData } from "@/components/outage/outage-card";
import { CommunityReportsPanel } from "@/components/outage/community-reports-panel";
import { ReportOutageForm } from "@/components/outage/report-outage-form";
import { REPORT_ACTIVE_WINDOW_HOURS } from "@/lib/reports/tiers";
import { siteConfig } from "@/lib/config/site";

export const dynamic = "force-dynamic"; // status must always reflect "now"

export const metadata: Metadata = {
  title: `Bengaluru Power Cut Today — Live Outage Schedule${siteConfig.seo.defaultTitleSuffix}`,
  description:
    "Check today's and tomorrow's scheduled power cuts in Bengaluru, by locality, sourced from BESCOM official notices.",
};

export default async function BengaluruPowerCutPage() {
  const result = await getCityBySlug("karnataka", "bengaluru");

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-text-muted">City not found. Run the database seed script.</p>
      </div>
    );
  }

  const { city } = result;
  const rows = await getOutagesForCity(city.id);
  const reportSummaries = await getActiveReportSummaries(city.id, REPORT_ACTIVE_WINDOW_HOURS);
  const allLocalities = await getAllLocalities();
  const cityLocalities = allLocalities
    .filter((l) => l.cityId === city.id)
    .map((l) => ({ id: l.id, name: l.name }));

  const cards: OutageCardData[] = rows.map(({ outage, locality, provider }) => ({
    id: outage.id,
    title: outage.title,
    reason: outage.reason,
    localityName: locality?.name ?? null,
    providerShortName: provider.shortName,
    startTime: outage.startTime,
    endTime: outage.endTime,
    actualEndTime: outage.actualEndTime,
    sourceType: outage.sourceType,
    sourceUrl: outage.sourceUrl,
    lastVerifiedAt: outage.lastVerifiedAt,
    verificationStatus: outage.verificationStatus,
    confidenceScore: outage.confidenceScore,
  }));

  const today = cards.filter((c) => isSameISTDate(c.startTime, 0));
  const tomorrow = cards.filter((c) => isSameISTDate(c.startTime, 1));
  const upcoming = cards.filter((c) => {
    const status = computeOutageStatus(c);
    return (
      new Date(c.startTime).getTime() > Date.now() &&
      !isSameISTDate(c.startTime, 0) &&
      !isSameISTDate(c.startTime, 1) &&
      status !== "cancelled"
    );
  });
  const history = cards.filter((c) => {
    const status = computeOutageStatus(c);
    return status === "scheduled_window_ended" || status === "restored";
  });

  const ongoingCount = cards.filter((c) => computeOutageStatus(c) === "ongoing").length;
  const now = new Date();
  const lastChecked = rows
    .map((r) => r.outage.lastVerifiedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <div className="bg-radial-glow min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Status readout */}
        <div className="glow-blue rounded-xl border border-line-neon bg-bg-card p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-text-muted">
            Karnataka · India
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Bengaluru Power Cut Today
          </h1>
          <p className="mt-1 text-text-muted">{formatDateIST(now.toISOString())}</p>

          <div className="mt-5 flex flex-wrap gap-6">
            <Stat label="Today's outages" value={today.length} />
            <Stat label="Tomorrow's outages" value={tomorrow.length} />
            <Stat
              label="Ongoing right now"
              value={ongoingCount}
              accent={ongoingCount > 0}
            />
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs tabular-nums-mono text-text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-green" />
            </span>
            <span>
              Last checked:{" "}
              {lastChecked
                ? new Date(lastChecked).toLocaleString("en-IN", {
                    timeZone: siteConfig.defaultTimezone,
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "—"}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <CommunityReportsPanel summaries={reportSummaries} />
          <div className="flex justify-end">
            <ReportOutageForm localities={cityLocalities} />
          </div>
        </div>

        <div className="mt-8">
          <OutageTabs today={today} tomorrow={tomorrow} upcoming={upcoming} history={history} />
        </div>

        <div className="mt-10 rounded-xl border border-line-soft bg-bg-card p-5 text-sm text-text-muted">
          <p>
            Outage information for Bengaluru is sourced from BESCOM&rsquo;s
            official scheduled-outage notices and secondary sources, and
            labeled by source on every card. Community reports above are a
            separate, unverified signal for outages nobody has announced.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`tabular-nums-mono text-3xl font-bold ${
          accent ? "text-red" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  );
}
