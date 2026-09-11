import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole, requireFacilityScope } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { birthPlanController } from "./birth-plan.controller.js";
import { patientBirthPlanParamsSchema, upsertBirthPlanSchema } from "./birth-plan.validation.js";

export const birthPlanRouter = Router();

birthPlanRouter.use(requireAuth);
birthPlanRouter.use(requireRole(["nurse", "admin", "superadmin"]));
birthPlanRouter.use(requireFacilityScope);

birthPlanRouter.get(
  "/patients/:id/birth-plan",
  validate(patientBirthPlanParamsSchema, "params"),
  birthPlanController.getForPatient
);
birthPlanRouter.put(
  "/patients/:id/birth-plan",
  validate(patientBirthPlanParamsSchema, "params"),
  validate(upsertBirthPlanSchema),
  birthPlanController.upsertForPatient
);
