import Link from "next/link";
import { getHomepageStats, getOutagesForCity, getCityBySlug, getAllLocalities, getCityDirectory } from "@/lib/db/queries";
import { computeOutageStatus, statusLabels } from "@/lib/outage-status";
import { formatTimeIST } from "@/lib/format";
import { siteConfig } from "@/lib/config/site";
import { MapLoader, type MapMarker } from "@/components/map/map-loader";

export const dynamic = "force-dynamic";

const STATUS_TEXT_CLASS: Record<string, string> = {
  ongoing: "text-pink",
  scheduled: "text-amber-status",
  starting_soon: "text-amber-status",
  scheduled_window_ended: "text-gray-dim",
  restored: "text-mint",
  cancelled: "text-gray-dim",
  unknown: "text-gray-dim",
};

// Illustrative only — NOT database rows. Real city list to be provided
// and inserted properly; these are just well-known city names shown as
// "coming soon" so the homepage communicates the roadmap honestly
// without fabricating coverage or conflicting with the real list later.
const UPCOMING_CITIES = [
  "Delhi", "Mumbai", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad",
];

export default async function HomePage() {
  const stats = await getHomepageStats();
  const bengaluru = await getCityBySlug("karnataka", "bengaluru");
  const outageRows = bengaluru ? await getOutagesForCity(bengaluru.city.id) : [];
  const allLocalities = await getAllLocalities();
  const cityLocalities = bengaluru
    ? allLocalities.filter((l) => l.cityId === bengaluru.city.id)
    : [];
  const cityDirectory = await getCityDirectory();

  const cards = outageRows.map(({ outage, locality, provider }) => ({
    id: outage.id,
    locality: locality?.name ?? "City-wide",
    localityId: locality?.id ?? null,
    provider: provider.shortName,
    status: computeOutageStatus(outage),
    startTime: outage.startTime,
    endTime: outage.endTime,
  }));

  const liveReports = [...cards]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 4);

  const restoredCount = cards.filter((c) => c.status === "restored").length;

  const countsByLocality = new Map<number, number>();
  for (const c of cards) {
    if (c.localityId) countsByLocality.set(c.localityId, (countsByLocality.get(c.localityId) ?? 0) + 1);
  }

  const bengaluruMarkerStatus: MapMarker["status"] =
    stats.ongoingCount > 0 ? "ongoing" : stats.todayCount > 0 ? "scheduled" : "normal";

  const indiaMarkers: MapMarker[] = [
    {
      id: "bengaluru",
      lat: 12.9716,
      lng: 77.5946,
      label: "Bengaluru",
      status: bengaluruMarkerStatus,
      popupContent: `${stats.todayCount} outage(s) today, ${stats.ongoingCount} ongoing`,
      href: "/power-cut/karnataka/bengaluru",
    },
    { id: "delhi", lat: 28.6139, lng: 77.209, label: "Delhi", status: "muted", popupContent: "Not covered yet" },
    { id: "mumbai", lat: 19.076, lng: 72.8777, label: "Mumbai", status: "muted", popupContent: "Not covered yet" },
    { id: "kolkata", lat: 22.5726, lng: 88.3639, label: "Kolkata", status: "muted", popupContent: "Not covered yet" },
    { id: "hyderabad", lat: 17.385, lng: 78.4867, label: "Hyderabad", status: "muted", popupContent: "Not covered yet" },
    { id: "chennai", lat: 13.0827, lng: 80.2707, label: "Chennai", status: "muted", popupContent: "Not covered yet" },
  ];

  return (
    <div>
      {/* HERO */}
      <div className="mx-auto max-w-[1280px] px-10 pt-8 pb-2">
        <div className="inline-flex items-center rounded-full border border-amber-status/30 bg-amber-status/10 px-3.5 py-1.5 mb-5 text-[11.5px] font-extrabold tracking-wide text-amber-status">
          <span className="w-1.5 h-1.5 rounded-full bg-mint mr-2 pulse-dot shadow-[0_0_8px_#34D399]" />
          LIVE IN BENGALURU
        </div>

        <h1 className="text-[44px] sm:text-[58px] font-extrabold leading-[1.04] tracking-tight mb-5 max-w-3xl">
          Know before<br />
          the <span className="glow-text">lights go out.</span>
        </h1>

        <p className="text-base sm:text-[17px] text-gray max-w-xl mb-8 leading-relaxed">
          {siteConfig.description}
        </p>

        <form
          action="/power-cut/karnataka/bengaluru"
          className="flex max-w-xl mb-4 flex-col sm:flex-row"
        >
          <input
            type="text"
            name="q"
            placeholder="Search your locality or PIN code..."
            className="flex-1 bg-glass border border-glass-border rounded-2xl sm:rounded-r-none px-5 py-4 text-white placeholder:text-gray-dim outline-none focus:border-amber-status/50 mb-2.5 sm:mb-0"
          />
          <button
            type="submit"
            className="glow-badge-cta rounded-2xl sm:rounded-l-none px-7 font-extrabold text-sm py-4 sm:py-0 text-bg-deep"
            style={{ background: "linear-gradient(135deg, #FFB020, #FF6B35)" }}
          >
            Check status
          </button>
        </form>

        <div className="flex max-w-xl mb-4 flex-col sm:flex-row">
          <Link
            href="/power-cut/karnataka/bengaluru"
            className="flex-1 rounded-2xl py-4 font-bold text-sm flex items-center justify-center border border-pink/40 bg-pink/8 text-pink mb-2.5 sm:mb-0 hover:shadow-[0_0_26px_rgba(248,113,113,0.3)] transition-shadow"
          >
            ⚡ Report Outage
          </Link>
          <Link
            href="/power-cut/karnataka/bengaluru"
            className="flex-1 sm:ml-3 rounded-2xl py-4 font-bold text-sm flex items-center justify-center border border-mint/35 bg-mint/6 text-mint hover:shadow-[0_0_26px_rgba(52,211,153,0.25)] transition-shadow"
          >
            ✓ Power is Back
          </Link>
        </div>

        <p className="text-xs text-gray-dim mb-11">
          {stats.localitiesCovered} localities covered so far ·{" "}
          <Link href="/power-cut/karnataka/bengaluru" className="text-amber-status font-semibold">
            see coverage →
          </Link>
        </p>

        {/* Floating glass stats widget */}
        <div className="glass p-6 sm:p-7 mb-11">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-5 mb-5 border-b border-glass-border">
            <span className="inline-flex items-center text-[11px] font-extrabold text-mint">
              <span className="w-1.5 h-1.5 rounded-full bg-mint mr-2 pulse-dot shadow-[0_0_10px_#34D399]" />
              LIVE RIGHT NOW
            </span>
            <div className="flex gap-8">
              <Stat value={stats.ongoingCount} label="Ongoing" colorClass="text-pink" />
              <Stat value={stats.todayCount} label="Scheduled Today" colorClass="text-white" />
              <Stat value={restoredCount} label="Restored · 24h" colorClass="text-mint" />
            </div>
          </div>

          {liveReports.length === 0 ? (
            <p className="text-sm text-gray-dim py-2">No published outages right now.</p>
          ) : (
            liveReports.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-glass-border last:border-0">
                <div className="flex items-center">
                  <span
                    className={`w-2 h-2 rounded-full mr-3 shrink-0 ${
                      r.status === "ongoing" ? "bg-pink shadow-[0_0_10px_#F87171]"
                      : r.status === "restored" ? "bg-mint shadow-[0_0_10px_#34D399]"
                      : "bg-amber-status shadow-[0_0_10px_#FFB020]"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">{r.locality}</p>
                    <p className="text-[11.5px] text-gray-dim mt-0.5">
                      <span className={`font-bold ${STATUS_TEXT_CLASS[r.status]}`}>
                        {statusLabels[r.status]}
                      </span>{" "}
                      · {formatTimeIST(r.startTime)}–{formatTimeIST(r.endTime)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-dim">{r.provider}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-10">
        <div className="glow-divider mb-12" />
      </div>

      {/* CITIES DIRECTORY */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <h2 className="text-xl font-extrabold mb-1">Cities</h2>
        <p className="text-sm text-gray-dim mb-5">
          Individual pages per city, added as real data sources are found —
          nothing here is fabricated to look more complete than it is.
        </p>
        <div className="flex flex-wrap gap-3">
          {cityDirectory.map((c) => (
            <Link
              key={c.cityId}
              href={`/power-cut/${c.stateSlug}/${c.citySlug}`}
              className="glass hover-lift px-5 py-3 flex items-center gap-2.5"
            >
              <span className={`w-2 h-2 rounded-full ${c.isLive ? "bg-mint shadow-[0_0_8px_#34D399]" : "bg-gray-dim"}`} />
              <span className="font-bold text-sm text-white">{c.cityName}</span>
              <span className="text-xs text-gray-dim">{c.stateName}</span>
              {c.isLive && (
                <span className="text-[10px] font-extrabold text-mint uppercase tracking-wide">Live</span>
              )}
            </Link>
          ))}
          {UPCOMING_CITIES.map((name) => (
            <span
              key={name}
              className="glass px-5 py-3 flex items-center gap-2.5 opacity-50 cursor-not-allowed"
              title="Coming soon — not covered yet"
            >
              <span className="w-2 h-2 rounded-full bg-gray-dim" />
              <span className="font-bold text-sm text-white">{name}</span>
              <span className="text-[10px] font-extrabold text-gray-dim uppercase tracking-wide">Coming Soon</span>
            </span>
          ))}
        </div>
      </div>

      {/* MAP */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-xl font-extrabold">Locality map</h2>
        </div>
        <div className="glass overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-glass-border">
            <h3 className="text-[13px] font-extrabold tracking-wide">LIVE GRID STATUS</h3>
            <span className="text-xs text-gray-dim">Bengaluru · IST</span>
          </div>
          <MapLoader center={[22.0, 79.0]} zoom={4} markers={indiaMarkers} heightClassName="h-96" />
        </div>
      </div>

      {/* BROWSE LOCALITIES */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <h2 className="text-xl font-extrabold mb-5">Browse localities</h2>
        <div className="glass p-6">
          <p className="text-[11px] font-extrabold tracking-wide text-gray-dim mb-3.5">BENGALURU</p>
          <div className="flex flex-wrap gap-2.5">
            {cityLocalities.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center rounded-full border border-glass-border bg-glass px-4 py-2 text-sm font-semibold text-white hover:border-amber-status/40 hover:shadow-[0_0_16px_rgba(255,176,32,0.18)] transition-all"
              >
                {l.name}
                <span
                  className="ml-2 rounded-full text-[10.5px] font-extrabold px-2 py-0.5 text-bg-deep"
                  style={{ background: "linear-gradient(135deg, #FFB020, #FF6B35)" }}
                >
                  {countsByLocality.get(l.id) ?? 0}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ABOUT / HOW IT WORKS */}
      <div className="mx-auto max-w-[1280px] px-10 mb-8">
        <div className="glass p-6 mb-4">
          <h3 className="text-[17px] font-extrabold mb-3">About {siteConfig.name}</h3>
          <p className="text-sm text-gray leading-relaxed mb-3">
            {siteConfig.name} combines sourced BESCOM outage notices with community
            reports for Bengaluru — every card tells you which one it is, and
            what to trust it for.
          </p>
          <p className="text-sm text-gray leading-relaxed">
            Not affiliated with BESCOM. For emergencies, contact your provider directly.
          </p>
        </div>

        <div className="glass p-6 mb-4">
          <h3 className="text-[17px] font-extrabold mb-4">How it works</h3>
          <div className="flex flex-col sm:flex-row gap-5">
            <Step n="01" title="Search" desc="Find your locality or PIN." />
            <Step n="02" title="Check status" desc="Sourced + reported, clearly labeled." />
            <Step n="03" title="Compare nearby" desc="See the extent of an issue." />
            <Step n="04" title="Report" desc="Tell others when power drops." />
            <Step n="05" title="Confirm restore" desc="Update the community." />
          </div>
        </div>

        <div className="glass p-4 text-center text-xs text-gray leading-relaxed">
          ⚠ Sourced outages come from BESCOM notices and secondary sources —
          labeled by trust level. Community reports are unverified. Not an
          emergency service.
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div>
      <div className={`tabular-nums-mono text-3xl font-extrabold ${colorClass}`}>{value}</div>
      <div className="text-[10.5px] font-bold tracking-wide text-gray-dim mt-0.5">{label.toUpperCase()}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex-1">
      <div className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-lg bg-amber-status/12 border border-amber-status/30 text-amber-status font-extrabold text-[11.5px] mb-2.5">
        {n}
      </div>
      <p className="font-extrabold text-sm mb-1.5">{title}</p>
      <p className="text-[12.5px] text-gray leading-relaxed">{desc}</p>
    </div>
  );
}
