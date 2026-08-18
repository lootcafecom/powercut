import { getAllStates, getAllProviders, getAllCities, getAllLocalities } from "@/lib/db/queries";
import { OutageForm } from "@/components/admin/outage-form";
import { createOutage } from "@/lib/actions/outage-actions";

export default async function NewOutagePage() {
  const [states, providers, cities, localities] = await Promise.all([
    getAllStates(),
    getAllProviders(),
    getAllCities(),
    getAllLocalities(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">
        New outage
      </h1>
      <p className="mt-1 text-sm text-muted">
        Manually enter an outage. It will only appear on the public site once
        verification status is set to &ldquo;published&rdquo;.
      </p>
      <div className="mt-6">
        <OutageForm
          action={createOutage}
          states={states}
          providers={providers.map((p) => ({ id: p.id, name: p.shortName }))}
          cities={cities}
          localities={localities}
          submitLabel="Create outage"
        />
      </div>
    </div>
  );
}
