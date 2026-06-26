import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { patientController } from "./patient.controller.js";
import {
  createPatientSchema,
  patientListQuerySchema,
  patientParamsSchema,
  updatePatientSchema
} from "./patient.validation.js";

export const patientRouter = Router();

patientRouter.use(requireAuth);
patientRouter.use(requireRole(["nurse", "admin", "superadmin"]));

patientRouter.get("/", validate(patientListQuerySchema, "query"), patientController.list);
patientRouter.post("/", validate(createPatientSchema), patientController.create);
patientRouter.get("/:id", validate(patientParamsSchema, "params"), patientController.getById);
patientRouter.patch("/:id", validate(patientParamsSchema, "params"), validate(updatePatientSchema), patientController.update);
