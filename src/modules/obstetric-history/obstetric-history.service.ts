import { AlertStatus, PatientStatus, Prisma, RiskSeverity, UserRole, VisitType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";
import { buildHrpFollowupVisitWindows } from "../../utils/visit-windows.js";
import { notificationService } from "../notification/notification.service.js";
import { riskEngineService } from "../risk-engine/risk-engine.service.js";
import type { AssessmentContext } from "../risk-engine/risk-engine.types.js";

type ObstetricHistoryInput = {
  pregnancyNumber?: number;
  year?: number;
  outcome?: string;
  deliveryMode?: string;
  complications?: string;
  birthWeight?: number;
  babyStatus?: string;
};

function patientScope(actor?: AuthUser): Prisma.PatientWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return {};
  }

  return {
    assignedNurse: actor.id
  };
}

function historyScope(actor?: AuthUser): Prisma.ObstetricHistoryWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return {};
  }

  return {
    patient: {
      assignedNurse: actor.id
    }
  };
}

function mapInputToData(input: ObstetricHistoryInput) {
  return {
    pregnancyNumber: input.pregnancyNumber,
    year: input.year,
    outcome: input.outcome,
    deliveryMode: input.deliveryMode,
    complications: input.complications,
    birthWeight: input.birthWeight !== undefined ? new Prisma.Decimal(input.birthWeight) : undefined,
    babyStatus: input.babyStatus
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

async function reassessPatientRisk(
  tx: Prisma.TransactionClient,
  patientId: string,
  actor?: AuthUser
) {
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

  return {
    patient: updatedPatient,
    assessment,
    hrpAlertId
  };
}

export const obstetricHistoryService = {
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

    return prisma.obstetricHistory.findMany({
      where: { patientId: patient.id },
      orderBy: [{ pregnancyNumber: "asc" }, { year: "asc" }]
    });
  },

  async createForPatient(patientId: string, input: ObstetricHistoryInput, actor?: AuthUser) {
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
      const history = await tx.obstetricHistory.create({
        data: {
          patientId: patient.id,
          ...mapInputToData(input)
        }
      });

      const reassessment = await reassessPatientRisk(tx, patient.id, actor);

      return { history, hrpAlertId: reassessment?.hrpAlertId };
    });

    if (result.hrpAlertId) {
      await notificationService.notifyAlert(result.hrpAlertId);
    }

    return result.history;
  },

  async update(id: string, input: ObstetricHistoryInput, actor?: AuthUser) {
    const existingHistory = await prisma.obstetricHistory.findFirst({
      where: {
        id,
        ...historyScope(actor)
      },
      select: { id: true, patientId: true }
    });

    if (!existingHistory) {
      return null;
    }

    const result = await prisma.$transaction(async (tx) => {
      const history = await tx.obstetricHistory.update({
        where: { id: existingHistory.id },
        data: mapInputToData(input)
      });

      const reassessment = await reassessPatientRisk(tx, history.patientId, actor);

      return { history, hrpAlertId: reassessment?.hrpAlertId };
    });

    if (result.hrpAlertId) {
      await notificationService.notifyAlert(result.hrpAlertId);
    }

    return result.history;
  },

  async delete(id: string, actor?: AuthUser) {
    const existingHistory = await prisma.obstetricHistory.findFirst({
      where: {
        id,
        ...historyScope(actor)
      },
      select: { id: true, patientId: true }
    });

    if (!existingHistory) {
      return null;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.obstetricHistory.delete({
        where: { id: existingHistory.id }
      });

      const reassessment = await reassessPatientRisk(tx, existingHistory.patientId, actor);

      return { hrpAlertId: reassessment?.hrpAlertId };
    });

    if (result.hrpAlertId) {
      await notificationService.notifyAlert(result.hrpAlertId);
    }

    return existingHistory;
  }
};
