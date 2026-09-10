import type { Metadata } from "next";
import Link from "next/link";
import {
  getCityBySlug,
  getLocalityBySlug,
  getOutagesForCity,
  getOutageHistoryForLocality,
  getAllLocalities,
  getAllProviders,
} from "@/lib/db/queries";
import { computeOutageStatus, statusLabels, statusColorClasses } from "@/lib/outage-status";
import { formatTimeIST, formatDateTimeIST, isSameISTDate, formatDateIST } from "@/lib/format";
import { getSourceMeta } from "@/lib/sources/source-meta";
import { MapLoader, type MapMarker } from "@/components/map/map-loader";
import { OutageHistoryChart } from "@/components/outage/outage-history-chart";
import { OutagesFilterTable } from "@/components/outage/outages-filter-table";
import { LightningIcon } from "@/components/icons/lightning";
import { ShieldIcon, LocationIcon, BellIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ state: string; city: string; area: string }>;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function loadPageData(params: Awaited<PageProps["params"]>) {
  const { state: stateSlug, city: citySlug, area: areaSlug } = params;
  const cityResult = await getCityBySlug(stateSlug, citySlug);
  if (!cityResult) return null;
  const { city, state } = cityResult;
  const locality = await getLocalityBySlug(city.id, areaSlug);
  if (!locality) return null;
  return { city, state, locality, stateSlug, citySlug, areaSlug };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await loadPageData(await params);
  if (!p) return { title: "Area not found" };
  const { locality, city, state } = p;
  return {
    title: `${locality.name} Power Cut Today — Live Status & Schedule | ${city.name}, ${state.name}`,
    description: `Check current power cut status, today's and tomorrow's scheduled outages, and 30-day history for ${locality.name}, ${city.name}. Sourced data, clearly labeled, updated live.`,
  };
}

