"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/outage-actions";
import {
  outageTypeValues,
  verificationStatusValues,
  sourceTypeValues,
} from "@/lib/db/schema";

interface Option {
  id: number | string;
  name: string;
}

export interface OutageFormDefaults {
  stateId?: number;
  districtId?: number | null;
  providerId?: number;
  cityId?: number;
  localityId?: number | null;
  title?: string;
  description?: string | null;
  outageType?: string;
  reason?: string | null;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  sourceType?: string;
  sourceUrl?: string | null;
  sourceDocument?: string | null;
  confidenceScore?: number;
  verificationStatus?: string;
}

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OutageForm({
  action,
  states,
  providers,
  cities,
  localities,
  defaults,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  states: Option[];
  providers: Option[];
  cities: Option[];
  localities: Option[];
  defaults?: OutageFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-white p-5 sm:grid-cols-2">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Location &amp; provider
        </legend>

        <Select name="stateId" label="State" options={states} defaultValue={defaults?.stateId} errors={errors.stateId} />
        <Select name="providerId" label="Provider" options={providers} defaultValue={defaults?.providerId} errors={errors.providerId} />
        <Select name="cityId" label="City" options={cities} defaultValue={defaults?.cityId} errors={errors.cityId} />
        <Select
          name="localityId"
          label="Locality (optional — leave blank for city-wide)"
          options={localities}
          defaultValue={defaults?.localityId ?? undefined}
          allowEmpty
          errors={errors.localityId}
        />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-white p-5 sm:grid-cols-2">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Outage details
        </legend>

        <TextField name="title" label="Title" defaultValue={defaults?.title} className="sm:col-span-2" errors={errors.title} />
        <TextArea name="description" label="Description" defaultValue={defaults?.description ?? ""} className="sm:col-span-2" errors={errors.description} />
        <Select
          name="outageType"
          label="Outage type"
          options={outageTypeValues.map((v) => ({ id: v, name: v.replace("_", " ") }))}
          defaultValue={defaults?.outageType ?? "scheduled"}
          stringValue
          errors={errors.outageType}
        />
        <TextField name="reason" label="Reason" defaultValue={defaults?.reason ?? ""} errors={errors.reason} />

        <TextField type="date" name="scheduledDate" label="Scheduled date" defaultValue={defaults?.scheduledDate} errors={errors.scheduledDate} />
        <div />
        <TextField
          type="datetime-local"
          name="startTime"
          label="Start time"
          defaultValue={toLocalInputValue(defaults?.startTime)}
          errors={errors.startTime}
        />
        <TextField
          type="datetime-local"
          name="endTime"
          label="End time"
          defaultValue={toLocalInputValue(defaults?.endTime)}
          errors={errors.endTime}
        />
        <TextField
          type="datetime-local"
          name="actualStartTime"
          label="Actual start time (if known)"
          defaultValue={toLocalInputValue(defaults?.actualStartTime)}
          errors={errors.actualStartTime}
        />
        <TextField
          type="datetime-local"
          name="actualEndTime"
          label="Actual end time — only fill when restoration is confirmed"
          defaultValue={toLocalInputValue(defaults?.actualEndTime)}
          errors={errors.actualEndTime}
        />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-white p-5 sm:grid-cols-2">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Source &amp; trust
        </legend>

        <Select
          name="sourceType"
          label="Source type"
          options={sourceTypeValues.map((v) => ({ id: v, name: v.replace(/_/g, " ") }))}
          defaultValue={defaults?.sourceType ?? "manual"}
          stringValue
          errors={errors.sourceType}
        />
        <TextField name="sourceUrl" label="Source URL" defaultValue={defaults?.sourceUrl ?? ""} errors={errors.sourceUrl} />
        <TextField name="sourceDocument" label="Source document reference" defaultValue={defaults?.sourceDocument ?? ""} errors={errors.sourceDocument} />
        <TextField
          type="number"
          name="confidenceScore"
          label="Confidence score (0–100)"
          defaultValue={String(defaults?.confidenceScore ?? 50)}
          errors={errors.confidenceScore}
        />
        <Select
          name="verificationStatus"
          label="Verification status"
          options={verificationStatusValues.map((v) => ({ id: v, name: v.replace("_", " ") }))}
          defaultValue={defaults?.verificationStatus ?? "draft"}
          stringValue
          className="sm:col-span-2"
          errors={errors.verificationStatus}
        />
        <p className="text-xs text-muted sm:col-span-2">
          Only outages with verification status &ldquo;published&rdquo; appear on
          the public site.
        </p>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-ink/90 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  className,
  errors,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  className?: string;
  errors?: string[];
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-line px-3 py-2 text-sm focus:border-signal focus:outline-none"
      />
      {errors?.map((e) => (
        <span key={e} className="text-xs text-alert">
          {e}
        </span>
      ))}
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  className,
  errors,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  className?: string;
  errors?: string[];
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="rounded-md border border-line px-3 py-2 text-sm focus:border-signal focus:outline-none"
      />
      {errors?.map((e) => (
        <span key={e} className="text-xs text-alert">
          {e}
        </span>
      ))}
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
  allowEmpty,
  stringValue,
  className,
  errors,
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValue?: number | string;
  allowEmpty?: boolean;
  stringValue?: boolean;
  className?: string;
  errors?: string[];
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm capitalize focus:border-signal focus:outline-none"
      >
        {allowEmpty && <option value="">— None —</option>}
        {options.map((o) => (
          <option key={o.id} value={stringValue ? o.id : o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {errors?.map((e) => (
        <span key={e} className="text-xs text-alert">
          {e}
        </span>
      ))}
    </label>
  );
}
