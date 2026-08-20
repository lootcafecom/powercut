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

export const dynamic = "force-dynamic";

const statusDot: Record<string, string> = {
  ongoing: "bg-red text-red",
  scheduled: "bg-orange text-orange",
  starting_soon: "bg-orange text-orange",
  scheduled_window_ended: "bg-text-muted text-text-muted",
  restored: "bg-green text-green",
  cancelled: "bg-text-muted text-text-muted",
  unknown: "bg-text-muted text-text-muted",
};

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

  return (
    <div className="bg-radial-glow">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line-soft">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
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

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <IndiaMapGlow className="h-auto w-full" />
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
            iconWrap="bg-blue/15 text-blue-2"
          />
          <StatCard
            icon={<ClockIcon className="h-5 w-5" />}
            value={stats.totalPublished}
            label="Total Tracked"
            sub="Since launch"
            glow="glow-cyan"
            iconWrap="bg-cyan/15 text-cyan"
          />
          <StatCard
            icon={<WarningIcon className="h-5 w-5" />}
            value={stats.ongoingCount}
            label="Ongoing Right Now"
            sub="Bengaluru"
            glow="glow-red"
            iconWrap="bg-orange/15 text-orange"
          />
          <StatCard
            icon={<LocationIcon className="h-5 w-5" />}
            value={stats.localitiesCovered}
            label="Localities Covered"
            sub="Bengaluru"
            glow="glow-blue"
            iconWrap="bg-purple/15 text-purple"
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
                    className={`relative flex h-2.5 w-2.5 shrink-0 rounded-full ${statusDot[row.status]?.split(" ")[0]}`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{row.locality}</p>
                    <p className="text-xs text-text-muted">{row.provider}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold ${statusDot[row.status]?.split(" ")[1]}`}>
                    {statusLabels[row.status]}
                  </p>
                  <p className="tabular-nums-mono text-xs text-text-muted">
                    {formatTimeIST(row.startTime)}–{formatTimeIST(row.endTime)}
                  </p>
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
            <span className="text-sm text-text-muted/50" title="Coming soon">
              View Full Map →
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center rounded-lg border border-line-soft bg-bg-panel p-6">
            <IndiaMapGlow className="h-72 w-auto" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-muted">
            <LegendDot color="bg-yellow" label="Live (Bengaluru)" />
            <LegendDot color="bg-blue" label="Coming soon" muted />
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
