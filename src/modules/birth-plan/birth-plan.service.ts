import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";

type BirthPlanInput = {
  plannedFacility?: string;
  plannedDeliveryMode?: string;
  transportArranged?: boolean;
  transportType?: string;
  bloodDonorArranged?: boolean;
  companionName?: string;
  companionPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  jsyEnrolled?: boolean;
  jsskEnrolled?: boolean;
  notes?: string;
};

function patientScope(actor?: AuthUser): Prisma.PatientWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return {};
  }

  return {
    assignedNurse: actor.id
  };
}

function mapInputToData(input: BirthPlanInput): Prisma.BirthPlanUpdateInput {
  return {
    plannedFacilityRef: input.plannedFacility ? { connect: { id: input.plannedFacility } } : undefined,
    plannedDeliveryMode: input.plannedDeliveryMode,
    transportArranged: input.transportArranged,
    transportType: input.transportType,
    bloodDonorArranged: input.bloodDonorArranged,
    companionName: input.companionName,
    companionPhone: input.companionPhone,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    jsyEnrolled: input.jsyEnrolled,
    jsskEnrolled: input.jsskEnrolled,
    notes: input.notes
  };
}

const birthPlanInclude = {
  plannedFacilityRef: true
} satisfies Prisma.BirthPlanInclude;

export const birthPlanService = {
  async getForPatient(patientId: string, actor?: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        ...patientScope(actor)
      },
      select: { id: true }
    });

    if (!patient) {
      return undefined;
    }

    return prisma.birthPlan.findUnique({
      where: { patientId: patient.id },
      include: birthPlanInclude
    });
  },

  async upsertForPatient(patientId: string, input: BirthPlanInput, actor?: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        ...patientScope(actor)
      },
      select: { id: true }
    });

    if (!patient) {
      return undefined;
    }

    const data = mapInputToData(input);

    return prisma.birthPlan.upsert({
      where: { patientId: patient.id },
      create: {
        patient: { connect: { id: patient.id } },
        plannedFacilityRef: input.plannedFacility ? { connect: { id: input.plannedFacility } } : undefined,
        plannedDeliveryMode: input.plannedDeliveryMode,
        transportArranged: input.transportArranged ?? false,
        transportType: input.transportType,
        bloodDonorArranged: input.bloodDonorArranged ?? false,
        companionName: input.companionName,
        companionPhone: input.companionPhone,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        jsyEnrolled: input.jsyEnrolled ?? false,
        jsskEnrolled: input.jsskEnrolled ?? false,
        notes: input.notes
      },
      update: data,
      include: birthPlanInclude
    });
  }
};
