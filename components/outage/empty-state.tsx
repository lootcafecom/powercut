export function EmptyOutageState({ label }: { label: string }) {
  return (
    <div className="glass border-dashed p-8 text-center">
      <p className="text-lg font-semibold text-white">
        No scheduled outage information is currently available
      </p>
      <p className="mt-1 text-sm text-gray-dim">
        We have no verified reports for {label} right now. This does not
        confirm power is uninterrupted — only that no scheduled outage has
        been published for this window.
      </p>
    </div>
  );
}
