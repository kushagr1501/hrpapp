import { PatientStatus, Prisma, UserRole } from "@prisma/client";
import createHttpError from "http-errors";
import { prisma } from "../../config/prisma.js";
import type { PatientListFilters } from "./patient.types.js";
import { notificationService } from "../notifications/notification.service.js";
import { buildAncVisitWindows } from "../../utils/visit-windows.js";
import { calculateEddFromLmp } from "../../utils/edd.js";
import type { AuthUser } from "../../types/auth.js";

function buildPatientWhereClause(filters: PatientListFilters, nurseId?: string): Prisma.PatientWhereInput {
  return {
    assignedNurse: nurseId ?? filters.assignedNurse ?? undefined,
    status: filters.status as PatientStatus | undefined,
    ward: filters.ward,
    facilityId: filters.facilityId,
    isHrp: filters.isHrp,
    OR: filters.search
      ? [
          { fullName: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search, mode: "insensitive" } },
          { mcpCardNumber: { contains: filters.search, mode: "insensitive" } }
        ]
      : undefined
  };
}

function buildScopedPatientWhere(id: string, actor?: AuthUser): Prisma.PatientWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return { id };
  }

  return {
    id,
    assignedNurse: actor.id
  };
}

export const patientService = {
  async list(filters: PatientListFilters, nurseId?: string) {
    const limit = filters.limit ?? 50;
    const items = await prisma.patient.findMany({
      take: limit + 1,
      cursor: filters.cursor ? { id: filters.cursor } : undefined,
      where: buildPatientWhereClause(filters, nurseId),
      include: {
        facility: true,
        assignedNurseUser: true,
        // Fetch ALL pending visits — needed for accurate dashboard stats
        // (overdue count, today's visits, upcoming visits list)
        visits: {
          where: {
            isCompleted: false
          },
          orderBy: {
            windowStart: "asc"
          }
        }
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ]
    });

    let nextCursor: string | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    return {
      patients: items,
      nextCursor
    };
  },

  async createWithInitialVisits(input: {
    patient: Prisma.PatientCreateInput;
    lmp?: Date;
    conductedBy?: string;
    facilityId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const edd = input.lmp ? calculateEddFromLmp(input.lmp) : undefined;

      const patient = await tx.patient.create({
        data: {
          ...input.patient,
          edd
        },
        include: {
          facility: true,
          assignedNurseUser: true
        }
      });

      if (input.lmp) {
        const visitWindows = buildAncVisitWindows(input.lmp);

        await tx.visit.createMany({
          data: visitWindows.map((visit) => ({
            patientId: patient.id,
            visitType: visit.visitType,
            visitNumber: visit.visitNumber,
            windowStart: visit.windowStart,
            windowEnd: visit.windowEnd,
            scheduledDate: visit.scheduledDate,
            facilityId: input.facilityId,
            conductedBy: visit.visitType === "registration" ? input.conductedBy : undefined,
            actualDate: visit.visitType === "registration" ? visit.scheduledDate : undefined,
            completedAt: visit.visitType === "registration" ? visit.scheduledDate : undefined,
            isCompleted: visit.visitType === "registration",
            notes: visit.visitType === "registration" ? "Patient registered and first ANC logged." : undefined
          }))
        });
      }

      return tx.patient.findUniqueOrThrow({
        where: { id: patient.id },
        include: {
          facility: true,
          assignedNurseUser: true,
          visits: {
            orderBy: {
              windowStart: "asc"
            }
          }
        }
      });
    }, {
      timeout: 15000,
      maxWait: 5000
    });
  },

  async getById(id: string, actor?: AuthUser) {
    return prisma.patient.findFirst({
      where: buildScopedPatientWhere(id, actor),
      include: {
        facility: true,
        assignedNurseUser: true,
        // No hard limit — HRP patients can have many visits (ANC + followups)
        visits: {
          orderBy: {
            createdAt: "asc"
          }
        },
        vitals: {
          orderBy: {
            recordedAt: "desc"
          },
          take: 5
        },
        riskAssessments: {
          orderBy: {
            assessedAt: "desc"
          },
          take: 5
        },
        obstetricHistory: {
          take: 5
        },
        comorbidities: {
          where: {
            isActive: true
          },
          take: 5
        },
        birthPlan: true,
        referrals: {
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        },
        alerts: {
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        }
      }
    });
  },

  async update(id: string, data: Prisma.PatientUpdateInput, actor?: AuthUser) {
    const existingPatient = await prisma.patient.findFirst({
      where: buildScopedPatientWhere(id, actor),
      select: { id: true, facilityId: true, isHrp: true, status: true }
    });

    if (!existingPatient) {
      return null;
    }

    // Validate that the target nurse exists, is active, and has the nurse role.
    // This prevents assigning patients to admins or nurses from other facilities.
    let targetNurseId: string | undefined = undefined;
    
    if (typeof (data as any).assignedNurse === "string") {
      targetNurseId = (data as any).assignedNurse;
    } else if (data.assignedNurseUser && typeof data.assignedNurseUser === "object" && "connect" in data.assignedNurseUser) {
      targetNurseId = (data.assignedNurseUser as { connect: { id: string } }).connect.id;
    }

    if (targetNurseId) {
      const targetNurse = await prisma.user.findFirst({
        where: {
          id: targetNurseId,
          role: UserRole.nurse,
          isActive: true,
          ...(existingPatient.facilityId ? { facilityId: existingPatient.facilityId } : {})
        },
        select: { id: true }
      });

      if (!targetNurse) {
        throw createHttpError(400, "The specified nurse is not an active nurse in this facility.");
      }
    }

    const updated = await prisma.patient.update({
      where: { id: existingPatient.id },
      data,
      include: {
        facility: true,
        assignedNurseUser: true
      }
    });

    // Fire notifications if HRP or Delivery status changes
    if (data.isHrp === true && !existingPatient.isHrp) {
      if (updated.userId && updated.assignedNurse) {
        notificationService.notifyHighRiskFlag(updated.userId, updated.assignedNurse, updated.fullName).catch(console.error);
      }
    }

    if (data.status === 'delivered' && existingPatient.status !== 'delivered') {
      if (updated.assignedNurse) {
        notificationService.notifyDeliveryLogged(updated.assignedNurse, updated.fullName, updated.id).catch(console.error);
      }
    }

    return updated;
  },

  async getVitals(id: string, actor?: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: buildScopedPatientWhere(id, actor),
      select: { id: true }
    });

    if (!patient) {
      return null;
    }

    return prisma.vitals.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "desc" }
    });
  }
};
