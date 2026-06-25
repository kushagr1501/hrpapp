import { z } from "zod";

export const userParamsSchema = z.object({
  id: z.string().uuid()
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  ward: z.string().optional()
});

export const updatePasswordSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits")
});
