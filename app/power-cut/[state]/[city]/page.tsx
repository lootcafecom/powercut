import type { Metadata } from "next";
import Link from "next/link";
import { getCityBySlug, getOutagesForCity, getActiveReportSummaries, getAllLocalities } from "@/lib/db/queries";
import { computeOutageStatus } from "@/lib/outage-status";
import { formatDateIST, isSameISTDate } from "@/lib/format";
import { OutageTabs } from "@/components/outage/outage-tabs";
import type { OutageCardData } from "@/components/outage/outage-card";
import { CommunityReportsPanel } from "@/components/outage/community-reports-panel";
import { ReportOutageForm } from "@/components/outage/report-outage-form";
import { REPORT_ACTIVE_WINDOW_HOURS } from "@/lib/reports/tiers";
import { siteConfig } from "@/lib/config/site";
import { MapLoader, type MapMarker } from "@/components/map/map-loader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ state: string; city: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, city } = await params;
  const result = await getCityBySlug(state, city);
  const cityName = result?.city.name ?? city;
  return {
    title: `${cityName} Power Cut Today — Live Outage Schedule${siteConfig.seo.defaultTitleSuffix}`,
    description: `Check today's and tomorrow's scheduled power cuts in ${cityName}, by locality, sourced from official notices and community reports.`,
  };
}

export default async function CityPowerCutPage({ params }: PageProps) {
  const { state: stateSlug, city: citySlug } = await params;
  const result = await getCityBySlug(stateSlug, citySlug);

  if (!result) {
    // A real, honest "not covered yet" state instead of a generic error —
    // this is what most city URLs will show until real data exists for them.
    const guessedName = citySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="glass p-10">
          <h1 className="text-2xl font-extrabold text-white mb-3">
            {guessedName} isn&rsquo;t covered yet
          </h1>
          <p className="text-gray-dim text-sm leading-relaxed mb-6">
            We don&rsquo;t have sourced outage data or community reports for
            this city yet. Bengaluru is live today, with more cities being
            added as real data sources are found for each one — never
            fabricated numbers just to look complete.
          </p>
          <Link
            href="/power-cut/karnataka/bengaluru"
            className="inline-block rounded-xl px-5 py-3 text-sm font-bold text-white glow-badge-cta"
            style={{ background: "linear-gradient(135deg, #FF17C9, #A020F0)" }}
          >
            See Bengaluru instead →
          </Link>
        </div>
      </div>
    );
  }

  const { city } = result;
  const rows = await getOutagesForCity(city.id);
  const reportSummaries = await getActiveReportSummaries(city.id, REPORT_ACTIVE_WINDOW_HOURS);
  const allLocalities = await getAllLocalities();
  const cityLocalitiesFull = allLocalities.filter((l) => l.cityId === city.id);
  const cityLocalities = cityLocalitiesFull.map((l) => ({ id: l.id, name: l.name }));

  const STATUS_RANK: Record<string, number> = {
    ongoing: 3, starting_soon: 2, scheduled: 2, restored: 1,
    scheduled_window_ended: 0, cancelled: 0, unknown: 0,
  };
  const markerStatusByLocality = new Map<number, MapMarker["status"]>();
  for (const { outage, locality } of rows) {
    if (!locality) continue;
    const status = computeOutageStatus(outage);
    const rank = STATUS_RANK[status] ?? 0;
    const mapped: MapMarker["status"] =
      status === "ongoing" ? "ongoing" : status === "restored" ? "restored" : rank >= 2 ? "scheduled" : "normal";
    const current = markerStatusByLocality.get(locality.id);
    const currentRank = current ? { ongoing: 3, scheduled: 2, restored: 1, normal: 0, muted: -1 }[current] : -1;
    if (rank > currentRank) markerStatusByLocality.set(locality.id, mapped);
  }
  const localityMarkers: MapMarker[] = cityLocalitiesFull
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id, lat: l.latitude as number, lng: l.longitude as number, label: l.name,
      status: markerStatusByLocality.get(l.id) ?? "normal",
    }));

  const cards: OutageCardData[] = rows.map(({ outage, locality, provider }) => ({
    id: outage.id, title: outage.title, reason: outage.reason,
    localityName: locality?.name ?? null, providerShortName: provider.shortName,
    startTime: outage.startTime, endTime: outage.endTime, actualEndTime: outage.actualEndTime,
    sourceType: outage.sourceType, sourceUrl: outage.sourceUrl, lastVerifiedAt: outage.lastVerifiedAt,
    verificationStatus: outage.verificationStatus, confidenceScore: outage.confidenceScore,
  }));

  const today = cards.filter((c) => isSameISTDate(c.startTime, 0));
  const tomorrow = cards.filter((c) => isSameISTDate(c.startTime, 1));
  const upcoming = cards.filter((c) => {
    const status = computeOutageStatus(c);
    return new Date(c.startTime).getTime() > Date.now() && !isSameISTDate(c.startTime, 0) &&
      !isSameISTDate(c.startTime, 1) && status !== "cancelled";
  });
  const history = cards.filter((c) => {
    const status = computeOutageStatus(c);
    return status === "scheduled_window_ended" || status === "restored";
  });

  const ongoingCount = cards.filter((c) => computeOutageStatus(c) === "ongoing").length;
  const now = new Date();
  const lastChecked = rows.map((r) => r.outage.lastVerifiedAt).filter(Boolean).sort().reverse()[0];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 py-8">
      <div className="glass p-6 sm:p-8">
        <p className="text-xs uppercase tracking-widest text-gray-dim">Karnataka · India</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Bengaluru Power Cut Today
        </h1>
        <p className="mt-1 text-gray">{formatDateIST(now.toISOString())}</p>

        <div className="mt-5 flex flex-wrap gap-6">
          <Stat label="Today's outages" value={today.length} />
          <Stat label="Tomorrow's outages" value={tomorrow.length} />
          <Stat label="Ongoing right now" value={ongoingCount} accent={ongoingCount > 0} />
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs tabular-nums-mono text-gray-dim">
          <span className="relative flex h-1.5 w-1.5">
            <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-mint shadow-[0_0_8px_#34D399]" />
          </span>
          <span>
            Last checked:{" "}
            {lastChecked
              ? new Date(lastChecked).toLocaleString("en-IN", {
                  timeZone: siteConfig.defaultTimezone, hour: "numeric", minute: "2-digit", hour12: true,
                })
              : "—"}
          </span>
        </div>
      </div>

      <div className="mt-6 glass p-6">
        <h2 className="text-lg font-bold text-white">Locality Map</h2>
        <p className="mt-1 text-sm text-gray-dim">
          Colored by each locality&rsquo;s current status — red is ongoing, amber is scheduled, blue is normal.
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-glass-border">
          <MapLoader center={[12.9716, 77.5946]} zoom={11} markers={localityMarkers} heightClassName="h-96" />
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

      <div className="mt-10 glass p-5 text-sm text-gray-dim">
        <p>
          Outage information for Bengaluru is sourced from BESCOM&rsquo;s official
          scheduled-outage notices and secondary sources, and labeled by source on
          every card. Community reports above are a separate, unverified signal
          for outages nobody has announced.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className={`tabular-nums-mono text-3xl font-bold ${accent ? "text-pink" : "text-white"}`}>{value}</p>
      <p className="text-xs uppercase tracking-wide text-gray-dim">{label}</p>
    </div>
  );
}
