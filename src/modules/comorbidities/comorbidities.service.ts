import { AlertStatus, PatientStatus, Prisma, RiskSeverity, UserRole, VisitType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";
import { buildHrpFollowupVisitWindows } from "../../utils/visit-windows.js";
import { notificationService } from "../notification/notification.service.js";
import { riskEngineService } from "../risk-engine/risk-engine.service.js";
import type { AssessmentContext } from "../risk-engine/risk-engine.types.js";

type ComorbidityInput = {
  condition?: string;
  diagnosedDate?: string;
  isActive?: boolean;
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

function comorbidityScope(actor?: AuthUser): Prisma.ComorbidityWhereInput {
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

function mapInputToData(input: ComorbidityInput): Prisma.ComorbidityUpdateInput {
  return {
    condition: input.condition,
    diagnosedDate: parseDate(input.diagnosedDate),
    isActive: input.isActive,
    notes: input.notes
  };
}

function derivePatientStatus(currentStatus: PatientStatus, isHrp: boolean) {
  if (
    currentStatus === PatientStatus.delivered ||
    currentStatus === PatientStatus.post_delivery ||
    currentStatus === PatientStatus.closed
  ) {
    return currentStatus;
  }

  return isHrp ? PatientStatus.high_risk : PatientStatus.normal;
}

function getAlertPriority(severity: RiskSeverity) {
  switch (severity) {
    case RiskSeverity.critical:
      return "critical";
    case RiskSeverity.high:
      return "high";
    case RiskSeverity.moderate:
      return "normal";
    case RiskSeverity.none:
    default:
      return "low";
  }
}

async function reassessPatientRisk(tx: Prisma.TransactionClient, patientId: string, actor?: AuthUser) {
  const patient = await tx.patient.findUnique({
    where: { id: patientId },
    include: {
      obstetricHistory: true,
      comorbidities: {
        where: { isActive: true }
      }
    }
  });

  if (!patient) {
    return null;
  }

  const latestVitals = await tx.vitals.findFirst({
    where: { patientId },
    orderBy: { recordedAt: "desc" }
  });

  const activeRules = await tx.riskRule.findMany({
    where: { isActive: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }]
  });

  const assessment = riskEngineService.evaluateRules(activeRules, {
    vitals: (latestVitals ?? {}) as AssessmentContext["vitals"],
    obstetricHistory: patient.obstetricHistory,
    comorbidities: patient.comorbidities
  });

  const assessedAt = new Date();
  const wasPreviouslyHrp = patient.isHrp;
  const hrpFlaggedAt = assessment.isHrp ? patient.hrpFlaggedAt ?? assessedAt : null;
  let hrpAlertId: string | undefined;

  await tx.riskAssessment.create({
    data: {
      patientId,
      visitId: latestVitals?.visitId,
      assessedBy: actor?.id,
      assessedAt,
      overallSeverity: assessment.overallSeverity,
      isHrp: assessment.isHrp,
      triggeredRules: assessment.triggeredRules
    }
  });

  const updatedPatient = await tx.patient.update({
    where: { id: patientId },
    data: {
      status: derivePatientStatus(patient.status, assessment.isHrp),
      riskSeverity: assessment.overallSeverity,
      isHrp: assessment.isHrp,
      hrpFlaggedAt
    }
  });

  if (!wasPreviouslyHrp && assessment.isHrp) {
    const existingFollowups = await tx.visit.findMany({
      where: {
        patientId,
        visitType: VisitType.followup
      },
      select: { scheduledDate: true }
    });

    const existingDates = new Set(
      existingFollowups
        .map((item) => item.scheduledDate?.toISOString())
        .filter((value): value is string => Boolean(value))
    );

    const followUpWindows = buildHrpFollowupVisitWindows(assessedAt).filter(
      (followUpVisit) => !existingDates.has(followUpVisit.scheduledDate.toISOString())
    );

    if (followUpWindows.length > 0) {
      await tx.visit.createMany({
        data: followUpWindows.map((followUpVisit) => ({
          patientId,
          visitType: followUpVisit.visitType,
          visitNumber: followUpVisit.visitNumber,
          windowStart: followUpVisit.windowStart,
          windowEnd: followUpVisit.windowEnd,
          scheduledDate: followUpVisit.scheduledDate,
          facilityId: updatedPatient.facilityId ?? undefined
        }))
      });
    }

    if (updatedPatient.assignedNurse) {
      const alert = await tx.alert.create({
        data: {
          patientId,
          assignedTo: updatedPatient.assignedNurse,
          alertType: "new_hrp",
          title: `${updatedPatient.fullName} flagged as high-risk pregnancy`,
          message: `Risk severity: ${assessment.overallSeverity}. ${assessment.triggeredRules
            .map((rule) => rule.ruleName)
            .join(", ")}`,
          priority: getAlertPriority(assessment.overallSeverity),
          status: AlertStatus.active
        }
      });
      hrpAlertId = alert.id;
    }
  }

  return { patient: updatedPatient, assessment, hrpAlertId };
}

export const comorbiditiesService = {
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

    return prisma.comorbidity.findMany({
      where: { patientId: patient.id },
      orderBy: [{ isActive: "desc" }, { condition: "asc" }]
    });
  },

  async createForPatient(patientId: string, input: Required<Pick<ComorbidityInput, "condition">> & ComorbidityInput, actor?: AuthUser) {
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

    const result = await prisma.$transaction(async (tx) => {
      const comorbidity = await tx.comorbidity.create({
        data: {
          patientId: patient.id,
          condition: input.condition,
          diagnosedDate: parseDate(input.diagnosedDate),
          isActive: input.isActive ?? true,
          notes: input.notes
        }
      });

      const reassessment = await reassessPatientRisk(tx, patient.id, actor);

      return { comorbidity, hrpAlertId: reassessment?.hrpAlertId };
    });

    if (result.hrpAlertId) {
      await notificationService.notifyAlert(result.hrpAlertId);
    }

    return result.comorbidity;
  },

  async update(id: string, input: ComorbidityInput, actor?: AuthUser) {
    const existingComorbidity = await prisma.comorbidity.findFirst({
      where: {
        id,
        ...comorbidityScope(actor)
      },
      select: { id: true, patientId: true }
    });

    if (!existingComorbidity) {
      return null;
    }

    const result = await prisma.$transaction(async (tx) => {
      const comorbidity = await tx.comorbidity.update({
        where: { id: existingComorbidity.id },
        data: mapInputToData(input)
      });

      const reassessment = await reassessPatientRisk(tx, comorbidity.patientId, actor);

      return { comorbidity, hrpAlertId: reassessment?.hrpAlertId };
    });

    if (result.hrpAlertId) {
      await notificationService.notifyAlert(result.hrpAlertId);
    }

    return result.comorbidity;
  },

  async delete(id: string, actor?: AuthUser) {
    const existingComorbidity = await prisma.comorbidity.findFirst({
      where: {
        id,
        ...comorbidityScope(actor)
      },
      select: { id: true, patientId: true }
    });

    if (!existingComorbidity) {
      return null;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.comorbidity.delete({
        where: { id: existingComorbidity.id }
      });

      const reassessment = await reassessPatientRisk(tx, existingComorbidity.patientId, actor);

      return { hrpAlertId: reassessment?.hrpAlertId };
    });

    if (result.hrpAlertId) {
      await notificationService.notifyAlert(result.hrpAlertId);
    }

    return existingComorbidity;
  }
};
