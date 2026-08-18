export function EmptyOutageState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <p className="font-display text-lg font-semibold uppercase tracking-wide text-muted">
        No scheduled outage information is currently available
      </p>
      <p className="mt-1 text-sm text-muted">
        We have no verified reports for {label} right now. This does not
        confirm power is uninterrupted — only that no scheduled outage has
        been published for this window.
      </p>
    </div>
  );
}
