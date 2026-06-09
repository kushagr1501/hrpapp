import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { comorbiditiesController } from "./comorbidities.controller.js";
import {
  comorbidityParamsSchema,
  createComorbiditySchema,
  patientComorbidityParamsSchema,
  updateComorbiditySchema
} from "./comorbidities.validation.js";

export const comorbiditiesRouter = Router();

comorbiditiesRouter.use(requireAuth);
comorbiditiesRouter.use(requireRole(["nurse", "doctor", "admin", "superadmin"]));

comorbiditiesRouter.get(
  "/patients/:id/comorbidities",
  validate(patientComorbidityParamsSchema, "params"),
  comorbiditiesController.listForPatient
);
comorbiditiesRouter.post(
  "/patients/:id/comorbidities",
  validate(patientComorbidityParamsSchema, "params"),
  validate(createComorbiditySchema),
  comorbiditiesController.createForPatient
);
comorbiditiesRouter.patch(
  "/comorbidities/:id",
  validate(comorbidityParamsSchema, "params"),
  validate(updateComorbiditySchema),
  comorbiditiesController.update
);
comorbiditiesRouter.delete(
  "/comorbidities/:id",
  validate(comorbidityParamsSchema, "params"),
  comorbiditiesController.delete
);
