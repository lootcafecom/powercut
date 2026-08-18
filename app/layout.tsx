import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { siteConfig } from "@/lib/config/site";
import { SignOutButton } from "@/components/admin/sign-out-button";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="bg-ink text-white">
      {/* Signature element: a live sync strip that appears on every page —
          the site's running promise that data freshness is always visible. */}
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-1.5 flex items-center gap-2 text-[11px] tabular-nums-mono text-white/70">
          <span className="relative flex h-1.5 w-1.5">
            <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
          </span>
          <span>GRID SYNC · BESCOM · KARNATAKA</span>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="hazard-corner h-6 w-6 rounded-sm" aria-hidden />
          <span className="font-display text-xl font-bold uppercase tracking-wide">
            {siteConfig.name}
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/80">
          <Link href="/power-cut/karnataka/bengaluru" className="hover:text-white">
            Bengaluru
          </Link>
          <Link href="/admin/outages" className="hover:text-white">
            Admin
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-2">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.name}. Outage data is
          sourced from official provider notices and reviewed before
          publication.
        </p>
        <p className="tabular-nums-mono text-xs">{siteConfig.defaultTimezone}</p>
      </div>
    </footer>
  );
}
