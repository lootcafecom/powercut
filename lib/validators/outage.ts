import { z } from "zod";
import {
  outageTypeValues,
  verificationStatusValues,
  sourceTypeValues,
} from "@/lib/db/schema";

export const outageInputSchema = z
  .object({
    stateId: z.coerce.number().int().positive(),
    districtId: z.coerce.number().int().positive().optional().nullable(),
    providerId: z.coerce.number().int().positive(),
    cityId: z.coerce.number().int().positive(),
    localityId: z.coerce.number().int().positive().optional().nullable(),

    title: z.string().min(3, "Title is too short").max(200),
    description: z.string().max(2000).optional().nullable(),
    outageType: z.enum(outageTypeValues),
    reason: z.string().max(300).optional().nullable(),

    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    actualStartTime: z.string().optional().nullable(),
    actualEndTime: z.string().optional().nullable(),

    sourceType: z.enum(sourceTypeValues),
    sourceUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal(""))
      .nullable(),
    sourceDocument: z.string().optional().nullable(),

    confidenceScore: z.coerce.number().int().min(0).max(100),
    verificationStatus: z.enum(verificationStatusValues),
  })
  .refine(
    (data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    { message: "End time must be after start time", path: ["endTime"] }
  );

export type OutageInput = z.infer<typeof outageInputSchema>;
