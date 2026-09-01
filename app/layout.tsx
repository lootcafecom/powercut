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
      <body className="min-h-full flex flex-col bg-bg-deep text-white">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <SiteHeader />
        <main className="flex-1 relative z-[1]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="py-6 relative z-[2]">
      <div className="mx-auto max-w-[1280px] px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span
            className="w-9 h-9 rounded-[11px] mr-3 flex items-center justify-center text-lg"
            style={{
              background: "linear-gradient(135deg, #FF17C9, #A020F0)",
              boxShadow: "0 0 24px rgba(255,23,201,0.55), 0 0 50px rgba(160,32,240,0.3)",
              color: "#05060A",
            }}
          >
            ⚡
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            {siteConfig.shortName}
          </span>
        </Link>
        <nav className="flex items-center">
          <Link
            href="/power-cut/karnataka/bengaluru"
            className="hidden sm:inline text-sm text-gray hover:text-white mr-5"
          >
            Bengaluru
          </Link>
          <Link
            href="/admin/outages"
            className="hidden sm:inline text-sm text-gray hover:text-white mr-5"
          >
            Admin
          </Link>
          <span className="mr-5"><SignOutButton /></span>
          <Link
            href="/power-cut/karnataka/bengaluru"
            className="glass rounded-[10px] px-4 py-2 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(255,23,201,0.4)] transition-shadow"
          >
            Report Outage
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="pt-8 pb-12 relative z-[1]">
      <div className="mx-auto max-w-[1280px] px-10">
        <div className="glow-divider mb-8" />
        <div className="flex flex-wrap gap-6 mb-6">
          <FooterLink href="/power-cut/karnataka/bengaluru">Bengaluru outages</FooterLink>
          <FooterLink href="/admin/outages">Admin</FooterLink>
          <a href={`mailto:${siteConfig.contactEmail}`} className="text-sm text-cyan hover:text-amber-status font-semibold">
            Contact
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-glass-border">
          <div className="flex items-center">
            <span
              className="w-6.5 h-6.5 rounded-lg mr-2 flex items-center justify-center text-xs"
              style={{ background: "linear-gradient(135deg, #FF17C9, #A020F0)", color: "#05060A" }}
            >
              ⚡
            </span>
            <span className="text-sm font-extrabold text-white">{siteConfig.shortName}</span>
          </div>
          <p className="text-xs text-gray-dim">
            &copy; {new Date().getFullYear()} {siteConfig.name} — Bengaluru outage tracking
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-cyan hover:text-amber-status font-semibold no-underline">
      {children}
    </Link>
  );
}
