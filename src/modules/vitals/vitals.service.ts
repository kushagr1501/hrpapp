import { AlertStatus, PatientStatus, Prisma, RiskSeverity, VisitType, type Comorbidity, type ObstetricHistory } from "@prisma/client";
import createHttpError from "http-errors";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";
import { buildHrpFollowupVisitWindows } from "../../utils/visit-windows.js";
import { notificationService } from "../notification/notification.service.js";
import { riskEngineService } from "../risk-engine/risk-engine.service.js";

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

function canAccessVisit(actor: AuthUser | undefined, visit: { patient: { assignedNurse: string | null } }) {
  if (!actor) {
    return false;
  }

  if (actor.role !== "nurse") {
    return true;
  }

  return visit.patient.assignedNurse === actor.id;
}

export const vitalsService = {
  async listPatientVitals(patientId: string, actor?: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        ...(actor?.role === "nurse" ? { assignedNurse: actor.id } : {})
      },
      select: { id: true }
    });

    if (!patient) {
      return null;
    }

    return prisma.vitals.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" }
    });
  },

  async recordVisitVitals(
    visitId: string,
    payload: {
      bpSystolic: number;
      bpDiastolic: number;
      weightKg: number;
      hemoglobin: number;
      bloodSugar?: number;
      urineProtein?: string;
      fundalHeight?: number;
      fetalHeartRate?: number;
      fetalPresentation?: string;
      fetalMovement?: string;
      isMultipleGestation: boolean;
      numberOfFetuses?: number;
      usgDone: boolean;
      usgFindings?: string;
      iugrSuspected: boolean;
      abdominalExamDone: boolean;
      abdominalExamNotes?: string;
    },
    actor?: AuthUser
  ) {
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: {
          include: {
            obstetricHistory: true,
            comorbidities: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!visit || !canAccessVisit(actor, visit)) {
      throw createHttpError(404, "Visit not found");
    }

    const activeRules = await prisma.riskRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }]
    });

    const result = await prisma.$transaction(async (tx) => {
      const recordedAt = new Date();

      const vitals = await tx.vitals.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          recordedBy: actor?.id,
          recordedAt,
          bpSystolic: payload.bpSystolic,
          bpDiastolic: payload.bpDiastolic,
          weightKg: new Prisma.Decimal(payload.weightKg),
          hemoglobin: new Prisma.Decimal(payload.hemoglobin),
          bloodSugar: payload.bloodSugar !== undefined ? new Prisma.Decimal(payload.bloodSugar) : undefined,
          urineProtein: payload.urineProtein,
          fundalHeight: payload.fundalHeight !== undefined ? new Prisma.Decimal(payload.fundalHeight) : undefined,
          fetalHeartRate: payload.fetalHeartRate,
          fetalPresentation: payload.fetalPresentation,
          fetalMovement: payload.fetalMovement,
          isMultipleGestation: payload.isMultipleGestation,
          numberOfFetuses: payload.isMultipleGestation ? payload.numberOfFetuses ?? 2 : 1,
          usgDone: payload.usgDone,
          usgFindings: payload.usgFindings,
          iugrSuspected: payload.iugrSuspected,
          abdominalExamDone: payload.abdominalExamDone,
          abdominalExamNotes: payload.abdominalExamNotes
        }
      });

      const assessment = riskEngineService.evaluateRules(activeRules, {
        vitals,
        obstetricHistory: visit.patient.obstetricHistory as Pick<
          ObstetricHistory,
          "pregnancyNumber" | "year" | "outcome" | "deliveryMode" | "complications" | "birthWeight" | "babyStatus"
        >[],
        comorbidities: visit.patient.comorbidities as Pick<
          Comorbidity,
          "condition" | "diagnosedDate" | "isActive" | "notes"
        >[]
      });

      const riskAssessment = await tx.riskAssessment.create({
        data: {
          patientId: visit.patientId,
          visitId: visit.id,
          assessedBy: actor?.id,
          overallSeverity: assessment.overallSeverity,
          isHrp: assessment.isHrp,
          triggeredRules: assessment.triggeredRules
        }
      });

      const wasPreviouslyHrp = visit.patient.isHrp;
      const hrpFlaggedAt = assessment.isHrp
        ? visit.patient.hrpFlaggedAt ?? recordedAt
        : null;

      const updatedPatient = await tx.patient.update({
        where: { id: visit.patientId },
        data: {
          status: derivePatientStatus(visit.patient.status, assessment.isHrp),
          riskSeverity: assessment.overallSeverity,
          isHrp: assessment.isHrp,
          hrpFlaggedAt
        },
        include: {
          facility: true,
          assignedNurseUser: true
        }
      });

      if (!visit.isCompleted) {
        await tx.visit.update({
          where: { id: visit.id },
          data: {
            isCompleted: true,
            actualDate: recordedAt,
            completedAt: recordedAt,
            conductedBy: actor?.id ?? visit.conductedBy ?? undefined
          }
        });
      }

      let followUpVisitsCreated = 0;
      let hrpAlertId: string | undefined;

      if (!wasPreviouslyHrp && assessment.isHrp) {
        const existingFollowups = await tx.visit.findMany({
          where: {
            patientId: visit.patientId,
            visitType: VisitType.followup
          },
          select: { scheduledDate: true }
        });

        const existingDates = new Set(
          existingFollowups
            .map((item) => item.scheduledDate?.toISOString())
            .filter((value): value is string => Boolean(value))
        );

        const followUpWindows = buildHrpFollowupVisitWindows(recordedAt).filter(
          (followUpVisit) => !existingDates.has(followUpVisit.scheduledDate.toISOString())
        );

        if (followUpWindows.length > 0) {
          followUpVisitsCreated = followUpWindows.length;
          await tx.visit.createMany({
            data: followUpWindows.map((followUpVisit) => ({
              patientId: visit.patientId,
              visitType: followUpVisit.visitType,
              visitNumber: followUpVisit.visitNumber,
              windowStart: followUpVisit.windowStart,
              windowEnd: followUpVisit.windowEnd,
              scheduledDate: followUpVisit.scheduledDate,
              facilityId: visit.facilityId ?? updatedPatient.facilityId ?? undefined
            }))
          });
        }

        if (updatedPatient.assignedNurse) {
          const alert = await tx.alert.create({
            data: {
              patientId: visit.patientId,
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
        vitals,
        riskAssessment,
        patient: updatedPatient,
        followUpVisitsCreated,
        hrpAlertId
      };
    }, {
      timeout: 15000,
      maxWait: 5000
    });

    if (result.hrpAlertId) {
      await notificationService.notifyAlert(result.hrpAlertId);
    }

    return {
      vitals: result.vitals,
      riskAssessment: result.riskAssessment,
      patient: result.patient,
      followUpVisitsCreated: result.followUpVisitsCreated
    };
  }
};
