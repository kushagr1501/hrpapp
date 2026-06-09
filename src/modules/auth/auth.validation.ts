import { z } from "zod";

import { UserRole } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  facilityId: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(10)
});

export const registerPatientSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  fullName: z.string().min(1),
  phone: z.string().min(10).optional(),
  facilityId: z.string().optional(),
  assignedNurse: z.string().uuid().optional(),
  status: z.enum(["registered", "screened", "normal", "high_risk", "delivered", "post_delivery", "closed"]).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const pushTokenSchema = z.object({
  expoPushToken: z.string().min(1)
});
