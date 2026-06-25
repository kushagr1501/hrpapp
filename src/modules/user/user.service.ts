import { prisma } from "../../config/prisma.js";
import { supabaseAdmin } from "../../config/supabase.js";
import createHttpError from "http-errors";

export const userService = {
  async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        facility: true,
        _count: {
          select: {
            assignedPatients: true,
            alerts: { where: { status: 'active' } }
          }
        }
      }
    });

    if (!user) throw createHttpError(404, "User not found");
    return user;
  },

  async updateUser(id: string, data: { fullName?: string; phone?: string; email?: string; ward?: string }) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw createHttpError(404, "User not found");

    if (data.email && data.email !== user.email && user.authId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.authId, { email: data.email });
      if (error) throw createHttpError(400, "Failed to update email in auth provider: " + error.message);
    }

    return prisma.user.update({
      where: { id },
      data,
      include: {
        facility: true
      }
    });
  },

  async updatePassword(id: string, pin: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw createHttpError(404, "User not found");

    const bcrypt = await import("bcryptjs");
    const pinHash = await bcrypt.hash(pin, 10);

    return prisma.user.update({
      where: { id },
      data: { pinHash }
    });
  },

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, include: { assignedPatients: true } });
    if (!user) throw createHttpError(404, "User not found");

    if (user.assignedPatients.length > 0) {
      throw createHttpError(400, "Cannot delete user with assigned patients. Reassign them first.");
    }

    if (user.authId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.authId);
      if (error) {
        console.error("Failed to delete user from Supabase:", error);
        // Continue anyway to delete from Prisma
      }
    }

    await prisma.user.delete({ where: { id } });
    return { success: true };
  }
};
