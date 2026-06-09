import { z } from "zod";

export const patientBirthPlanParamsSchema = z.object({
  id: z.string().uuid()
});

export const upsertBirthPlanSchema = z.object({
  plannedFacility: z.string().uuid().optional(),
  plannedDeliveryMode: z.string().optional(),
  transportArranged: z.boolean().optional(),
  transportType: z.string().optional(),
  bloodDonorArranged: z.boolean().optional(),
  companionName: z.string().optional(),
  companionPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  jsyEnrolled: z.boolean().optional(),
  jsskEnrolled: z.boolean().optional(),
  notes: z.string().optional()
});
