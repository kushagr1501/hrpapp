import { z } from "zod";

const currentYear = new Date().getFullYear();

export const patientObstetricHistoryParamsSchema = z.object({
  id: z.string().uuid()
});

export const obstetricHistoryParamsSchema = z.object({
  id: z.string().uuid()
});

export const createObstetricHistorySchema = z.object({
  pregnancyNumber: z.number().int().min(1).max(20).optional(),
  year: z.number().int().min(1950).max(currentYear).optional(),
  outcome: z
    .enum(["live_birth", "stillbirth", "abortion", "ectopic", "neonatal_death", "infant_death"])
    .optional(),
  deliveryMode: z.enum(["normal", "c_section", "assisted", "forceps", "vacuum"]).optional(),
  complications: z
    .enum(["none", "obstructed_labor", "pph", "eclampsia", "pre_eclampsia", "sepsis", "other"])
    .optional(),
  birthWeight: z.number().min(0.3).max(7).optional(),
  babyStatus: z.enum(["alive", "stillbirth", "neonatal_death", "infant_death", "unknown"]).optional()
});

export const updateObstetricHistorySchema = createObstetricHistorySchema.partial();
