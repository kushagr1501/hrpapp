import { calculateEddFromLmp } from "./edd.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

export type VisitTypeEnum = "registration" | "anc_2" | "anc_3" | "anc_4" | "anc_5" | "anc_6" | "anc_7" | "anc_8" | "followup";

export type VisitWindow = {
  visitType: VisitTypeEnum;
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
      windowEnd: addWeeks(lmp, 12),
      scheduledDate: registeredAt
    },
    {
      visitType: "anc_2",
      visitNumber: 2,
      windowStart: addWeeks(lmp, 19),
      windowEnd: addWeeks(lmp, 21),
      scheduledDate: addWeeks(lmp, 20)
    },
    {
      visitType: "anc_3",
      visitNumber: 3,
      windowStart: addWeeks(lmp, 25),
      windowEnd: addWeeks(lmp, 27),
      scheduledDate: addWeeks(lmp, 26)
    },
    {
      visitType: "anc_4",
      visitNumber: 4,
      windowStart: addWeeks(lmp, 29),
      windowEnd: addWeeks(lmp, 31),
      scheduledDate: addWeeks(lmp, 30)
    },
    {
      visitType: "anc_5",
      visitNumber: 5,
      windowStart: addWeeks(lmp, 33),
      windowEnd: addWeeks(lmp, 35),
      scheduledDate: addWeeks(lmp, 34)
    },
    {
      visitType: "anc_6",
      visitNumber: 6,
      windowStart: addWeeks(lmp, 35),
      windowEnd: addWeeks(lmp, 37),
      scheduledDate: addWeeks(lmp, 36)
    },
    {
      visitType: "anc_7",
      visitNumber: 7,
      windowStart: addWeeks(lmp, 37),
      windowEnd: addWeeks(lmp, 39),
      scheduledDate: addWeeks(lmp, 38)
    },
    {
      visitType: "anc_8",
      visitNumber: 8,
      windowStart: addWeeks(lmp, 39),
      windowEnd: edd,
      scheduledDate: addWeeks(lmp, 40)
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
