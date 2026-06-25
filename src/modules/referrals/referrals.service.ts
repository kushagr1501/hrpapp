import { Prisma, ReferralStatus, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";
import { notificationService } from "../notification/notification.service.js";

type ReferralInput = {
  visitId?: string;
  referredFrom?: string;
  referredTo?: string;
  reason?: string;
  clinicalFindings?: string;
  treatmentGiven?: string;
  status?: ReferralStatus;
  outcome?: string;
  completedAt?: string;
};

function patientScope(actor?: AuthUser): Prisma.PatientWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return {};
  }

  return {
    assignedNurse: actor.id
  };
}

function referralScope(actor?: AuthUser): Prisma.ReferralWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return {};
  }

  return {
    patient: {
      assignedNurse: actor.id
    }
  };
}

function parseDate(value?: string) {
  return value ? new Date(value) : undefined;
}

function mapInputToData(input: ReferralInput): Prisma.ReferralUpdateInput {
  return {
    visit: input.visitId ? { connect: { id: input.visitId } } : undefined,
    fromFacility: input.referredFrom ? { connect: { id: input.referredFrom } } : undefined,
    toFacility: input.referredTo ? { connect: { id: input.referredTo } } : undefined,
    reason: input.reason,
    clinicalFindings: input.clinicalFindings,
    treatmentGiven: input.treatmentGiven,
    status: input.status,
    outcome: input.outcome,
    completedAt: parseDate(input.completedAt)
  };
}

const referralInclude = {
  patient: true,
  visit: true,
  fromFacility: true,
  toFacility: true,
  referredByUser: true
} satisfies Prisma.ReferralInclude;

export const referralsService = {
  async listAll(filters: any, actor?: AuthUser) {
    return prisma.referral.findMany({
      where: referralScope(actor),
      include: referralInclude,
      orderBy: { createdAt: "desc" }
    });
  },
  async listForPatient(patientId: string, actor?: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        ...patientScope(actor)
      },
      select: { id: true }
    });

    if (!patient) {
      return null;
    }

    return prisma.referral.findMany({
      where: { patientId: patient.id },
      include: referralInclude,
      orderBy: { createdAt: "desc" }
    });
  },

  async createForPatient(patientId: string, input: Required<Pick<ReferralInput, "reason">> & ReferralInput, actor?: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        ...patientScope(actor)
      },
      select: {
        id: true,
        facilityId: true,
        fullName: true,
        assignedNurse: true
      }
    });

    if (!patient) {
      return null;
    }

    const referral = await prisma.referral.create({
      data: {
        patient: { connect: { id: patient.id } },
        visit: input.visitId ? { connect: { id: input.visitId } } : undefined,
        fromFacility: input.referredFrom
          ? { connect: { id: input.referredFrom } }
          : patient.facilityId
            ? { connect: { id: patient.facilityId } }
            : undefined,
        toFacility: input.referredTo ? { connect: { id: input.referredTo } } : undefined,
        referredByUser: actor?.id ? { connect: { id: actor.id } } : undefined,
        reason: input.reason,
        clinicalFindings: input.clinicalFindings,
        treatmentGiven: input.treatmentGiven,
        status: input.status ?? ReferralStatus.pending,
        outcome: input.outcome
      },
      include: referralInclude
    });

    // Only notify the assigned nurse if the referral was created by someone else
    if (patient.assignedNurse && actor?.id !== patient.assignedNurse) {
      await notificationService.sendPushToUser(patient.assignedNurse, {
        title: `Referral created for ${patient.fullName}`,
        body: referral.reason,
        template: "referral.created",
        patientId: patient.id,
        data: {
          referralId: referral.id,
          patientId: patient.id,
          route: `/patients/${patient.id}`
        }
      });
    }

    return referral;
  },

  async update(id: string, input: ReferralInput, actor?: AuthUser) {
    const existingReferral = await prisma.referral.findFirst({
      where: {
        id,
        ...referralScope(actor)
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            assignedNurse: true
          }
        }
      }
    });

    if (!existingReferral) {
      return null;
    }

    const referral = await prisma.referral.update({
      where: { id: existingReferral.id },
      data: {
        ...mapInputToData(input),
        completedAt:
          input.completedAt !== undefined
            ? parseDate(input.completedAt)
            : input.status === ReferralStatus.completed
              ? new Date()
              : undefined
      },
      include: referralInclude
    });

    if (input.status && existingReferral.patient.assignedNurse) {
      await notificationService.sendPushToUser(existingReferral.patient.assignedNurse, {
        title: `Referral ${input.status.replace("_", " ")}: ${existingReferral.patient.fullName}`,
        body: referral.reason,
        template: "referral.status_changed",
        patientId: existingReferral.patient.id,
        data: {
          referralId: referral.id,
          status: input.status,
          patientId: existingReferral.patient.id,
          route: `/patients/${existingReferral.patient.id}`
        }
      });
    }

    return referral;
  }
};
