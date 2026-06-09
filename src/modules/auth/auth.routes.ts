import { Router } from "express";
import { authController } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { loginSchema, pushTokenSchema, refreshSchema, registerStaffSchema, registerPatientSchema } from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/register/staff", validate(registerStaffSchema), authController.registerStaff);
authRouter.post("/register/patient", validate(registerPatientSchema), authController.registerPatient);
authRouter.post("/refresh", validate(refreshSchema), authController.refresh);
authRouter.get("/me", requireAuth, authController.me);
authRouter.patch("/push-token", requireAuth, validate(pushTokenSchema), authController.registerPushToken);
