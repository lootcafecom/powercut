"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { outageInputSchema } from "@/lib/validators/outage";

export interface ActionState {
  errors?: Record<string, string[]>;
  message?: string;
}

function coerceFormValue(v: FormDataEntryValue | null) {
  if (v === null) return undefined;
  const s = String(v);
  return s === "" ? undefined : s;
}

function toIsoOrUndefined(v: FormDataEntryValue | null) {
  const s = coerceFormValue(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

function parseFormData(formData: FormData) {
  return {
    stateId: coerceFormValue(formData.get("stateId")),
    districtId: coerceFormValue(formData.get("districtId")) ?? null,
    providerId: coerceFormValue(formData.get("providerId")),
    cityId: coerceFormValue(formData.get("cityId")),
    localityId: coerceFormValue(formData.get("localityId")) ?? null,
    title: coerceFormValue(formData.get("title")) ?? "",
    description: coerceFormValue(formData.get("description")) ?? null,
    outageType: coerceFormValue(formData.get("outageType")) ?? "scheduled",
    reason: coerceFormValue(formData.get("reason")) ?? null,
    scheduledDate: coerceFormValue(formData.get("scheduledDate")) ?? "",
    startTime: toIsoOrUndefined(formData.get("startTime")) ?? "",
    endTime: toIsoOrUndefined(formData.get("endTime")) ?? "",
    actualStartTime: toIsoOrUndefined(formData.get("actualStartTime")) ?? null,
    actualEndTime: toIsoOrUndefined(formData.get("actualEndTime")) ?? null,
    sourceType: coerceFormValue(formData.get("sourceType")) ?? "manual",
    sourceUrl: coerceFormValue(formData.get("sourceUrl")) ?? null,
    sourceDocument: coerceFormValue(formData.get("sourceDocument")) ?? null,
    confidenceScore: coerceFormValue(formData.get("confidenceScore")) ?? "50",
    verificationStatus: coerceFormValue(formData.get("verificationStatus")) ?? "draft",
  };
}

export async function createOutage(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = outageInputSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const now = new Date().toISOString();
  const data = parsed.data;
  const isPublished = data.verificationStatus === "published";

  await db.insert(schema.powerOutages).values({
    ...data,
    description: data.description ?? undefined,
    reason: data.reason ?? undefined,
    districtId: data.districtId ?? undefined,
    localityId: data.localityId ?? undefined,
    actualStartTime: data.actualStartTime ?? undefined,
    actualEndTime: data.actualEndTime ?? undefined,
    sourceUrl: data.sourceUrl || undefined,
    sourceDocument: data.sourceDocument ?? undefined,
    firstSeenAt: now,
    publishedAt: isPublished ? now : undefined,
    lastVerifiedAt: now,
  });

  revalidatePath("/admin/outages");
  revalidatePath("/power-cut/karnataka/bengaluru");
  redirect("/admin/outages");
}

export async function updateOutage(
  id: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = outageInputSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const now = new Date().toISOString();
  const data = parsed.data;
  const isPublished = data.verificationStatus === "published";

  await db
    .update(schema.powerOutages)
    .set({
      ...data,
      description: data.description ?? undefined,
      reason: data.reason ?? undefined,
      districtId: data.districtId ?? undefined,
      localityId: data.localityId ?? undefined,
      actualStartTime: data.actualStartTime ?? undefined,
      actualEndTime: data.actualEndTime ?? undefined,
      sourceUrl: data.sourceUrl || undefined,
      sourceDocument: data.sourceDocument ?? undefined,
      publishedAt: isPublished ? now : undefined,
      lastVerifiedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.powerOutages.id, id));

  revalidatePath("/admin/outages");
  revalidatePath("/power-cut/karnataka/bengaluru");
  redirect("/admin/outages");
}

export async function deleteOutage(id: number) {
  await db.delete(schema.powerOutages).where(eq(schema.powerOutages.id, id));
  revalidatePath("/admin/outages");
  revalidatePath("/power-cut/karnataka/bengaluru");
}

export async function markVerifiedNow(id: number) {
  await db
    .update(schema.powerOutages)
    .set({ lastVerifiedAt: new Date().toISOString() })
    .where(eq(schema.powerOutages.id, id));
  revalidatePath("/admin/outages");
  revalidatePath("/power-cut/karnataka/bengaluru");
}
