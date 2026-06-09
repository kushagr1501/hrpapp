import { VisitType } from "@prisma/client";
import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date format");
const isoDateTimeSchema = z.string().datetime().or(isoDateSchema);
const optionalVisitDateSchema = isoDateTimeSchema.optional();
const queryBooleanSchema = z.preprocess((value) => {
  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false || value === undefined) {
    return false;
  }

  return value;
}, z.boolean());

export const patientVisitParamsSchema = z.object({
  id: z.string().uuid()
});

export const visitParamsSchema = z.object({
  id: z.string().uuid()
});

export const upcomingVisitsQuerySchema = z.object({
  days: z.coerce.number().int().min(0).max(60).default(7),
  includeOverdue: queryBooleanSchema.default(false)
});

const visitWindowRefinement = (
  value: {
    windowStart?: string;
    windowEnd?: string;
    scheduledDate?: string;
  },
  ctx: z.RefinementCtx
) => {
    if (value.windowStart && value.windowEnd && new Date(value.windowStart) > new Date(value.windowEnd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["windowEnd"],
        message: "windowEnd must be on or after windowStart"
      });
    }

    if (
      value.scheduledDate &&
      value.windowStart &&
      new Date(value.scheduledDate) < new Date(value.windowStart)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledDate"],
        message: "scheduledDate must be on or after windowStart"
      });
    }

    if (value.scheduledDate && value.windowEnd && new Date(value.scheduledDate) > new Date(value.windowEnd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledDate"],
        message: "scheduledDate must be on or before windowEnd"
      });
    }
  };

const visitPayloadSchema = z.object({
  visitType: z.nativeEnum(VisitType),
  visitNumber: z.number().int().min(1).max(50).optional(),
  windowStart: optionalVisitDateSchema,
  windowEnd: optionalVisitDateSchema,
  scheduledDate: optionalVisitDateSchema,
  actualDate: optionalVisitDateSchema,
  wasAccompanied: z.boolean().optional(),
  conductedBy: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  isCompleted: z.boolean().optional()
});

export const createVisitSchema = visitPayloadSchema.superRefine(visitWindowRefinement);

export const updateVisitSchema = visitPayloadSchema.partial().superRefine(visitWindowRefinement);
