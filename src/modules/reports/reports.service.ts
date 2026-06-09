import { PatientStatus, ReferralStatus, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function patientWhere(actor?: AuthUser, facilityId?: string) {
  return {
    assignedNurse: actor?.role === UserRole.nurse ? actor.id : undefined,
    facilityId: facilityId ?? (actor?.role === UserRole.doctor ? actor.facilityId ?? undefined : undefined)
  };
}

function visitWhere(actor?: AuthUser, facilityId?: string) {
  return {
    patient: patientWhere(actor, facilityId)
  };
}

function referralWhere(actor?: AuthUser, facilityId?: string) {
  return {
    patient: patientWhere(actor, facilityId)
  };
}

export const reportsService = {
  async getSummary(input: { facilityId?: string }, actor?: AuthUser) {
    const today = startOfToday();
    const scopedPatientWhere = patientWhere(actor, input.facilityId);
    const scopedVisitWhere = visitWhere(actor, input.facilityId);
    const scopedReferralWhere = referralWhere(actor, input.facilityId);

    const [
      totalPatients,
      hrpPatients,
      deliveredPatients,
      overdueVisits,
      pendingReferrals,
      inTransitReferrals,
      completedReferrals,
      cancelledReferrals,
      nurses,
      facilities
    ] = await Promise.all([
      prisma.patient.count({ where: scopedPatientWhere }),
      prisma.patient.count({ where: { ...scopedPatientWhere, isHrp: true } }),
      prisma.patient.count({ where: { ...scopedPatientWhere, status: PatientStatus.delivered } }),
      prisma.visit.count({
        where: {
          ...scopedVisitWhere,
          isCompleted: false,
          windowEnd: { lt: today }
        }
      }),
      prisma.referral.count({ where: { ...scopedReferralWhere, status: ReferralStatus.pending } }),
      prisma.referral.count({ where: { ...scopedReferralWhere, status: ReferralStatus.in_transit } }),
      prisma.referral.count({ where: { ...scopedReferralWhere, status: ReferralStatus.completed } }),
      prisma.referral.count({ where: { ...scopedReferralWhere, status: ReferralStatus.cancelled } }),
      prisma.user.findMany({
        where: {
          role: UserRole.nurse,
          id: actor?.role === UserRole.nurse ? actor.id : undefined,
          facilityId: input.facilityId
        },
        select: {
          id: true,
          fullName: true,
          facilityId: true,
          _count: {
            select: {
              assignedPatients: true,
              alerts: true
            }
          }
        },
        orderBy: { fullName: "asc" }
      }),
      prisma.facility.findMany({
        where: {
          id: input.facilityId
        },
        select: {
          id: true,
          name: true,
          type: true,
          _count: {
            select: {
              patients: true,
              visits: true
            }
          }
        },
        orderBy: { name: "asc" }
      })
    ]);

    const facilityWise = await Promise.all(
      facilities.map(async (facility) => ({
        facilityId: facility.id,
        name: facility.name,
        type: facility.type,
        patients: facility._count.patients,
        visits: facility._count.visits,
        hrpPatients: await prisma.patient.count({
          where: {
            facilityId: facility.id,
            isHrp: true
          }
        }),
        overdueVisits: await prisma.visit.count({
          where: {
            facilityId: facility.id,
            isCompleted: false,
            windowEnd: { lt: today }
          }
        })
      }))
    );

    return {
      totals: {
        totalPatients,
        hrpPatients,
        deliveredPatients,
        overdueVisits
      },
      referrals: {
        pending: pendingReferrals,
        inTransit: inTransitReferrals,
        completed: completedReferrals,
        cancelled: cancelledReferrals
      },
      nurseWorkload: nurses.map((nurse) => ({
        nurseId: nurse.id,
        fullName: nurse.fullName,
        facilityId: nurse.facilityId,
        assignedPatients: nurse._count.assignedPatients,
        activeAlerts: nurse._count.alerts
      })),
      facilityWise
    };
  },

  async getDashboardData(input: { facilityId?: string }, actor?: AuthUser) {
    const scopedPatientWhere = patientWhere(actor, input.facilityId);
    const scopedReferralWhere = referralWhere(actor, input.facilityId);

    const [summary, hrpPatients, pendingReferrals] = await Promise.all([
      this.getSummary(input, actor),
      prisma.patient.findMany({
        where: { ...scopedPatientWhere, isHrp: true },
        orderBy: { updatedAt: "desc" },
        take: 50 // Limit to avoid massive payloads
      }),
      prisma.referral.findMany({
        where: { ...scopedReferralWhere, status: ReferralStatus.pending },
        include: {
          patient: {
            select: {
              fullName: true,
              phone: true,
              riskSeverity: true
            }
          },
          fromFacility: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ]);

    return {
      summary,
      hrpPatients,
      pendingReferrals
    };
  }
};