export default async function AreaPage({ params }: PageProps) {
  const p = await loadPageData(await params);

  if (!p) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="glass p-10">
          <h1 className="text-2xl font-extrabold text-white mb-3">Area not found</h1>
          <p className="text-gray-dim text-sm leading-relaxed mb-6">We don&rsquo;t have this area in our database yet.</p>
          <Link href="/power-cut/karnataka/bengaluru" className="inline-block rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #FF17C9, #A020F0)" }}>
            See Bengaluru instead →
          </Link>
        </div>
      </div>
    );
  }

  const { city, state, locality, stateSlug, citySlug } = p;

  const [outageRows, history, allLocalities, allProviders] = await Promise.all([
    getOutagesForCity(city.id),
    getOutageHistoryForLocality(locality.id),
    getAllLocalities(),
    getAllProviders(),
  ]);

  const localityOutages = outageRows
    .filter((r) => r.locality?.id === locality.id)
    .map(({ outage, provider }) => ({
      id: outage.id,
      status: computeOutageStatus(outage),
      startTime: outage.startTime,
      endTime: outage.endTime,
      actualEndTime: outage.actualEndTime,
      provider: provider.shortName,
      reason: outage.reason,
      sourceType: outage.sourceType,
      sourceUrl: outage.sourceUrl,
      lastVerifiedAt: outage.lastVerifiedAt,
    }));

  const todayOutages = localityOutages.filter((o) => isSameISTDate(o.startTime, 0));
  const tomorrowOutages = localityOutages.filter((o) => isSameISTDate(o.startTime, 1));
  const ongoing = localityOutages.find((o) => o.status === "ongoing");
  const scheduledCount = localityOutages.filter((o) => o.status === "scheduled" || o.status === "starting_soon").length;
  const restoredCount = localityOutages.filter((o) => o.status === "restored").length;
  const currentStatus = ongoing ? "ongoing" : scheduledCount > 0 ? "scheduled" : "normal";

  const provider = allProviders[0] ?? null;
  const sourceMeta = ongoing ? getSourceMeta(ongoing.sourceUrl, ongoing.sourceType) : null;

  // Nearby areas — real distance (Haversine), each with its own real
  // active-outage count, not just a static distance number.
  const nearby = allLocalities
    .filter((l) => l.cityId === city.id && l.id !== locality.id && l.latitude != null && l.longitude != null)
    .map((l) => {
      const activeCount = outageRows.filter(
        (r) => r.locality?.id === l.id && ["ongoing", "scheduled", "starting_soon"].includes(computeOutageStatus(r.outage))
      ).length;
      return {
        ...l,
        distanceKm: haversineKm(locality.latitude as number, locality.longitude as number, l.latitude as number, l.longitude as number),
        activeCount,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);

  const localityMarkers: MapMarker[] = [
    {
      id: locality.id,
      lat: locality.latitude as number,
      lng: locality.longitude as number,
      label: locality.name,
      status: currentStatus === "ongoing" ? "ongoing" : currentStatus === "scheduled" ? "scheduled" : "normal",
    },
    ...nearby.map((l) => ({
      id: l.id,
      lat: l.latitude as number,
      lng: l.longitude as number,
      label: l.name,
      status: l.activeCount > 0 ? ("scheduled" as const) : ("normal" as const),
    })),
  ];

  const filterTableRows = localityOutages.map((o) => ({
    id: o.id,
    locality: locality.name,
    status: o.status,
    startTime: o.startTime,
    endTime: o.endTime,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: state.name, item: `/power-cut/${stateSlug}` },
          { "@type": "ListItem", position: 2, name: city.name, item: `/power-cut/${stateSlug}/${citySlug}` },
          { "@type": "ListItem", position: 3, name: locality.name },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: `How often is ${locality.name}'s power cut data updated?`, acceptedAnswer: { "@type": "Answer", text: "Sourced outages are checked multiple times a day. Community reports appear as soon as someone submits them." } },
          { "@type": "Question", name: `What electricity provider serves ${locality.name}?`, acceptedAnswer: { "@type": "Answer", text: provider ? `${locality.name} is served by ${provider.name} (${provider.shortName}).` : "Provider information isn't available yet for this area." } },
          { "@type": "Question", name: `How do I report a power cut in ${locality.name}?`, acceptedAnswer: { "@type": "Answer", text: "Use the \"Report Outage\" button on this page. Reports are shown as unverified community signals, separate from sourced outages." } },
        ],
      },
    ],
  };

  return (
    <div>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <div className="glass rounded-none border-x-0 border-t-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-10 py-6">
          <nav className="text-xs text-gray-dim mb-4 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href={`/power-cut/${stateSlug}/${citySlug}`} className="hover:text-white">{state.name}</Link>
            <span>/</span>
            <Link href={`/power-cut/${stateSlug}/${citySlug}`} className="hover:text-white">{city.name}</Link>
            <span>/</span>
            <span className="text-white">{locality.name}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {locality.name}, <span className="glow-text">{city.name}</span>
          </h1>
          <p className="mt-1.5 text-sm text-gray-dim">
            {locality.postalCode && <span className="tabular-nums-mono">PIN {locality.postalCode}</span>}
            {locality.postalCode && " · "}
            {city.name} · {state.name}
          </p>
          <p className="mt-3 text-sm text-gray max-w-2xl leading-relaxed">
            Get real-time and scheduled power outage information for {locality.name}, {city.name}. Check current status, upcoming maintenance, outage history, and report an outage.
          </p>
        </div>
      </div>

      {/* IN-PAGE NAV */}
      <div className="border-b border-glass-border sticky top-0 z-10 bg-bg-deep/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-10 overflow-x-auto">
          <div className="flex gap-1 py-3">
            {[
              ["#status", "Overview"],
              ["#map", "Live Map"],
              ["#outages", "Outages"],
              ["#history", "History"],
              ["#nearby", "Nearby Areas"],
              ["#discom", "DISCOM Info"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-dim hover:text-white hover:bg-white/5 whitespace-nowrap transition-colors">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-10 py-8">
        {/* STATS */}
        <div id="status" className="grid grid-cols-2 sm:grid-cols-4 gap-4 scroll-mt-20">
          <StatCard icon={<LightningIcon className="w-5 h-5" filled />} value={localityOutages.filter((o) => o.status === "ongoing").length} label="Active Right Now" colorClass="text-pink" iconBg="bg-pink/10 border-pink/30 text-pink" />
          <StatCard icon={<BellIcon className="w-5 h-5" />} value={scheduledCount} label="Scheduled Today" colorClass="text-amber-status" iconBg="bg-amber-status/10 border-amber-status/30 text-amber-status" />
          <StatCard icon={<ShieldIcon className="w-5 h-5" />} value={restoredCount} label="Restored" colorClass="text-mint" iconBg="bg-mint/10 border-mint/30 text-mint" />
          <StatCard icon={<LocationIcon className="w-5 h-5" />} value={history.last30d.count} label="Tracked (30 Days)" colorClass="text-purple" iconBg="bg-purple/10 border-purple/30 text-purple" />
        </div>

        {/* MAP + CURRENT STATUS */}
        <div id="map" className="mt-8 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 scroll-mt-20">
          <div>
            <h2 className="text-lg font-extrabold mb-3">Live Power Cut Map — {locality.name}</h2>
            {locality.latitude != null && locality.longitude != null ? (
              <div className="glass overflow-hidden">
                <MapLoader center={[locality.latitude, locality.longitude]} zoom={13} markers={localityMarkers} heightClassName="h-80" />
              </div>
            ) : (
              <div className="glass p-5 text-sm text-gray-dim">Map unavailable — this area is missing coordinates.</div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-extrabold mb-3">Current Power Status</h2>
            <div className="glass p-5">
              <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide mb-3 ${statusColorClasses[currentStatus === "ongoing" ? "ongoing" : currentStatus === "scheduled" ? "scheduled" : "unknown"]}`}>
                {currentStatus === "ongoing" ? "Ongoing Outage" : currentStatus === "scheduled" ? "Scheduled Today" : "No Known Issue"}
              </span>

              {ongoing ? (
                <dl className="flex flex-col gap-2.5 text-sm mt-2">
                  <Row label="Reported At" value={ongoing.lastVerifiedAt ? formatDateTimeIST(ongoing.lastVerifiedAt) : formatDateTimeIST(ongoing.startTime)} />
                  <Row label="Estimated Restoration" value={formatTimeIST(ongoing.endTime)} />
                  <Row label="Affected Area" value={locality.name} />
                  <Row label="Cause" value={ongoing.reason ?? "Not specified"} />
                  <Row label="Source" value={sourceMeta ? `${sourceMeta.official ? "✓" : "⚠"} ${sourceMeta.displayName}` : "Unknown"} />
                  <Row label="Last Updated" value={ongoing.lastVerifiedAt ? formatDateTimeIST(ongoing.lastVerifiedAt) : "—"} />
                </dl>
              ) : (
                <p className="text-sm text-gray-dim mt-2">
                  {scheduledCount > 0 ? `${scheduledCount} scheduled outage(s) today — see the Outages section below.` : `No known issues in ${locality.name} right now.`}
                </p>
              )}

              <Link href="#" className="mt-4 block text-center rounded-xl py-3 font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #FF17C9, #A020F0)" }}>
                Get Alerts for {locality.name}
              </Link>
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <Link href="/power-cut/karnataka/bengaluru" className="rounded-xl py-2.5 text-center text-xs font-bold text-white bg-pink">Report Outage</Link>
                <a href="#nearby" className="rounded-xl py-2.5 text-center text-xs font-bold text-white bg-blue">Check Nearby</a>
              </div>
            </div>
          </div>
        </div>

        {/* OUTAGES TABLE + TRENDS */}
        <div id="outages" className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start scroll-mt-20">
          <div>
            <h2 className="text-lg font-extrabold mb-3">Active &amp; Scheduled Outages</h2>
            <OutagesFilterTable rows={filterTableRows} />
          </div>
          <div id="history" className="scroll-mt-20">
            <h2 className="text-lg font-extrabold mb-3">Power Cut Trends — {locality.name}</h2>
            <OutageHistoryChart history={history} />
          </div>
        </div>

        {/* NEARBY + DISCOM */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div id="nearby" className="scroll-mt-20">
            <h2 className="text-lg font-extrabold mb-3">Nearby Areas</h2>
            <div className="glass p-5">
              <div className="grid grid-cols-2 gap-3">
                {nearby.map((l) => (
                  <Link key={l.id} href={`/power-cut/${stateSlug}/${citySlug}/${l.slug}`} className="rounded-xl border border-glass-border bg-white/[0.02] p-3 hover:border-purple/40 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${l.activeCount > 0 ? "bg-amber-status" : "bg-mint"}`} />
                      <span className="font-bold text-sm text-white">{l.name}</span>
                    </div>
                    <p className="text-xs text-gray-dim mt-1">
                      {l.activeCount > 0 ? `${l.activeCount} active outage${l.activeCount > 1 ? "s" : ""}` : "No active outages"}
                    </p>
                    <p className="text-xs text-purple mt-1">{l.distanceKm.toFixed(1)} km →</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div id="discom" className="scroll-mt-20">
            <h2 className="text-lg font-extrabold mb-3">DISCOM Information</h2>
            {provider ? (
              <div className="glass p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-magenta/10 border border-magenta/30 flex items-center justify-center">
                    <LightningIcon className="w-5 h-5 text-yellow" filled />
                  </div>
                  <div>
                    <p className="font-extrabold text-white">{provider.shortName}</p>
                    <p className="text-xs text-gray-dim">{provider.name}</p>
                  </div>
                </div>
                {provider.customerCarePhone && (
                  <p className="text-sm mb-1">
                    <span className="text-gray-dim">Consumer Helpline: </span>
                    <span className="font-bold text-mint">{provider.customerCarePhone}</span>
                  </p>
                )}
                {provider.website && (
                  <a href={provider.website} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm text-purple font-semibold">
                    Visit Official Website →
                  </a>
                )}
              </div>
            ) : (
              <div className="glass p-5 text-sm text-gray-dim">Provider information isn&rsquo;t available yet for this area.</div>
            )}
          </div>
        </div>

        {/* DUAL CTA */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="glass p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-extrabold text-white text-sm">Never Miss a Power Cut</p>
              <p className="text-xs text-gray-dim mt-0.5">Subscribe for alerts (coming soon)</p>
            </div>
            <span className="rounded-xl px-4 py-2 text-xs font-bold text-gray-dim bg-white/5 cursor-not-allowed">Coming Soon</span>
          </div>
          <div className="glass p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-extrabold text-white text-sm">Report a Power Outage</p>
              <p className="text-xs text-gray-dim mt-0.5">Facing a power cut? Help your community.</p>
            </div>
            <Link href="/power-cut/karnataka/bengaluru" className="rounded-xl px-4 py-2 text-xs font-bold text-white bg-pink">Report Outage</Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 glass p-5">
          <h2 className="text-lg font-extrabold mb-3">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-bold text-white">How often is {locality.name}&rsquo;s power cut data updated?</p>
              <p className="text-sm text-gray-dim mt-1">Sourced outages are checked multiple times a day. Community reports appear as soon as someone submits them.</p>
            </div>
            <div>
              <p className="text-sm font-bold text-white">What electricity provider serves {locality.name}?</p>
              <p className="text-sm text-gray-dim mt-1">{provider ? `${locality.name} is served by ${provider.name} (${provider.shortName}).` : "Provider information isn't available yet for this area."}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-white">How do I report a power cut in {locality.name}?</p>
              <p className="text-sm text-gray-dim mt-1">Use the &ldquo;Report Outage&rdquo; button. Reports are shown as unverified community signals, separate from sourced outages.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 glass p-5 text-sm text-gray-dim">
          Outage information for {locality.name} is sourced and labeled by trust level on every card. Not affiliated with {provider?.shortName ?? "the local electricity provider"}. For emergencies, contact your provider directly.
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, colorClass, iconBg }: { icon: React.ReactNode; value: number; label: string; colorClass: string; iconBg: string }) {
  return (
    <div className="glass p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <div className={`text-xl font-extrabold tabular-nums-mono ${colorClass}`}>{value}</div>
        <div className="text-[10px] font-bold text-gray-dim uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-glass-border pb-2 last:border-0">
      <dt className="text-gray-dim text-xs">{label}</dt>
      <dd className="text-white text-xs font-semibold text-right">{value}</dd>
    </div>
  );
}
