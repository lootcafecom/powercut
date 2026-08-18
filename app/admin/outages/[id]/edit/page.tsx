import { notFound } from "next/navigation";
import {
  getAllStates,
  getAllProviders,
  getAllCities,
  getAllLocalities,
  getOutageById,
} from "@/lib/db/queries";
import { OutageForm } from "@/components/admin/outage-form";
import { updateOutage } from "@/lib/actions/outage-actions";

export const dynamic = "force-dynamic";

export default async function EditOutagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outageId = Number(id);
  if (Number.isNaN(outageId)) notFound();

  const [states, providers, cities, localities, outage] = await Promise.all([
    getAllStates(),
    getAllProviders(),
    getAllCities(),
    getAllLocalities(),
    getOutageById(outageId),
  ]);

  if (!outage) notFound();

  const boundUpdate = updateOutage.bind(null, outageId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">
        Edit outage
      </h1>
      <p className="mt-1 text-sm text-muted">{outage.title}</p>
      <div className="mt-6">
        <OutageForm
          action={boundUpdate}
          states={states}
          providers={providers.map((p) => ({ id: p.id, name: p.shortName }))}
          cities={cities}
          localities={localities}
          defaults={{
            stateId: outage.stateId,
            districtId: outage.districtId,
            providerId: outage.providerId,
            cityId: outage.cityId,
            localityId: outage.localityId,
            title: outage.title,
            description: outage.description,
            outageType: outage.outageType,
            reason: outage.reason,
            scheduledDate: outage.scheduledDate,
            startTime: outage.startTime,
            endTime: outage.endTime,
            actualStartTime: outage.actualStartTime,
            actualEndTime: outage.actualEndTime,
            sourceType: outage.sourceType,
            sourceUrl: outage.sourceUrl,
            sourceDocument: outage.sourceDocument,
            confidenceScore: outage.confidenceScore,
            verificationStatus: outage.verificationStatus,
          }}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
