import { Prisma, UserRole, type VisitType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import type { AuthUser } from "../../types/auth.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type CreateVisitInput = {
  visitType: VisitType;
  visitNumber?: number;
  windowStart?: string;
  windowEnd?: string;
  scheduledDate?: string;
  actualDate?: string;
  wasAccompanied?: boolean;
  conductedBy?: string;
  facilityId?: string;
  notes?: string;
  isCompleted?: boolean;
};

type UpdateVisitInput = Partial<CreateVisitInput>;

function parseDate(value?: string) {
  return value ? new Date(value) : undefined;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function patientScope(actor?: AuthUser): Prisma.PatientWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return {};
  }

  return {
    assignedNurse: actor.id
  };
}

function visitScope(actor?: AuthUser): Prisma.VisitWhereInput {
  if (!actor || actor.role !== UserRole.nurse) {
    return {};
  }

  return {
    patient: {
      assignedNurse: actor.id
    }
  };
}

const visitInclude = {
  patient: true,
  facility: true,
  conductedByUser: true,
  vitals: {
    orderBy: {
      recordedAt: "desc"
    }
  }
} satisfies Prisma.VisitInclude;

export const visitService = {
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

    return prisma.visit.findMany({
      where: { patientId },
      include: visitInclude,
      orderBy: [{ windowStart: "asc" }, { createdAt: "asc" }]
    });
  },

  async createForPatient(patientId: string, input: CreateVisitInput, actor?: AuthUser) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        ...patientScope(actor)
      },
      select: {
        id: true,
        facilityId: true
      }
    });

    if (!patient) {
      return null;
    }

    const now = new Date();
    const isCompleted = input.isCompleted ?? Boolean(input.actualDate);
    const conductedBy = input.conductedBy ?? (isCompleted ? actor?.id : undefined);

    return prisma.visit.create({
      data: {
        patientId: patient.id,
        visitType: input.visitType,
        visitNumber: input.visitNumber,
        windowStart: parseDate(input.windowStart),
        windowEnd: parseDate(input.windowEnd),
        scheduledDate: parseDate(input.scheduledDate),
        actualDate: parseDate(input.actualDate) ?? (isCompleted ? now : undefined),
        wasAccompanied: input.wasAccompanied ?? false,
        conductedBy,
        facilityId: input.facilityId ?? patient.facilityId ?? actor?.facilityId ?? undefined,
        notes: input.notes,
        isCompleted,
        completedAt: isCompleted ? now : undefined
      },
      include: visitInclude
    });
  },

  async update(visitId: string, input: UpdateVisitInput, actor?: AuthUser) {
    const existingVisit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        ...visitScope(actor)
      },
      select: {
        id: true,
        isCompleted: true,
        conductedBy: true
      }
    });

    if (!existingVisit) {
      return null;
    }

    const now = new Date();
    const isMarkingComplete = input.isCompleted === true && !existingVisit.isCompleted;
    const isMarkingIncomplete = input.isCompleted === false;

    return prisma.visit.update({
      where: { id: existingVisit.id },
      data: {
        visitType: input.visitType,
        visitNumber: input.visitNumber,
        windowStart: parseDate(input.windowStart),
        windowEnd: parseDate(input.windowEnd),
        scheduledDate: parseDate(input.scheduledDate),
        actualDate: parseDate(input.actualDate) ?? (isMarkingComplete ? now : undefined),
        wasAccompanied: input.wasAccompanied,
        conductedBy: input.conductedBy ?? (isMarkingComplete ? actor?.id ?? existingVisit.conductedBy : undefined),
        facilityId: input.facilityId,
        notes: input.notes,
        isCompleted: input.isCompleted,
        completedAt: isMarkingComplete ? now : isMarkingIncomplete ? null : undefined
      },
      include: visitInclude
    });
  },

  async listOverdue(actor?: AuthUser) {
    const today = startOfToday();

    return prisma.visit.findMany({
      where: {
        isCompleted: false,
        windowEnd: {
          lt: today
        },
        ...visitScope(actor)
      },
      include: visitInclude,
      orderBy: [{ windowEnd: "asc" }, { createdAt: "asc" }]
    });
  },

  async listUpcoming(input: { days: number; includeOverdue: boolean }, actor?: AuthUser) {
    const today = startOfToday();
    const rangeEnd = endOfDay(addDays(today, input.days));

    return prisma.visit.findMany({
      where: {
        isCompleted: false,
        scheduledDate: {
          ...(input.includeOverdue ? {} : { gte: today }),
          lte: rangeEnd
        },
        ...visitScope(actor)
      },
      include: visitInclude,
      orderBy: [{ scheduledDate: "asc" }, { windowStart: "asc" }, { createdAt: "asc" }]
    });
  }
};
