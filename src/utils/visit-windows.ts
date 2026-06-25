import { calculateEddFromLmp } from "./edd.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

export type VisitWindow = {
  visitType: "registration" | "anc_2" | "anc_3" | "anc_4" | "followup";
  visitNumber: number;
  windowStart: Date;
  windowEnd: Date;
  scheduledDate: Date;
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * DAYS_PER_WEEK);
}

export function buildAncVisitWindows(lmp: Date, registeredAt: Date = new Date()): VisitWindow[] {
  const edd = calculateEddFromLmp(lmp);

  return [
    {
      visitType: "registration",
      visitNumber: 1,
      windowStart: registeredAt,
      windowEnd: addWeeks(lmp, 14),
      scheduledDate: registeredAt
    },
    {
      visitType: "anc_2",
      visitNumber: 2,
      windowStart: addWeeks(lmp, 14),
      windowEnd: addWeeks(lmp, 26),
      scheduledDate: addWeeks(lmp, 20)
    },
    {
      // Window starts at week 26 (immediately after ANC 2 ends — no gap)
      visitType: "anc_3",
      visitNumber: 3,
      windowStart: addWeeks(lmp, 26),
      windowEnd: addWeeks(lmp, 32),
      scheduledDate: addWeeks(lmp, 30)
    },
    {
      visitType: "anc_4",
      visitNumber: 4,
      windowStart: addWeeks(lmp, 36),
      windowEnd: edd,
      scheduledDate: addWeeks(lmp, 38)
    }
  ];
}

export function buildHrpFollowupVisitWindows(flaggedAt: Date): VisitWindow[] {
  const followupWeeks = [2, 4, 6];

  return followupWeeks.map((week, index) => {
    const scheduledDate = addWeeks(flaggedAt, week);

    return {
      visitType: "followup",
      visitNumber: index + 1,
      windowStart: addDays(scheduledDate, -3), // ±3 day grace — nurse isn't overdue immediately
      windowEnd: addDays(scheduledDate, 3),
      scheduledDate
    };
  });
}
