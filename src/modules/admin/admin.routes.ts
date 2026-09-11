import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { adminController } from "./admin.controller.js";
import {
  createFacilitySchema,
  updateFacilitySchema,
  facilityParamsSchema,
  promoteToAdminSchema,
  userParamsSchema,
  updateUserSchema,
} from "./admin.validation.js";

export const adminRouter = Router();

// All admin-module routes require authentication + superadmin role
adminRouter.use(requireAuth);
adminRouter.use(requireRole(["superadmin"]));

// ─── Facility / Registry Management ──────────────────────────────────────────

// List all facilities (with their admins, nurse count, patient count)
adminRouter.get("/facilities", adminController.listFacilities);

// Get a single facility's full detail
adminRouter.get(
  "/facilities/:id",
  validate(facilityParamsSchema, "params"),
  adminController.getFacility
);

// Create a new facility (superadmin provisions a new registry)
adminRouter.post(
  "/facilities",
  validate(createFacilitySchema),
  adminController.createFacility
);

// Update facility details
adminRouter.patch(
  "/facilities/:id",
  validate(facilityParamsSchema, "params"),
  validate(updateFacilitySchema),
  adminController.updateFacility
);

// Hard-delete a facility
adminRouter.delete(
  "/facilities/:id",
  validate(facilityParamsSchema, "params"),
  adminController.deleteFacility
);

// ─── User / Admin Management ──────────────────────────────────────────────────

// List all users across all facilities (optional ?role=admin|nurse filter)
adminRouter.get("/users", adminController.listUsers);

// Update user details
adminRouter.patch(
  "/users/:id",
  validate(userParamsSchema, "params"),
  validate(updateUserSchema),
  adminController.updateUser
);

// Promote a user to admin of a specific facility
adminRouter.post(
  "/users/promote",
  validate(promoteToAdminSchema),
  adminController.promoteToAdmin
);

// Demote an admin back to nurse
adminRouter.patch(
  "/users/:id/demote",
  validate(userParamsSchema, "params"),
  adminController.demoteToNurse
);

// Deactivate any non-superadmin user
adminRouter.patch(
  "/users/:id/deactivate",
  validate(userParamsSchema, "params"),
  adminController.deactivateUser
);

// Reactivate a previously deactivated user
adminRouter.patch(
  "/users/:id/reactivate",
  validate(userParamsSchema, "params"),
  adminController.reactivateUser
);
