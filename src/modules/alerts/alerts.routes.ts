import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { alertsController } from "./alerts.controller.js";
import { alertListQuerySchema, alertParamsSchema } from "./alerts.validation.js";

export const alertsRouter = Router();

alertsRouter.use(requireAuth);
alertsRouter.use(requireRole(["nurse", "doctor", "admin", "superadmin"]));

alertsRouter.get("/alerts", validate(alertListQuerySchema, "query"), alertsController.list);
alertsRouter.patch("/alerts/:id/acknowledge", validate(alertParamsSchema, "params"), alertsController.acknowledge);
alertsRouter.patch("/alerts/:id/resolve", validate(alertParamsSchema, "params"), alertsController.resolve);
