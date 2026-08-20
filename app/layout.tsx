import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { siteConfig } from "@/lib/config/site";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { LightningIcon } from "@/components/icons/lightning";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg-deep text-text">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <div className="sticky top-0 z-50">
      {/* Thin announcement bar */}
      <div className="border-b border-line-soft bg-bg-deep">
        <div className="mx-auto flex h-[35px] max-w-[1500px] items-center justify-between px-4 text-xs text-text-muted">
          <span className="hidden sm:inline">
            ⚡ {siteConfig.name} — live in Bengaluru today, expanding across
            India next
          </span>
          <span className="sm:hidden">⚡ {siteConfig.name}</span>
          <div className="flex items-center gap-4">
            <span className="hidden text-text-muted/70 sm:inline">
              Android &amp; iOS apps — coming soon
            </span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <header className="border-b border-line-soft bg-bg-deep/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <LightningIcon className="h-6 w-6 text-yellow-2 icon-glow-blue" filled />
            <span className="text-lg font-bold tracking-tight text-white">
              {siteConfig.name}
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-text-muted lg:flex">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <Link href="/power-cut/karnataka/bengaluru" className="hover:text-white">
              Power Cuts
            </Link>
            <Link href="/admin/outages" className="hover:text-white">
              Admin
            </Link>
            <SignOutButton />
          </nav>

          <Link
            href="/power-cut/karnataka/bengaluru"
            className="glow-yellow rounded-md bg-yellow px-4 py-2 text-sm font-semibold text-bg-deep transition hover:brightness-95"
          >
            Report Outage
          </Link>
        </div>
      </header>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line-soft bg-bg-panel">
      <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-8 px-4 py-14 sm:grid-cols-3 lg:grid-cols-5">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <div className="flex items-center gap-2">
            <LightningIcon className="h-5 w-5 text-yellow-2" filled />
            <span className="text-base font-bold text-white">{siteConfig.name}</span>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            Real-time and scheduled power cut information — sourced,
            labeled, and verified where possible. Currently live in
            Bengaluru.
          </p>
        </div>

        <FooterColumn title="Quick Links">
          <FooterLink href="/">Home</FooterLink>
          <FooterLink href="/power-cut/karnataka/bengaluru">Power Cuts</FooterLink>
          <FooterLink href="/admin/outages">Admin</FooterLink>
        </FooterColumn>

        <FooterColumn title="Coverage">
          <FooterLink href="/power-cut/karnataka/bengaluru">
            Karnataka — Bengaluru
          </FooterLink>
          <span className="text-sm text-text-muted/50">More states — coming soon</span>
        </FooterColumn>

        <FooterColumn title="Support">
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="text-sm text-text-muted hover:text-white"
          >
            Contact Us
          </a>
          <span className="text-sm text-text-muted/50">Privacy Policy — coming soon</span>
          <span className="text-sm text-text-muted/50">Terms &amp; Conditions — coming soon</span>
        </FooterColumn>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Stay Connected
          </p>
          <p className="mt-3 text-sm text-text-muted">
            Email alerts are on the roadmap — not live yet.
          </p>
        </div>
      </div>

      <div className="border-t border-line-soft">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
            reserved.
          </p>
          <p className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-green" />
            </span>
            Live outage data — updated in real time
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-text-muted hover:text-white">
      {children}
    </Link>
  );
}
