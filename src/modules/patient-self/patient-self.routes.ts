import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { patientSelfController } from "./patient-self.controller.js";

export const patientSelfRouter = Router();

patientSelfRouter.use(requireAuth);
patientSelfRouter.use(requireRole(["patient"]));

patientSelfRouter.get("/me", patientSelfController.me);
patientSelfRouter.get("/me/visits", patientSelfController.visits);
patientSelfRouter.get("/me/vitals", patientSelfController.vitals);
patientSelfRouter.get("/me/birth-plan", patientSelfController.birthPlan);
