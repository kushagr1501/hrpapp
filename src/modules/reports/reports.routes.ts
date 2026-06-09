import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { reportsController } from "./reports.controller.js";
import { reportSummaryQuerySchema } from "./reports.validation.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.use(requireRole(["nurse", "doctor", "admin", "superadmin"]));

reportsRouter.get("/reports/summary", validate(reportSummaryQuerySchema, "query"), reportsController.summary);
reportsRouter.get("/reports/dashboard", validate(reportSummaryQuerySchema, "query"), reportsController.dashboard);
