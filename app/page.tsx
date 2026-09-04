import Image from "next/image";
import Link from "next/link";
import { getHomepageStats, getOutagesForCity, getCityBySlug, getAllLocalities, getCityDirectory, getAllStates, getAllProviders } from "@/lib/db/queries";
import { computeOutageStatus, statusLabels } from "@/lib/outage-status";
import { formatTimeIST, isSameISTDate } from "@/lib/format";
import { siteConfig } from "@/lib/config/site";
import { MapLoader, type MapMarker } from "@/components/map/map-loader";
import { TiltCard } from "@/components/ui/tilt-card";
import { LightningIcon } from "@/components/icons/lightning";
import { ShieldIcon, BellIcon, LocationIcon, CalendarIcon } from "@/components/icons";

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

// Same honesty pattern as UPCOMING_CITIES — real state names, not DB rows,
// shown only as a roadmap indicator until real per-state data exists.
const UPCOMING_STATES = [
  "Maharashtra", "Delhi", "Tamil Nadu", "Telangana", "West Bengal", "Uttar Pradesh",
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ pincode_notfound?: string; pincode_invalid?: string }>;
}) {
  const params = await searchParams;
  const pincodeNotFound = params.pincode_notfound;
  const pincodeInvalid = params.pincode_invalid;

  const stats = await getHomepageStats();
  const bengaluru = await getCityBySlug("karnataka", "bengaluru");
  const outageRows = bengaluru ? await getOutagesForCity(bengaluru.city.id) : [];
  const allLocalities = await getAllLocalities();
  const cityLocalities = bengaluru
    ? allLocalities.filter((l) => l.cityId === bengaluru.city.id)
    : [];
  const cityDirectory = await getCityDirectory();
  const allStates = await getAllStates();
  const allProviders = await getAllProviders();

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

  const tomorrowOutages = cards.filter((c) => isSameISTDate(c.startTime, 1));

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
      {/* HERO — full-width background image with content overlaid */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/india-electricity-map.png"
            alt="India electricity grid map with glowing outage points"
            fill
            priority
            className="object-cover"
          />
          {/* Gradient overlay so text stays readable over the image */}
          <div className="absolute inset-0 bg-gradient-to-r from-bg-deep via-bg-deep/85 to-bg-deep/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-bg-deep/60" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-10 pt-16 pb-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-magenta/30 bg-magenta/10 px-3.5 py-1.5 mb-5 text-[11.5px] font-extrabold tracking-wide text-magenta backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-mint mr-2 pulse-dot shadow-[0_0_8px_#34D399]" />
              LIVE IN BENGALURU
            </div>

            <h1 className="text-[44px] sm:text-[58px] font-extrabold leading-[1.04] tracking-tight mb-5">
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
                className="flex-1 bg-glass border border-glass-border rounded-2xl sm:rounded-r-none px-5 py-4 text-white placeholder:text-gray-dim outline-none focus:border-purple/60 mb-2.5 sm:mb-0"
              />
              <button
                type="submit"
                className="glow-badge-cta rounded-2xl sm:rounded-l-none px-7 font-extrabold text-sm py-4 sm:py-0 text-white"
                style={{ background: "linear-gradient(135deg, #FF17C9, #A020F0)" }}
              >
                Check status
              </button>
            </form>

            <div className="flex max-w-xl mb-4 flex-col sm:flex-row">
              <Link
                href="/power-cut/karnataka/bengaluru"
                className="flex-1 rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 border border-pink/40 bg-pink/8 text-pink mb-2.5 sm:mb-0 hover:shadow-[0_0_26px_rgba(248,113,113,0.3)] transition-shadow"
              >
                <LightningIcon className="w-4 h-4 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]" filled />
                Report Outage
              </Link>
              <Link
                href="/power-cut/karnataka/bengaluru"
                className="flex-1 sm:ml-3 rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 border border-mint/35 bg-mint/6 text-mint hover:shadow-[0_0_26px_rgba(52,211,153,0.25)] transition-shadow"
              >
                <ShieldIcon className="w-4 h-4 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                Power is Back
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs text-gray-dim mr-1">Popular Searches:</span>
              <Link href="/power-cut/karnataka/bengaluru" className="glass px-3 py-1.5 rounded-full text-xs font-semibold text-white">
                Bengaluru
              </Link>
              {UPCOMING_CITIES.slice(0, 5).map((name) => (
                <span key={name} className="glass px-3 py-1.5 rounded-full text-xs font-semibold text-gray-dim opacity-50 cursor-not-allowed" title="Coming soon">
                  {name}
                </span>
              ))}
            </div>

            <p className="text-xs text-gray-dim">
              {stats.localitiesCovered} localities covered so far ·{" "}
              <Link href="/power-cut/karnataka/bengaluru" className="text-purple font-semibold">
                see coverage →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* NATIONAL/CURRENT STATUS BAR — real Bengaluru numbers only, no fake national totals */}
      <div className="mx-auto max-w-[1280px] px-10 mb-11">
        <div className="glass p-6 flex flex-wrap gap-8 justify-around">
          <StatusBarItem icon={<LightningIcon className="w-5 h-5" filled />} value={stats.ongoingCount} label="Ongoing Outages" colorClass="text-pink" iconBg="bg-pink/10 border-pink/30 text-pink" />
          <StatusBarItem icon={<CalendarIcon className="w-5 h-5" />} value={stats.todayCount} label="Scheduled Today" colorClass="text-amber-status" iconBg="bg-amber-status/10 border-amber-status/30 text-amber-status" />
          <StatusBarItem icon={<ShieldIcon className="w-5 h-5" />} value={restoredCount} label="Restored · 24h" colorClass="text-mint" iconBg="bg-mint/10 border-mint/30 text-mint" />
          <StatusBarItem icon={<LocationIcon className="w-5 h-5" />} value={stats.localitiesCovered} label="Localities Covered" colorClass="text-purple" iconBg="bg-purple/10 border-purple/30 text-purple" />
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-10 mt-11">
        <div className="glow-divider mb-12" />
      </div>

      {/* CITIES DIRECTORY */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <h2 className="text-xl font-extrabold mb-1 glow-heading">Cities</h2>
        <p className="text-sm text-gray-dim mb-5">
          Individual pages per city, added as real data sources are found —
          nothing here is fabricated to look more complete than it is.
        </p>
        <div className="flex flex-wrap gap-3">
          {cityDirectory.map((c) => (
            <TiltCard key={c.cityId} maxTilt={10} glowColor="rgba(255,23,201,0.3)">
              <Link
                href={`/power-cut/${c.stateSlug}/${c.citySlug}`}
                className="glass px-5 py-3 flex items-center gap-2.5"
              >
                <span className={`w-2 h-2 rounded-full ${c.isLive ? "bg-mint shadow-[0_0_8px_#34D399]" : "bg-gray-dim"}`} />
                <span className="font-bold text-sm text-white">{c.cityName}</span>
                <span className="text-xs text-gray-dim">{c.stateName}</span>
                {c.isLive && (
                  <span className="text-[10px] font-extrabold text-mint uppercase tracking-wide">Live</span>
                )}
              </Link>
            </TiltCard>
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

      {/* BROWSE BY STATE + TOMORROW'S SCHEDULE */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1 glow-heading">Browse by State</h2>
            <p className="text-sm text-gray-dim mb-5">
              Real outage counts for states we cover — others shown as roadmap, not fabricated data.
            </p>
            <div className="flex flex-wrap gap-3">
              {allStates.map((s) => (
                <TiltCard key={s.id} maxTilt={8} glowColor="rgba(160,32,240,0.3)">
                  <Link href={`/power-cut/${s.slug}/bengaluru`} className="glass px-5 py-4 flex flex-col min-w-[140px]">
                    <span className="font-bold text-sm text-white mb-1">{s.name}</span>
                    <span className="text-2xl font-extrabold text-magenta">{stats.totalPublished}</span>
                    <span className="text-[10px] font-bold text-gray-dim uppercase tracking-wide">Tracked Outages</span>
                  </Link>
                </TiltCard>
              ))}
              {UPCOMING_STATES.map((name) => (
                <span
                  key={name}
                  className="glass px-5 py-4 flex flex-col min-w-[140px] opacity-50 cursor-not-allowed"
                  title="Coming soon — not covered yet"
                >
                  <span className="font-bold text-sm text-white mb-1">{name}</span>
                  <span className="text-[10px] font-extrabold text-gray-dim uppercase tracking-wide">Coming Soon</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-extrabold mb-1 glow-heading">Tomorrow&rsquo;s Scheduled Outages</h2>
            <p className="text-sm text-gray-dim mb-5">Real, sourced planned outages — not projections.</p>
            <div className="glass p-5">
              {tomorrowOutages.length === 0 ? (
                <p className="text-sm text-gray-dim py-2">No scheduled outages published for tomorrow yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-extrabold text-gray-dim uppercase tracking-wide border-b border-glass-border">
                      <th className="pb-2 pr-2">Locality</th>
                      <th className="pb-2 pr-2">Time</th>
                      <th className="pb-2">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tomorrowOutages.map((o) => (
                      <tr key={o.id} className="border-b border-glass-border last:border-0">
                        <td className="py-2.5 pr-2 font-bold text-white">{o.locality}</td>
                        <td className="py-2.5 pr-2 text-gray-dim tabular-nums-mono text-xs">
                          {formatTimeIST(o.startTime)}–{formatTimeIST(o.endTime)}
                        </td>
                        <td className="py-2.5 text-gray-dim text-xs">{o.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DISCOM FINDER */}
      <div id="discom-finder" className="mx-auto max-w-[1280px] px-10 mb-12 scroll-mt-6">
        <h2 className="text-xl font-extrabold mb-1 glow-heading">Find Your Electricity Provider</h2>
        <p className="text-sm text-gray-dim mb-5">
          Real provider info for covered areas — no directory of unverified DISCOM details.
        </p>
        <div className="glass p-6">
          {allProviders.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-magenta/10 border border-magenta/30 flex items-center justify-center">
                  <LightningIcon className="w-5 h-5 text-yellow drop-shadow-[0_0_6px_rgba(255,212,0,0.7)]" filled />
                </div>
                <div>
                  <p className="font-extrabold text-white">{p.shortName}</p>
                  <p className="text-xs text-gray-dim">{p.name}</p>
                </div>
              </div>
              {p.customerCarePhone && (
                <div>
                  <p className="text-[10px] font-bold text-gray-dim uppercase tracking-wide">Helpline</p>
                  <p className="text-sm font-bold text-mint">{p.customerCarePhone}</p>
                </div>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-sm text-purple font-semibold ml-auto">
                  Official website →
                </a>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-dim mt-4 pt-4 border-t border-glass-border">
            Serves Karnataka (Bengaluru). More DISCOMs added as we cover more states — never listed without verified contact details.
          </p>
        </div>
      </div>

      {/* LIVE MAP + POWER CUTS TODAY */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-xl font-extrabold glow-heading">Live Power Outage Map</h2>
            </div>
            <div className="glass overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-glass-border">
                <h3 className="text-[13px] font-extrabold tracking-wide">LIVE GRID STATUS</h3>
                <span className="inline-flex items-center text-xs font-extrabold text-mint">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint mr-1.5 pulse-dot shadow-[0_0_8px_#34D399]" />
                  LIVE
                </span>
              </div>
              <MapLoader center={[22.0, 79.0]} zoom={4} markers={indiaMarkers} heightClassName="h-96" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-xl font-extrabold glow-heading">Power Cuts Today</h2>
              <Link href="/power-cut/karnataka/bengaluru" className="text-purple text-sm font-semibold">View All →</Link>
            </div>
            <div className="glass p-5">
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
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction icon={<BellIcon className="w-5 h-5" />} title="Get Power Cut Alerts" desc="Subscribe for instant alerts (coming soon)" cta="Get Alerts" href="#stay-updated" disabled />
          <QuickAction icon={<LightningIcon className="w-5 h-5" filled />} title="Report Power Outage" desc="Facing a power cut? Report it" cta="Report Now" href="/power-cut/karnataka/bengaluru" />
          <QuickAction icon={<LocationIcon className="w-5 h-5" />} title="Find Your DISCOM" desc="Your electricity provider's contact info" cta="Find DISCOM" href="#discom-finder" />
          <QuickAction icon={<CalendarIcon className="w-5 h-5" />} title="Outage Trends" desc="History, patterns for your area" cta="View Trends" href="/power-cut/karnataka/bengaluru" />
        </div>
      </div>

      {/* BROWSE LOCALITIES */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <h2 className="text-xl font-extrabold mb-5 glow-heading">Browse localities</h2>
        <div className="glass p-6">
          <p className="text-[11px] font-extrabold tracking-wide text-gray-dim mb-3.5">BENGALURU</p>
          <div className="flex flex-wrap gap-2.5">
            {cityLocalities.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center rounded-full border border-glass-border bg-glass px-4 py-2 text-sm font-semibold text-white hover:border-purple/50 hover:shadow-[0_0_16px_rgba(160,32,240,0.3)] transition-all"
              >
                {l.name}
                <span
                  className="ml-2 rounded-full text-[10.5px] font-extrabold px-2 py-0.5 text-white"
                  style={{ background: "linear-gradient(135deg, #FF17C9, #A020F0)" }}
                >
                  {countsByLocality.get(l.id) ?? 0}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CHECK BY PINCODE */}
      <div className="mx-auto max-w-[1280px] px-10 mb-12">
        <h2 className="text-xl font-extrabold mb-1 glow-heading">Check Power Cuts by Pincode</h2>
        <p className="text-sm text-gray-dim mb-5">Real lookup against our covered localities — no fabricated PIN database.</p>
        <div className="glass p-6">
          <form action="/api/pincode" className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="text"
              name="code"
              placeholder="Enter 6-digit pincode..."
              maxLength={6}
              pattern="[0-9]{6}"
              className="flex-1 bg-white/[0.03] border border-glass-border rounded-xl px-4 py-3 text-white placeholder:text-gray-dim outline-none focus:border-purple/60"
            />
            <button
              type="submit"
              className="rounded-xl px-6 py-3 font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #FF17C9, #A020F0)" }}
            >
              Check
            </button>
          </form>
          <p className="text-xs text-gray-dim mt-3">Example: 560066 → Whitefield, Bengaluru</p>
          {pincodeNotFound && (
            <p className="text-xs text-pink mt-2">
              &ldquo;{pincodeNotFound}&rdquo; isn&rsquo;t in our covered localities yet.
            </p>
          )}
          {pincodeInvalid && (
            <p className="text-xs text-pink mt-2">Enter a valid 6-digit pincode.</p>
          )}
        </div>
      </div>

      {/* STAY UPDATED — honest, not built yet */}
      <div id="stay-updated" className="mx-auto max-w-[1280px] px-10 mb-12 scroll-mt-6">
        <div className="glass p-6">
          <h2 className="text-lg font-extrabold mb-1">
            Never Miss a Power Cut Update <span className="text-gray-dim font-semibold text-sm">(not built yet)</span>
          </h2>
          <p className="text-sm text-gray-dim mb-4">Subscribe to get instant alerts for your area.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="email"
              disabled
              placeholder="Enter your email address"
              className="flex-1 bg-white/[0.02] border border-glass-border rounded-xl px-4 py-3 text-gray-dim placeholder:text-gray-dim cursor-not-allowed"
            />
            <button disabled className="rounded-xl px-6 py-3 font-bold text-sm text-gray-dim bg-white/5 cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* ABOUT / HOW IT WORKS */}
      <div className="mx-auto max-w-[1280px] px-10 mb-8">
        <TiltCard maxTilt={3} glowColor="rgba(160,32,240,0.25)" className="mb-4">
          <div className="glass p-6">
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
        </TiltCard>

        <TiltCard maxTilt={3} glowColor="rgba(160,32,240,0.25)" className="mb-4">
          <div className="glass p-6">
            <h3 className="text-[17px] font-extrabold mb-4">How it works</h3>
            <div className="flex flex-col sm:flex-row gap-5">
              <Step n="01" title="Search" desc="Find your locality or PIN." />
              <Step n="02" title="Check status" desc="Sourced + reported, clearly labeled." />
              <Step n="03" title="Compare nearby" desc="See the extent of an issue." />
              <Step n="04" title="Report" desc="Tell others when power drops." />
              <Step n="05" title="Confirm restore" desc="Update the community." />
            </div>
          </div>
        </TiltCard>

        <div className="glass p-4 text-center text-xs text-gray leading-relaxed">
          ⚠ Sourced outages come from BESCOM notices and secondary sources —
          labeled by trust level. Community reports are unverified. Not an
          emergency service.
        </div>
      </div>
    </div>
  );
}

function StatusBarItem({
  icon,
  value,
  label,
  colorClass,
  iconBg,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  colorClass: string;
  iconBg: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <div className={`tabular-nums-mono text-2xl font-extrabold ${colorClass}`}>{value}</div>
        <div className="text-[10.5px] font-bold tracking-wide text-gray-dim">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  cta,
  href,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  href: string;
  disabled?: boolean;
}) {
  const content = (
    <div className="glass p-5 h-full">
      <div className="w-10 h-10 rounded-lg bg-purple/10 border border-purple/30 flex items-center justify-center text-purple mb-3">
        {icon}
      </div>
      <p className="font-bold text-sm text-white mb-1">{title}</p>
      <p className="text-xs text-gray-dim mb-3 leading-relaxed">{desc}</p>
      <span className={`text-xs font-bold ${disabled ? "text-gray-dim" : "text-magenta"}`}>{cta} →</span>
    </div>
  );
  if (disabled) {
    return <div className="opacity-60 cursor-not-allowed">{content}</div>;
  }
  return <Link href={href}>{content}</Link>;
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex-1">
      <div className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-lg bg-purple/15 border border-purple/35 text-purple font-extrabold text-[11.5px] mb-2.5">
        {n}
      </div>
      <p className="font-extrabold text-sm mb-1.5">{title}</p>
      <p className="text-[12.5px] text-gray leading-relaxed">{desc}</p>
    </div>
  );
}
