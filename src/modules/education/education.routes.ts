import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { educationController } from "./education.controller.js";

export const educationRouter = Router();

educationRouter.use(requireAuth);

educationRouter.get("/active", educationController.listActive);
educationRouter.get("/", educationController.listAll);

// Only doctors and admins can create/edit/delete educational content
educationRouter.post("/", requireRole(["doctor", "admin", "superadmin"]), educationController.create);
educationRouter.put("/:id", requireRole(["doctor", "admin", "superadmin"]), educationController.update);
educationRouter.delete("/:id", requireRole(["doctor", "admin", "superadmin"]), educationController.remove);

// Any clinical staff can assign content and view patient assignments
educationRouter.post("/assign", requireRole(["nurse", "doctor", "admin", "superadmin"]), educationController.assign);
educationRouter.get("/patient/:patientId", requireRole(["nurse", "doctor", "admin", "superadmin"]), educationController.listAssigned);
