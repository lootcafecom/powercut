import Link from "next/link";
import { getHomepageStats, getOutagesForCity, getCityBySlug } from "@/lib/db/queries";
import { computeOutageStatus, statusLabels } from "@/lib/outage-status";
import { formatTimeIST } from "@/lib/format";
import { siteConfig } from "@/lib/config/site";
import { LightningIcon } from "@/components/icons/lightning";
import {
  ClockIcon,
  WarningIcon,
  LocationIcon,
  CalendarIcon,
  BellIcon,
  ShieldIcon,
  SearchIcon,
  ChevronRightIcon,
} from "@/components/icons";
import { IndiaMapGlow } from "@/components/hero/india-map-glow";
import { MapLoader, type MapMarker } from "@/components/map/map-loader";

export const dynamic = "force-dynamic";

const statusIconBg: Record<string, string> = {
  ongoing: "bg-red text-white",
  scheduled: "bg-orange text-bg-deep",
  starting_soon: "bg-orange text-bg-deep",
  scheduled_window_ended: "bg-white/15 text-white",
  restored: "bg-green text-bg-deep",
  cancelled: "bg-white/15 text-white",
  unknown: "bg-white/15 text-white",
};

const statusIconCircle: Record<string, string> = {
  ongoing: "bg-red text-white",
  scheduled: "bg-orange text-bg-deep",
  starting_soon: "bg-orange text-bg-deep",
  scheduled_window_ended: "bg-white/20 text-white",
  restored: "bg-green text-bg-deep",
  cancelled: "bg-white/20 text-white",
  unknown: "bg-white/20 text-white",
};

function StatusRowIcon({ status }: { status: string }) {
  const cls = "h-4 w-4";
  if (status === "ongoing") return <WarningIcon className={cls} />;
  if (status === "restored") return <ShieldIcon className={cls} />;
  return <CalendarIcon className={cls} />;
}

