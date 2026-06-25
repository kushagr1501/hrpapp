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

  if (overdueVisits.length === 0) {
    return;
  }

  // Bulk-fetch all existing overdue_visit alerts in one query instead of N+1
  const patientIds = [...new Set(overdueVisits.map((v) => v.patientId))];
  const existingAlerts = await prisma.alert.findMany({
    where: {
      patientId: { in: patientIds },
      alertType: "overdue_visit",
      status: {
        in: [AlertStatus.active, AlertStatus.acknowledged]
      }
    },
    select: {
      patientId: true,
      expectedVisitType: true,
      expectedByDate: true
    }
  });

  // Build a set of dedup keys for O(1) lookup
  const existingKeys = new Set(
    existingAlerts.map(
      (a) => `${a.patientId}|${a.expectedVisitType}|${a.expectedByDate?.toISOString() ?? ""}`
    )
  );

  const alertsToCreate: Parameters<typeof prisma.alert.create>[0]["data"][] = [];

  for (const visit of overdueVisits) {
    const assignedTo = visit.patient.assignedNurse;
    const expectedByDate = visit.scheduledDate ?? visit.windowEnd;

    if (!assignedTo || !expectedByDate) {
      continue;
    }

    const key = `${visit.patientId}|${visit.visitType}|${expectedByDate.toISOString()}`;
    if (existingKeys.has(key)) {
      continue;
    }

    alertsToCreate.push({
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
    });
  }

  if (alertsToCreate.length === 0) {
    return;
  }

  // Create all new alerts in a single transaction
  await prisma.$transaction(
    alertsToCreate.map((data) => prisma.alert.create({ data }))
  );

  // Fire push notifications for newly created alerts (fetch them back to get IDs)
  const newAlerts = await prisma.alert.findMany({
    where: {
      patientId: { in: alertsToCreate.map((a) => a.patientId as string) },
      alertType: "overdue_visit",
      status: AlertStatus.active,
      createdAt: { gte: today }
    },
    select: { id: true }
  });

  await Promise.allSettled(
    newAlerts.map((alert) => notificationService.notifyAlert(alert.id))
  );
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
