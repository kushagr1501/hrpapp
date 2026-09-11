import { prisma } from "../../config/prisma.js";
import { FacilityType } from "@prisma/client";
import createHttpError from "http-errors";

export const adminService = {
  // ─── Facilities ────────────────────────────────────────────────

  async listFacilities() {
    return prisma.facility.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: { in: ["admin", "nurse"] }, isActive: true },
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            patients: true,
            visits: true,
          },
        },
      },
    });
  },

  async getFacility(id: string) {
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            patients: true,
            visits: true,
          },
        },
      },
    });
    if (!facility) throw createHttpError(404, "Facility not found");
    return facility;
  },

  async createFacility(
    data: {
      name: string;
      type: FacilityType;
      ward?: string;
      address?: string;
      lat?: number;
      lng?: number;
      contactPhone?: string;
    },
    createdBy: string
  ) {
    return prisma.facility.create({
      data: {
        ...data,
        createdBy,
      },
    });
  },

  async updateFacility(
    id: string,
    data: {
      name?: string;
      type?: FacilityType;
      ward?: string;
      address?: string;
      lat?: number;
      lng?: number;
      contactPhone?: string;
      isActive?: boolean;
    }
  ) {
    const facility = await prisma.facility.findUnique({ where: { id } });
    if (!facility) throw createHttpError(404, "Facility not found");
    return prisma.facility.update({ where: { id }, data });
  },

  async deleteFacility(id: string) {
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: { _count: { select: { users: true, patients: true, visits: true } } }
    });
    if (!facility) throw createHttpError(404, "Facility not found");
    
    if (facility._count.users > 0 || facility._count.patients > 0 || facility._count.visits > 0) {
      throw createHttpError(400, "Cannot delete a facility that has assigned users, patients, or visits. Please reassign or delete them first.");
    }
    
    return prisma.facility.delete({ where: { id } });
  },

  // ─── User / Admin Management ───────────────────────────────────

  async listAllUsers(role?: string) {
    return prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        facility: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: {
            assignedPatients: true,
          },
        },
      },
    });
  },

  async updateUser(userId: string, data: { fullName?: string; phone?: string; role?: "nurse" | "admin" | "superadmin"; facilityId?: string | null }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found");

    if (data.role && data.role !== "superadmin" && !data.facilityId) {
      throw createHttpError(400, "Facility is required for this role");
    }

    if (data.role === "superadmin") {
      data.facilityId = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      include: { facility: true },
    });

    // If the facility has changed, reset assigned patients and alerts
    if (data.facilityId !== undefined && data.facilityId !== user.facilityId) {
      // Unassign all patients
      await prisma.patient.updateMany({
        where: { assignedNurse: userId },
        data: { assignedNurse: null }
      });

      // Expire any active alerts assigned to this user
      await prisma.alert.updateMany({
        where: { assignedTo: userId, status: "active" },
        data: { status: "expired", resolvedAt: new Date() }
      });
    }

    return updatedUser;
  },

  async promoteToAdmin(userId: string, facilityId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found");
    if (!user.isActive) throw createHttpError(400, "Cannot promote a deactivated user");
    if (user.role === "superadmin") throw createHttpError(400, "Cannot change superadmin role");
    if (user.role === "patient") throw createHttpError(400, "Cannot promote a patient to admin");

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw createHttpError(404, "Facility not found");
    if (!facility.isActive) throw createHttpError(400, "Cannot assign admin to an inactive facility");

    return prisma.user.update({
      where: { id: userId },
      data: { role: "admin", facilityId },
      include: { facility: true },
    });
  },

  async demoteToNurse(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found");
    if (user.role !== "admin") throw createHttpError(400, "User is not an admin");

    return prisma.user.update({
      where: { id: userId },
      data: { role: "nurse" },
      include: { facility: true },
    });
  },

  async deactivateUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found");
    if (user.role === "superadmin") throw createHttpError(400, "Cannot deactivate a superadmin");

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  },

  async reactivateUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found");

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  },
};
