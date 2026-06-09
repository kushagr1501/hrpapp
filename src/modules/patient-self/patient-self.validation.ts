import { z } from "zod";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must use YYYY-MM-DD format");

export const kickCountSchema = z.object({
  date: dateOnlySchema.optional(),
  count: z.coerce.number().int().min(0).max(500),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  startedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional()
});

export const kickCountQuerySchema = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional()
});
