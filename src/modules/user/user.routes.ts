import { Router } from "express";
import { userController } from "./user.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { userParamsSchema, updateUserSchema, updatePasswordSchema } from "./user.validation.js";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get(
  "/:id",
  requireRole(["nurse", "admin", "superadmin"]),
  validate(userParamsSchema, "params"),
  userController.get
);

userRouter.patch(
  "/:id",
  requireRole(["admin", "superadmin"]),
  validate(userParamsSchema, "params"),
  validate(updateUserSchema),
  userController.update
);

userRouter.patch(
  "/:id/password",
  requireRole(["admin", "superadmin"]),
  validate(userParamsSchema, "params"),
  validate(updatePasswordSchema),
  userController.updatePassword
);

userRouter.delete(
  "/:id",
  requireRole(["admin", "superadmin"]),
  validate(userParamsSchema, "params"),
  userController.delete
);
