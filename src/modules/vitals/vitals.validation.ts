import { z } from "zod";

const urineProteinSchema = z.enum(["nil", "trace", "+1", "+2", "+3", "+4"]);
const fetalPresentationSchema = z.enum(["cephalic", "breech", "transverse"]).optional();
const fetalMovementSchema = z.enum(["normal", "reduced", "absent"]).optional();

export const visitParamsSchema = z.object({
  id: z.string().uuid()
});

export const patientParamsSchema = z.object({
  id: z.string().uuid()
});

export const createVitalsSchema = z
  .object({
    bpSystolic: z.number().int().min(50).max(250),
    bpDiastolic: z.number().int().min(30).max(180),
    weightKg: z.number().min(20).max(250),
    hemoglobin: z.number().min(2).max(25),
    bloodSugar: z.number().min(20).max(600).optional(),
    urineProtein: urineProteinSchema.optional(),
    fundalHeight: z.number().min(0).max(60).optional(),
    fetalHeartRate: z.number().int().min(50).max(250).optional(),
    fetalPresentation: fetalPresentationSchema,
    fetalMovement: fetalMovementSchema,
    isMultipleGestation: z.boolean().default(false),
    numberOfFetuses: z.number().int().min(1).max(8).optional(),
    usgDone: z.boolean().default(false),
    usgFindings: z.string().max(1000).optional(),
    iugrSuspected: z.boolean().default(false),
    abdominalExamDone: z.boolean().default(false),
    abdominalExamNotes: z.string().max(1000).optional()
  })
  .superRefine((value, ctx) => {
    if (value.isMultipleGestation && (value.numberOfFetuses ?? 1) < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numberOfFetuses"],
        message: "Multiple gestation requires at least 2 fetuses"
      });
    }

    if (!value.isMultipleGestation && value.numberOfFetuses && value.numberOfFetuses !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numberOfFetuses"],
        message: "Number of fetuses must be 1 when multiple gestation is false"
      });
    }
  });
