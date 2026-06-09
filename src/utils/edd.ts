const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EDD_DAYS_FROM_LMP = 280;

export function calculateEddFromLmp(lmp: Date): Date {
  return new Date(lmp.getTime() + EDD_DAYS_FROM_LMP * MS_PER_DAY);
}
