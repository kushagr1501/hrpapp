import { ReferralStatus } from "@prisma/client";
import { z } from "zod";

export const patientReferralParamsSchema = z.object({
  id: z.string().uuid()
});

export const referralParamsSchema = z.object({
  id: z.string().uuid()
});

export const createReferralSchema = z.object({
  visitId: z.string().uuid().optional(),
  referredFrom: z.string().uuid().optional(),
  referredTo: z.string().uuid().optional(),
  reason: z.string().min(1),
  clinicalFindings: z.string().optional(),
  treatmentGiven: z.string().optional(),
  status: z.nativeEnum(ReferralStatus).optional(),
  outcome: z.string().optional()
});

export const updateReferralSchema = createReferralSchema.partial().extend({
  completedAt: z.string().datetime().optional()
});
