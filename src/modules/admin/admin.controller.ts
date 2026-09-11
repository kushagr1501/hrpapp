import type { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service.js";

export const adminController = {
  // ─── Facilities ───────────────────────────────────────────────

  async listFacilities(req: Request, res: Response, next: NextFunction) {
    try {
      const facilities = await adminService.listFacilities();
      res.json(facilities);
    } catch (err) {
      next(err);
    }
  },

  async getFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const facility = await adminService.getFacility(req.params.id as string);
      res.json(facility);
    } catch (err) {
      next(err);
    }
  },

  async createFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const facility = await adminService.createFacility(req.body, req.user!.id);
      res.status(201).json(facility);
    } catch (err) {
      next(err);
    }
  },

  async updateFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const facility = await adminService.updateFacility(req.params.id as string, req.body);
      res.json(facility);
    } catch (err) {
      next(err);
    }
  },

  async deleteFacility(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deleteFacility(req.params.id as string);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  // ─── User / Admin Management ──────────────────────────────────

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.query.role as string | undefined;
      const users = await adminService.listAllUsers(role);
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await adminService.updateUser(req.params.id as string, req.body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async promoteToAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, facilityId } = req.body;
      const user = await adminService.promoteToAdmin(userId, facilityId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async demoteToNurse(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await adminService.demoteToNurse(req.params.id as string);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await adminService.deactivateUser(req.params.id as string);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async reactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await adminService.reactivateUser(req.params.id as string);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
};