export default async function HomePage() {
  const stats = await getHomepageStats();
  const bengaluru = await getCityBySlug("karnataka", "bengaluru");
  const outageRows = bengaluru ? await getOutagesForCity(bengaluru.city.id) : [];

  const nearYou = outageRows
    .map(({ outage, locality, provider }) => ({
      id: outage.id,
      locality: locality?.name ?? "City-wide",
      provider: provider.shortName,
      status: computeOutageStatus(outage),
      startTime: outage.startTime,
      endTime: outage.endTime,
    }))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

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
    <div className="bg-radial-glow">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line-soft">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
        {/* Diagonal lightning streak for atmosphere, top-right corner */}
        <svg
          className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 opacity-50 lg:h-96 lg:w-96"
          viewBox="0 0 300 300"
          fill="none"
        >
          <path
            d="M40,10 L180,90 L120,110 L260,220"
            stroke="#00D9FF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M60,40 L200,120"
            stroke="#1687FF"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
        {/* Skyline silhouette + glow streak, for atmosphere behind the map */}
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-60"
          viewBox="0 0 1500 160"
          preserveAspectRatio="none"
          fill="none"
        >
          <rect x="0" y="90" width="60" height="70" fill="#06142D" />
          <rect x="70" y="60" width="45" height="100" fill="#06142D" />
          <rect x="125" y="100" width="55" height="60" fill="#06142D" />
          <rect x="1250" y="70" width="50" height="90" fill="#06142D" />
          <rect x="1310" y="40" width="40" height="120" fill="#06142D" />
          <rect x="1360" y="95" width="60" height="65" fill="#06142D" />
          <line x1="1420" y1="10" x2="1420" y2="160" stroke="#1687FF" strokeOpacity="0.3" strokeWidth="2" />
          <line x1="1390" y1="35" x2="1450" y2="35" stroke="#1687FF" strokeOpacity="0.3" strokeWidth="2" />
          <line x1="1400" y1="60" x2="1440" y2="60" stroke="#1687FF" strokeOpacity="0.3" strokeWidth="2" />
        </svg>
        <div className="relative mx-auto grid max-w-[1500px] grid-cols-1 items-start gap-10 px-4 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Stay Ahead.
              <br />
              <span className="text-yellow text-glow-yellow">Stay Powered.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-text-muted">
              {siteConfig.description}
            </p>

            <form
              action="/power-cut/karnataka/bengaluru"
              className="glow-blue mt-8 flex flex-col gap-2 rounded-xl border border-line-neon bg-bg-card p-2 sm:flex-row"
            >
              <div className="flex flex-1 items-center gap-2 px-3">
                <SearchIcon className="h-5 w-5 shrink-0 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search your city, area or pincode..."
                  className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-text-muted focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="glow-yellow flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-5 py-2.5 text-sm font-bold text-bg-deep transition hover:brightness-95"
              >
                <LightningIcon className="h-4 w-4" filled />
                Search Now
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-muted">Popular Searches:</span>
              <Link
                href="/power-cut/karnataka/bengaluru"
                className="rounded-full border border-blue/40 bg-blue/10 px-3 py-1 text-xs font-medium text-blue-2 hover:bg-blue/20"
              >
                Bengaluru
              </Link>
              {["Delhi", "Mumbai", "Hyderabad", "Chennai", "Kolkata"].map((city) => (
                <span
                  key={city}
                  className="cursor-not-allowed rounded-full border border-line-soft px-3 py-1 text-xs text-text-muted/50"
                  title="Coming soon"
                >
                  {city}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[420px]">
            <IndiaMapGlow className="h-auto w-full" bengaluruCount={stats.ongoingCount} />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-[1500px] px-4 py-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<LightningIcon className="h-5 w-5" filled />}
            value={stats.todayCount}
            label="Power Cuts Today"
            sub="Bengaluru"
            glow="glow-blue"
            iconWrap="bg-blue text-white"
          />
          <StatCard
            icon={<ClockIcon className="h-5 w-5" />}
            value={stats.totalPublished}
            label="Total Tracked"
            sub="Since launch"
            glow="glow-cyan"
            iconWrap="bg-cyan text-bg-deep"
          />
          <StatCard
            icon={<WarningIcon className="h-5 w-5" />}
            value={stats.ongoingCount}
            label="Ongoing Right Now"
            sub="Bengaluru"
            glow="glow-red"
            iconWrap="bg-orange text-bg-deep"
          />
          <StatCard
            icon={<LocationIcon className="h-5 w-5" />}
            value={stats.localitiesCovered}
            label="Localities Covered"
            sub="Bengaluru"
            glow="glow-blue"
            iconWrap="bg-purple text-white"
          />
        </div>
      </section>

      {/* MAIN CONTENT: near-you + map */}
      <section className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-2">
        {/* Power cuts near you */}
        <div className="glow-blue rounded-xl border border-line-neon bg-bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <LightningIcon className="h-5 w-5 text-yellow-2" filled />
              Power Cuts Near You
            </h2>
            <Link
              href="/power-cut/karnataka/bengaluru"
              className="flex items-center gap-1 text-sm text-blue-2 hover:text-cyan"
            >
              View All <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {nearYou.length === 0 && (
              <p className="rounded-lg border border-dashed border-line-soft p-6 text-center text-sm text-text-muted">
                No published outages right now.
              </p>
            )}
            {nearYou.map((row) => (
              <div
                key={row.id}
                className="hover-lift flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-bg-panel px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${statusIconCircle[row.status]}`}
                  >
                    <StatusRowIcon status={row.status} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{row.locality}</p>
                    <p className="text-xs text-text-muted">{row.provider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${statusIconBg[row.status]}`}
                    >
                      {statusLabels[row.status]}
                    </p>
                    <p className="tabular-nums-mono mt-1 text-xs text-text-muted">
                      {formatTimeIST(row.startTime)}–{formatTimeIST(row.endTime)}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-text-muted" />
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/power-cut/karnataka/bengaluru"
            className="glow-yellow mt-5 flex items-center justify-center gap-1.5 rounded-lg border border-yellow/50 py-3 text-sm font-semibold text-yellow hover:bg-yellow/5"
          >
            <LightningIcon className="h-4 w-4" filled />
            View All Power Cuts
          </Link>
        </div>

        {/* Live outage map */}
        <div className="glow-blue rounded-xl border border-line-neon bg-bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <LightningIcon className="h-5 w-5 text-yellow-2" filled />
              Live Outage Map
            </h2>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-line-soft">
            <MapLoader
              center={[22.0, 79.0]}
              zoom={4}
              markers={indiaMarkers}
              heightClassName="h-80"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-muted">
            <LegendDot color="bg-red" label="Ongoing" />
            <LegendDot color="bg-orange" label="Scheduled" />
            <LegendDot color="bg-blue" label="Normal" />
            <LegendDot color="bg-[#3A4A66]" label="Not covered yet" muted />
          </div>
        </div>
      </section>

      {/* Alerts — honestly marked as not live yet */}
      <section className="mx-auto max-w-[1500px] px-4 py-6">
        <div className="rounded-xl border border-line-soft bg-bg-card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <BellIcon className="h-5 w-5 text-yellow-2" />
            Get Power Cut Alerts
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Email alerts are on the roadmap and not live yet — this is a
            preview of what&rsquo;s coming.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              disabled
              placeholder="Enter your email address"
              className="flex-1 cursor-not-allowed rounded-md border border-line-soft bg-bg-panel px-4 py-2.5 text-sm text-text-muted placeholder:text-text-muted/60"
            />
            <button
              disabled
              className="cursor-not-allowed rounded-md bg-yellow/30 px-5 py-2.5 text-sm font-semibold text-bg-deep/60"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </section>

      {/* App — honest "coming soon", not a fake download banner */}
      <section className="mx-auto max-w-[1500px] px-4 py-6">
        <div className="glow-blue relative overflow-hidden rounded-xl border border-line-neon bg-bg-card p-8 sm:p-10">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-yellow/30 bg-yellow/10">
              <LightningIcon className="h-9 w-9 text-yellow-2 icon-glow-blue" filled />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                Carry {siteConfig.name} in Your Pocket
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                A mobile app is on the roadmap, not built yet. When it
                ships, it&rsquo;ll show up here — no download links exist
                today, so we won&rsquo;t pretend otherwise.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-yellow/30 bg-yellow/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-yellow">
              Coming Soon
            </span>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="border-t border-line-soft py-16">
        <div className="mx-auto max-w-[1500px] px-4">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
            Why Choose {siteConfig.name}?
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <Feature
              icon={<LightningIcon className="h-6 w-6" filled />}
              title="Real-time Status"
              body="A live status engine — scheduled, starting soon, ongoing, or window ended — not a static list."
            />
            <Feature
              icon={<CalendarIcon className="h-6 w-6" />}
              title="Scheduled & Unscheduled"
              body="Sourced scheduled outages, plus a community-report layer for unannounced ones."
            />
            <Feature
              icon={<LocationIcon className="h-6 w-6" />}
              title="Bengaluru Today"
              body="Live now in Bengaluru, with the architecture built to expand city by city."
            />
            <Feature
              icon={<BellIcon className="h-6 w-6" />}
              title="Alerts (Coming Soon)"
              body="Email and push alerts are on the roadmap — not available yet."
            />
            <Feature
              icon={<ShieldIcon className="h-6 w-6" />}
              title="Source Transparency"
              body="Every outage is labeled: official source or unverified — never blended together."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  sub,
  glow,
  iconWrap,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  sub: string;
  glow: string;
  iconWrap: string;
}) {
  return (
    <div className={`${glow} rounded-xl border border-line-neon bg-bg-card p-5`}>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${iconWrap}`}>
        {icon}
      </div>
      <p className="tabular-nums-mono mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="text-xs text-text-muted/60">{sub}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center">
      <div className="glow-blue mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-line-neon bg-blue/10 text-blue-2">
        {icon}
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-text-muted">{body}</p>
    </div>
  );
}

function LegendDot({
  color,
  label,
  muted,
}: {
  color: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${muted ? "opacity-50" : ""}`}>
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
