import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { userService } from "./user.service.js";

export const userController = {
  async get(request: Request, response: Response) {
    const id = request.params.id as string;
    const user = await userService.getUser(id);
    response.json({ success: true, data: user });
  },

  async update(request: Request, response: Response) {
    const id = request.params.id as string;
    if (request.user!.role !== "admin" && request.user!.role !== "superadmin" && request.user!.id !== id) {
      throw createHttpError(403, "You do not have permission to edit this profile");
    }
    const user = await userService.updateUser(id, request.body);
    response.json({ success: true, message: "User updated", data: user });
  },

  async updatePassword(request: Request, response: Response) {
    const id = request.params.id as string;
    await userService.updatePassword(id, request.body.pin);
    response.json({ success: true, message: "PIN updated successfully" });
  },

  async delete(request: Request, response: Response) {
    const id = request.params.id as string;
    await userService.deleteUser(id);
    response.json({ success: true, message: "User deleted successfully" });
  }
};
