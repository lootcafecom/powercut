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
import { formatTimeIST, isSameISTDate, formatDateIST } from "@/lib/format";
import { MapLoader, type MapMarker } from "@/components/map/map-loader";
import { OutageHistoryChart } from "@/components/outage/outage-history-chart";
import { LightningIcon } from "@/components/icons/lightning";

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
          <p className="text-gray-dim text-sm leading-relaxed mb-6">
            We don&rsquo;t have this area in our database yet.
          </p>
          <Link
            href="/power-cut/karnataka/bengaluru"
            className="inline-block rounded-xl px-5 py-3 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #FF17C9, #A020F0)" }}
          >
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
    }));

  const todayOutages = localityOutages.filter((o) => isSameISTDate(o.startTime, 0));
  const tomorrowOutages = localityOutages.filter((o) => isSameISTDate(o.startTime, 1));
  const ongoing = localityOutages.find((o) => o.status === "ongoing");
  const currentStatus = ongoing ? "ongoing" : todayOutages.some((o) => o.status === "scheduled" || o.status === "starting_soon") ? "scheduled" : "normal";

  // NOTE: with only one DISCOM in the database right now, this just takes
  // the first provider. Once multiple DISCOMs exist, this needs real
  // service-area matching (which provider actually serves this locality),
  // not "the first one in the table."
  const provider = allProviders[0] ?? null;

  // Nearby areas — real distance (Haversine), not just "same city."
  const nearby = allLocalities
    .filter((l) => l.cityId === city.id && l.id !== locality.id && l.latitude != null && l.longitude != null)
    .map((l) => ({
      ...l,
      distanceKm: haversineKm(
        locality.latitude as number,
        locality.longitude as number,
        l.latitude as number,
        l.longitude as number
      ),
    }))
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
    ...nearby
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({
        id: l.id,
        lat: l.latitude as number,
        lng: l.longitude as number,
        label: l.name,
        status: "muted" as const,
      })),
  ];

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
          {
            "@type": "Question",
            name: `How often is ${locality.name}'s power cut data updated?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Sourced outages are checked multiple times a day. Community reports appear as soon as someone submits them.`,
            },
          },
          {
            "@type": "Question",
            name: `What electricity provider serves ${locality.name}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: provider ? `${locality.name} is served by ${provider.name} (${provider.shortName}).` : `Provider information isn't available yet for this area.`,
            },
          },
          {
            "@type": "Question",
            name: `How do I report a power cut in ${locality.name}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Use the "Report Outage" button on this page. Reports are shown as unverified community signals, separate from sourced outages.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 py-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-gray-dim mb-5 flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-white">Home</Link>
        <span>/</span>
        <Link href={`/power-cut/${stateSlug}/${citySlug}`} className="hover:text-white">{state.name}</Link>
        <span>/</span>
        <Link href={`/power-cut/${stateSlug}/${citySlug}`} className="hover:text-white">{city.name}</Link>
        <span>/</span>
        <span className="text-white">{locality.name}</span>
      </nav>

      <div className="glass p-6 sm:p-8">
        <p className="text-xs uppercase tracking-widest text-gray-dim">
          {city.name}, {state.name}
          {locality.postalCode && <span className="tabular-nums-mono"> · {locality.postalCode}</span>}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {locality.name} Power Cut Today
        </h1>
        <p className="mt-1 text-gray">{formatDateIST(new Date().toISOString())}</p>

        <div className="mt-5 flex items-center gap-3">
          <span className={`rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide ${statusColorClasses[currentStatus === "ongoing" ? "ongoing" : currentStatus === "scheduled" ? "scheduled" : "unknown"]}`}>
            {currentStatus === "ongoing" ? "Ongoing outage" : currentStatus === "scheduled" ? "Scheduled today" : "No known issue"}
          </span>
        </div>

        <p className="mt-4 text-sm text-gray leading-relaxed max-w-2xl">
          {provider
            ? `${locality.name} is served by ${provider.name} (${provider.shortName}). `
            : ""}
          {nearby.length > 0
            ? `There ${nearby.length === 1 ? "is" : "are"} ${nearby.length} nearby ${nearby.length === 1 ? "area" : "areas"} we also track — see below for their current status.`
            : ""}
        </p>
      </div>

      {/* TODAY + TOMORROW */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col">
          <h2 className="text-lg font-extrabold mb-3">Today in {locality.name}</h2>
          <div className="glass p-5 flex-1">
            {todayOutages.length === 0 ? (
              <p className="text-sm text-gray-dim py-2">No published outages for today.</p>
            ) : (
              todayOutages.map((o) => (
                <div key={o.id} className="py-3 border-b border-glass-border last:border-0">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${statusColorClasses[o.status]}`}>
                    {statusLabels[o.status]}
                  </span>
                  <p className="text-sm text-white mt-2 tabular-nums-mono">
                    {formatTimeIST(o.startTime)}–{formatTimeIST(o.endTime)}
                  </p>
                  {o.reason && <p className="text-xs text-gray-dim mt-0.5">{o.reason}</p>}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-extrabold mb-3">Tomorrow in {locality.name}</h2>
          <div className="glass p-5 flex-1">
            {tomorrowOutages.length === 0 ? (
              <p className="text-sm text-gray-dim py-2">No scheduled outages for tomorrow yet.</p>
            ) : (
              tomorrowOutages.map((o) => (
                <div key={o.id} className="py-3 border-b border-glass-border last:border-0">
                  <p className="text-sm text-white tabular-nums-mono">
                    {formatTimeIST(o.startTime)}–{formatTimeIST(o.endTime)}
                  </p>
                  {o.reason && <p className="text-xs text-gray-dim mt-0.5">{o.reason}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* HISTORY + CHART */}
      <div className="mt-6">
        <h2 className="text-lg font-extrabold mb-3">Outage History</h2>
        <OutageHistoryChart history={history} />
      </div>

      {/* MAP — defensive: never hand Leaflet a null coordinate. A real
          production bug (locality rows created before coordinates were
          added to the seed script) crashed the whole page this way. */}
      {locality.latitude != null && locality.longitude != null ? (
        <div className="mt-6">
          <h2 className="text-lg font-extrabold mb-3">{locality.name} &amp; Nearby Areas Map</h2>
          <div className="glass overflow-hidden">
            <MapLoader
              center={[locality.latitude, locality.longitude]}
              zoom={13}
              markers={localityMarkers}
              heightClassName="h-80"
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 glass p-5 text-sm text-gray-dim">
          Map unavailable — this area is missing coordinates in the database.
        </div>
      )}

      {/* PROVIDER */}
      {provider && (
        <div className="mt-6 glass p-5">
          <h2 className="text-lg font-extrabold mb-3">Electricity Provider</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-magenta/10 border border-magenta/30 flex items-center justify-center">
                <LightningIcon className="w-5 h-5 text-yellow" filled />
              </div>
              <div>
                <p className="font-extrabold text-white">{provider.shortName}</p>
                <p className="text-xs text-gray-dim">{provider.name}</p>
              </div>
            </div>
            {provider.customerCarePhone && (
              <div>
                <p className="text-[10px] font-bold text-gray-dim uppercase tracking-wide">Helpline</p>
                <p className="text-sm font-bold text-mint">{provider.customerCarePhone}</p>
              </div>
            )}
            {provider.website && (
              <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-sm text-purple font-semibold ml-auto">
                Official website →
              </a>
            )}
          </div>
        </div>
      )}

      {/* NEARBY AREAS */}
      {nearby.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-extrabold mb-3">Nearby Areas</h2>
          <div className="glass p-5">
            <div className="flex flex-wrap gap-2.5">
              {nearby.map((l) => (
                <Link
                  key={l.id}
                  href={`/power-cut/${stateSlug}/${citySlug}/${l.slug}`}
                  className="rounded-full border border-glass-border bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white hover:border-purple/50 transition-colors"
                >
                  {l.name} <span className="text-xs text-gray-dim">· {l.distanceKm.toFixed(1)} km</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="mt-6 glass p-5">
        <h2 className="text-lg font-extrabold mb-3">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-bold text-white">How often is {locality.name}&rsquo;s power cut data updated?</p>
            <p className="text-sm text-gray-dim mt-1">Sourced outages are checked multiple times a day. Community reports appear as soon as someone submits them.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">What electricity provider serves {locality.name}?</p>
            <p className="text-sm text-gray-dim mt-1">
              {provider ? `${locality.name} is served by ${provider.name} (${provider.shortName}).` : "Provider information isn't available yet for this area."}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">How do I report a power cut in {locality.name}?</p>
            <p className="text-sm text-gray-dim mt-1">Use the &ldquo;Report Outage&rdquo; button. Reports are shown as unverified community signals, separate from sourced outages.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 glass p-5 text-sm text-gray-dim">
        Outage information for {locality.name} is sourced and labeled by trust level on every card.
        Not affiliated with {provider?.shortName ?? "the local electricity provider"}. For emergencies, contact your provider directly.
      </div>
    </div>
  );
}
