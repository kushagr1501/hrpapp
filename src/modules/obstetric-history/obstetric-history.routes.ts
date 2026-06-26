import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { obstetricHistoryController } from "./obstetric-history.controller.js";
import {
  createObstetricHistorySchema,
  obstetricHistoryParamsSchema,
  patientObstetricHistoryParamsSchema,
  updateObstetricHistorySchema
} from "./obstetric-history.validation.js";

export const obstetricHistoryRouter = Router();

obstetricHistoryRouter.use(requireAuth);
obstetricHistoryRouter.use(requireRole(["nurse", "admin", "superadmin"]));

obstetricHistoryRouter.get(
  "/patients/:id/obstetric-history",
  validate(patientObstetricHistoryParamsSchema, "params"),
  obstetricHistoryController.listForPatient
);
obstetricHistoryRouter.post(
  "/patients/:id/obstetric-history",
  validate(patientObstetricHistoryParamsSchema, "params"),
  validate(createObstetricHistorySchema),
  obstetricHistoryController.createForPatient
);
obstetricHistoryRouter.patch(
  "/obstetric-history/:id",
  validate(obstetricHistoryParamsSchema, "params"),
  validate(updateObstetricHistorySchema),
  obstetricHistoryController.update
);
obstetricHistoryRouter.delete(
  "/obstetric-history/:id",
  validate(obstetricHistoryParamsSchema, "params"),
  obstetricHistoryController.delete
);
