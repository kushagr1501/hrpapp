import { Router } from "express";
import { authController } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { loginSchema, loginPinSchema, generateRecoverySchema, resetPinSchema, pushTokenSchema, refreshSchema, registerStaffSchema, registerPatientSchema } from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/login/pin", validate(loginPinSchema), authController.loginPin);
authRouter.post("/recovery/generate", requireAuth, requireRole(["admin", "superadmin"]), validate(generateRecoverySchema), authController.generateRecovery);
authRouter.post("/recovery/reset", validate(resetPinSchema), authController.resetPin);

// Registration is made public to allow the Web Dashboard's public form to work
authRouter.post(
  "/register/staff",
  validate(registerStaffSchema),
  authController.registerStaff
);
authRouter.post(
  "/register/patient",
  requireAuth,
  requireRole(["admin", "superadmin"]),
  validate(registerPatientSchema),
  authController.registerPatient
);

authRouter.post("/refresh", validate(refreshSchema), authController.refresh);
authRouter.get("/me", requireAuth, authController.me);
authRouter.patch("/push-token", requireAuth, validate(pushTokenSchema), authController.registerPushToken);
