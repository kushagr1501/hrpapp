const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type GestationalAge = {
  weeks: number;
  days: number;
};

export function getGestationalAge(lmp: Date, asOf: Date = new Date()): GestationalAge {
  const diffMs = asOf.getTime() - lmp.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / MS_PER_DAY));

  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7
  };
}
