import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { referralsController } from "./referrals.controller.js";
import {
  createReferralSchema,
  patientReferralParamsSchema,
  referralParamsSchema,
  updateReferralSchema
} from "./referrals.validation.js";

export const referralsRouter = Router();

referralsRouter.use(requireAuth);
referralsRouter.use(requireRole(["nurse", "admin", "superadmin"]));

referralsRouter.get(
  "/patients/:id/referrals",
  validate(patientReferralParamsSchema, "params"),
  referralsController.listForPatient
);
referralsRouter.post(
  "/patients/:id/referrals",
  validate(patientReferralParamsSchema, "params"),
  validate(createReferralSchema),
  referralsController.createForPatient
);
referralsRouter.get(
  "/referrals",
  referralsController.listAll
);
referralsRouter.patch(
  "/referrals/:id",
  validate(referralParamsSchema, "params"),
  validate(updateReferralSchema),
  referralsController.update
);
