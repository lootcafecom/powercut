export function EmptyOutageState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line-soft bg-bg-card p-8 text-center">
      <p className="text-lg font-semibold text-white">
        No scheduled outage information is currently available
      </p>
      <p className="mt-1 text-sm text-text-muted">
        We have no verified reports for {label} right now. This does not
        confirm power is uninterrupted — only that no scheduled outage has
        been published for this window.
      </p>
    </div>
  );
}
