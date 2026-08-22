/**
 * The root layout's <body> is themed dark for the public-facing pages
 * (Theme A — amber/copper glow). The admin panel intentionally stays on
 * its original light utility theme, so this nested layout wraps every
 * /admin/* page in a light background + ink text, overriding the dark
 * body locally rather than requiring every admin page to fight it.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink relative z-[2]">{children}</div>
  );
}
