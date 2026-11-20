const gradePercent = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
const signedPercent = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const signedGpa = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
  signDisplay: "exceptZero",
});

export function formatGrade(value: number | null | undefined) {
  return value != null && Number.isFinite(value)
    ? `${gradePercent.format(value * 100)}%`
    : "—";
}

export function percentagePointChange(
  current: number | null | undefined,
  previous: number | null | undefined,
) {
  return current != null &&
    previous != null &&
    Number.isFinite(current) &&
    Number.isFinite(previous)
    ? (current - previous) * 100
    : undefined;
}

export function formatGradeChange(
  value: number | undefined,
  unit: "percent" | "gpa" = "percent",
) {
  if (value === undefined || !Number.isFinite(value)) return null;
  const format = unit === "gpa" ? signedGpa : signedPercent;
  const label = format.format(value);
  if (label === "0") return null;
  return unit === "percent" ? `${label}%` : label;
}
