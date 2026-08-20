import { z } from "zod";

export const userReportInputSchema = z.object({
  localityId: z.coerce.number().int().positive(),
  description: z.string().max(300).optional(),
});

export type UserReportInput = z.infer<typeof userReportInputSchema>;
