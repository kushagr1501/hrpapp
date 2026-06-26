import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { vitalsController } from "./vitals.controller.js";
import { createVitalsSchema, patientParamsSchema, visitParamsSchema } from "./vitals.validation.js";

export const vitalsRouter = Router();

vitalsRouter.use(requireAuth);
vitalsRouter.use(requireRole(["nurse", "admin", "superadmin"]));

vitalsRouter.post("/visits/:id/vitals", validate(visitParamsSchema, "params"), validate(createVitalsSchema), vitalsController.record);
vitalsRouter.get("/patients/:id/vitals", validate(patientParamsSchema, "params"), vitalsController.listByPatient);
