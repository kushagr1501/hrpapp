import { z } from "zod";

import { UserRole } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});

export const loginPinSchema = z.object({
  phone: z.string().min(10, "Valid phone number required"),
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits")
});

export const generateRecoverySchema = z.object({
  userId: z.string().uuid("Valid user ID required")
});

export const resetPinSchema = z.object({
  phone: z.string().min(10, "Valid phone number required"),
  securityKey: z.string().min(8, "Valid security key required"),
  newPin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits")
});

export const registerStaffSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
  role: z.nativeEnum(UserRole),
  facilityId: z.string().optional()
});

export const registerPatientSchema = z.object({
  email: z.string().email().optional(),
  // Patient PINs: 4-6 numeric digits only
  password: z.string().regex(/^\d{4,6}$/, "Patient PIN must be 4-6 digits").optional(),
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
