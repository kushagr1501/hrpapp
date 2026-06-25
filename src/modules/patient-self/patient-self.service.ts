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
      { id: actor.id },
      ...(actor.authId ? [{ authId: actor.authId }] : []),
      // Only fall back to phone when it is a real phone number (not empty string).
      // An empty string would match every patient registered without a phone.
      ...(actor.phone ? [{ phone: actor.phone }] : [])
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

};
