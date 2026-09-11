import { z } from "zod";

export const createFacilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["uphc", "esi", "fru", "cemoc", "district_hospital"]),
  ward: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  contactPhone: z.string().optional(),
});

export const updateFacilitySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["uphc", "esi", "fru", "cemoc", "district_hospital"]).optional(),
  ward: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  contactPhone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  role: z.enum(["nurse", "admin", "superadmin"]).optional(),
  facilityId: z.string().uuid().optional().nullable(),
});

export const facilityParamsSchema = z.object({
  id: z.string().uuid("Invalid facility ID"),
});

export const promoteToAdminSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  facilityId: z.string().uuid("Invalid facility ID"),
});

export const userParamsSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});
