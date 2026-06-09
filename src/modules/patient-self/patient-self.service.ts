import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";

const patientInclude = {
  facility: true,
  assignedNurseUser: true,
  visits: {
    orderBy: [{ windowStart: "asc" }, { createdAt: "asc" }]
  },
  vitals: {
    orderBy: {
      recordedAt: "desc"
    }
  },
  riskAssessments: {
    orderBy: {
      assessedAt: "desc"
    }
  },
  birthPlan: {
    include: {
      plannedFacilityRef: true
    }
  }
} satisfies Prisma.PatientInclude;

function startOfDateOnly(dateText: string) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function startOfTodayUtc() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

function patientIdentityWhere(actor: AuthUser): Prisma.PatientWhereInput {
  return {
    OR: [
      { userId: actor.id },
      ...(actor.authId ? [{ authId: actor.authId }] : []),
      { phone: actor.phone }
    ]
  };
}

export const patientSelfService = {
  async resolvePatient(actor: AuthUser) {
    return prisma.patient.findFirst({
      where: patientIdentityWhere(actor),
      include: patientInclude
    });
  },

  async getVisits(actor: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: patientIdentityWhere(actor),
      select: { id: true }
    });

    if (!patient) {
      return null;
    }

    return prisma.visit.findMany({
      where: { patientId: patient.id },
      include: {
        facility: true,
        vitals: {
          orderBy: {
            recordedAt: "desc"
          }
        }
      },
      orderBy: [{ windowStart: "asc" }, { createdAt: "asc" }]
    });
  },

  async getVitals(actor: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: patientIdentityWhere(actor),
      select: { id: true }
    });

    if (!patient) {
      return null;
    }

    return prisma.vitals.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "desc" }
    });
  },

  async getBirthPlan(actor: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: patientIdentityWhere(actor),
      select: { id: true }
    });

    if (!patient) {
      return null;
    }

    return prisma.birthPlan.findUnique({
      where: { patientId: patient.id },
      include: {
        plannedFacilityRef: true
      }
    });
  },

  async listKickCounts(actor: AuthUser, input: { from?: string; to?: string }) {
    const patient = await prisma.patient.findFirst({
      where: patientIdentityWhere(actor),
      select: { id: true }
    });

    if (!patient) {
      return null;
    }

    return prisma.kickCount.findMany({
      where: {
        patientId: patient.id,
        date: {
          gte: input.from ? startOfDateOnly(input.from) : undefined,
          lte: input.to ? startOfDateOnly(input.to) : undefined
        }
      },
      orderBy: { date: "desc" }
    });
  },

  async upsertKickCount(
    actor: AuthUser,
    input: {
      date?: string;
      count: number;
      durationMinutes?: number;
      startedAt?: string;
      notes?: string;
    }
  ) {
    const patient = await prisma.patient.findFirst({
      where: patientIdentityWhere(actor),
      select: { id: true }
    });

    if (!patient) {
      return null;
    }

    const date = input.date ? startOfDateOnly(input.date) : startOfTodayUtc();

    return prisma.kickCount.upsert({
      where: {
        patientId_date: {
          patientId: patient.id,
          date
        }
      },
      create: {
        patientId: patient.id,
        date,
        count: input.count,
        durationMinutes: input.durationMinutes,
        startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
        notes: input.notes
      },
      update: {
        count: input.count,
        durationMinutes: input.durationMinutes,
        startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
        notes: input.notes
      }
    });
  }
};
