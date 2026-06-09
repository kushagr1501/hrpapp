import { AlertStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";
import { notificationService } from "../notification/notification.service.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function normalizeToDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function daysBetween(left: Date, right: Date) {
  return Math.max(1, Math.floor((normalizeToDay(left).getTime() - normalizeToDay(right).getTime()) / MS_PER_DAY));
}

function alertScope(actor?: AuthUser): Prisma.AlertWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return {};
  }

  return {
    assignedTo: actor.id
  };
}

async function materializeOverdueVisitAlerts(actor?: AuthUser) {
  const today = startOfToday();
  const overdueVisits = await prisma.visit.findMany({
    where: {
      isCompleted: false,
      windowEnd: {
        lt: today
      },
      patient: actor?.role === UserRole.nurse ? { assignedNurse: actor.id } : undefined
    },
    include: {
      patient: true
    }
  });

  for (const visit of overdueVisits) {
    const assignedTo = visit.patient.assignedNurse;
    const expectedByDate = visit.scheduledDate ?? visit.windowEnd;

    if (!assignedTo || !expectedByDate) {
      continue;
    }

    const existingAlert = await prisma.alert.findFirst({
      where: {
        patientId: visit.patientId,
        assignedTo,
        alertType: "overdue_visit",
        expectedVisitType: visit.visitType,
        expectedByDate,
        status: {
          in: [AlertStatus.active, AlertStatus.acknowledged]
        }
      },
      select: { id: true }
    });

    if (existingAlert) {
      continue;
    }

    const alert = await prisma.alert.create({
      data: {
        patientId: visit.patientId,
        assignedTo,
        alertType: "overdue_visit",
        title: `${visit.patient.fullName} missed ${visit.visitType.replace("_", " ").toUpperCase()}`,
        message: `Visit was due by ${expectedByDate.toLocaleDateString("en-IN")}.`,
        priority: "high",
        expectedVisitType: visit.visitType,
        expectedByDate,
        daysOverdue: daysBetween(today, expectedByDate),
        status: AlertStatus.active
      }
    });

    await notificationService.notifyAlert(alert.id);
  }
}

export const alertsService = {
  async list(input: { status?: AlertStatus }, actor?: AuthUser) {
    await materializeOverdueVisitAlerts(actor);

    return prisma.alert.findMany({
      where: {
        status: input.status ?? AlertStatus.active,
        ...alertScope(actor)
      },
      include: {
        patient: true
      },
      orderBy: [{ createdAt: "desc" }]
    });
  },

  async acknowledge(id: string, actor?: AuthUser) {
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        ...alertScope(actor)
      },
      select: { id: true }
    });

    if (!alert) {
      return null;
    }

    return prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.acknowledged,
        acknowledgedAt: new Date()
      },
      include: {
        patient: true
      }
    });
  },

  async resolve(id: string, actor?: AuthUser) {
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        ...alertScope(actor)
      },
      select: { id: true }
    });

    if (!alert) {
      return null;
    }

    return prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.resolved,
        resolvedAt: new Date()
      },
      include: {
        patient: true
      }
    });
  }
};
