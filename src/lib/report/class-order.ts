import type { Class } from "@/types/report";

function periodFromFullName(fullName: string): number | undefined {
  const period = fullName.match(/-\s*(\d+)\s*$/)?.[1];
  return period === undefined ? undefined : Number(period);
}

/** Sort classes by their trailing FACTS period number, then name. */
export function compareClassesByPeriod(
  left: Pick<Class, "fullName">,
  right: Pick<Class, "fullName">,
): number {
  const leftPeriod = periodFromFullName(left.fullName);
  const rightPeriod = periodFromFullName(right.fullName);

  if (leftPeriod !== undefined && rightPeriod !== undefined) {
    const difference = leftPeriod - rightPeriod;
    if (difference !== 0) return difference;
  } else if (leftPeriod !== undefined) {
    return -1;
  } else if (rightPeriod !== undefined) {
    return 1;
  }

  return left.fullName.localeCompare(right.fullName, undefined, {
    numeric: true,
  });
}
