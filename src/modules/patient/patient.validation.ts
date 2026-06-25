import { PatientStatus } from "@prisma/client";
import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date format");

export const patientListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(PatientStatus).optional(),
  ward: z.string().optional(),
  facilityId: z.string().uuid().optional(),
  isHrp: z.coerce.boolean().optional(),
  assignedNurse: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional()
});

export const patientParamsSchema = z.object({
  id: z.string().uuid()
});

export const createPatientSchema = z.object({
  fullName: z.string().min(1),
  age: z.number().int().min(12).max(55).optional(),
  phone: z.string().min(10).max(15).optional(),
  husbandName: z.string().optional(),
  address: z.string().optional(),
  ward: z.string().optional(),
  slumName: z.string().optional(),
  lmp: isoDateSchema.optional(),
  gravida: z.number().int().min(1).optional(),
  para: z.number().int().min(0).optional(),
  assignedNurse: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  mcpCardNumber: z.string().optional()
});

export const updatePatientSchema = createPatientSchema.partial();
