import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { visitController } from "./visit.controller.js";
import {
  createVisitSchema,
  patientVisitParamsSchema,
  upcomingVisitsQuerySchema,
  updateVisitSchema,
  visitParamsSchema
} from "./visit.validation.js";

export const visitRouter = Router();

visitRouter.use(requireAuth);
visitRouter.use(requireRole(["nurse", "admin", "superadmin"]));

visitRouter.get("/visits/overdue", visitController.listOverdue);
visitRouter.get("/visits/upcoming", validate(upcomingVisitsQuerySchema, "query"), visitController.listUpcoming);
visitRouter.get("/patients/:id/visits", validate(patientVisitParamsSchema, "params"), visitController.listForPatient);
visitRouter.post(
  "/patients/:id/visits",
  validate(patientVisitParamsSchema, "params"),
  validate(createVisitSchema),
  visitController.createForPatient
);
visitRouter.patch("/visits/:id", validate(visitParamsSchema, "params"), validate(updateVisitSchema), visitController.update);
