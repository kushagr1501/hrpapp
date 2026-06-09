import { PatientStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { PatientListFilters } from "./patient.types.js";
import { buildAncVisitWindows } from "../../utils/visit-windows.js";
import { calculateEddFromLmp } from "../../utils/edd.js";
import type { AuthUser } from "../../types/auth.js";

function buildPatientWhereClause(filters: PatientListFilters, nurseId?: string): Prisma.PatientWhereInput {
  return {
    assignedNurse: nurseId ?? undefined,
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
    return prisma.patient.findMany({
      where: buildPatientWhereClause(filters, nurseId),
      include: {
        facility: true,
        assignedNurseUser: true,
        visits: {
          where: {
            isCompleted: false
          },
          orderBy: {
            windowStart: "asc"
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
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
    });
  },

  async getById(id: string, actor?: AuthUser) {
    return prisma.patient.findFirst({
      where: buildScopedPatientWhere(id, actor),
      include: {
        facility: true,
        assignedNurseUser: true,
        visits: {
          orderBy: {
            createdAt: "asc"
          },
          take: 10
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
      select: { id: true }
    });

    if (!existingPatient) {
      return null;
    }

    return prisma.patient.update({
      where: { id: existingPatient.id },
      data,
      include: {
        facility: true,
        assignedNurseUser: true
      }
    });
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
