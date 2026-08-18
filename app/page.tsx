import Link from "next/link";
import { siteConfig } from "@/lib/config/site";

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-line bg-ink text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="text-xs uppercase tracking-widest text-white/50">
            {siteConfig.defaultCountry} · Live outage intelligence
          </p>
          <h1 className="font-display mt-3 text-4xl font-bold uppercase leading-tight tracking-wide sm:text-5xl">
            Power Cut Today?{" "}
            <span className="text-signal">Check Before It Happens.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            {siteConfig.description}
          </p>

          <form
            action="/power-cut/karnataka/bengaluru"
            className="mx-auto mt-8 flex max-w-md flex-col gap-2 sm:flex-row"
          >
            <input
              type="text"
              name="q"
              placeholder="Search city, locality or PIN code"
              className="flex-1 rounded-md border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-signal focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-signal px-5 py-3 text-sm font-semibold uppercase tracking-wide text-ink hover:brightness-95"
            >
              Search
            </button>
          </form>
          <p className="mt-3 text-xs text-white/40">
            Currently live for Bengaluru, Karnataka — more cities coming soon.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-ink">
          Popular cities
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link
            href="/power-cut/karnataka/bengaluru"
            className="rounded-lg border border-line bg-white p-4 hover:border-signal"
          >
            <p className="font-semibold text-ink">Bengaluru</p>
            <p className="text-xs text-muted">Karnataka · BESCOM</p>
          </Link>
          {["Chennai", "Mumbai", "Hyderabad", "Pune", "Delhi"].map((city) => (
            <div
              key={city}
              className="rounded-lg border border-dashed border-line bg-white/50 p-4 text-muted"
            >
              <p className="font-semibold">{city}</p>
              <p className="text-xs">Coming soon</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
