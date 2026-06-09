import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date format");

export const patientComorbidityParamsSchema = z.object({
  id: z.string().uuid()
});

export const comorbidityParamsSchema = z.object({
  id: z.string().uuid()
});

export const createComorbiditySchema = z.object({
  condition: z.string().min(1),
  diagnosedDate: isoDateSchema.optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional()
});

export const updateComorbiditySchema = createComorbiditySchema.partial();
