import { formatGradeChange } from "./display";

interface Observation {
  value: number | null;
  period: string;
  sequence: number;
}

const neutral = "var(--muted-foreground)";

export function gradeTrend(
  observations: Observation[],
  unit: "percent" | "gpa",
) {
  const segments: { key: string; start: number; end: number }[] = [];
  const data = observations.map((item, index) => {
    if (
      index === 0 ||
      (unit === "percent" && observations[index - 1].period !== item.period)
    ) {
      segments.push({
        key: `series_${item.sequence}`,
        start: index,
        end: index,
      });
    }
    const segment = segments[segments.length - 1];
    segment.end = index;
    return { sequence: item.sequence, [segment.key]: item.value };
  });

  const lines = segments.map(({ key, start, end }) => {
    const values = observations.slice(start, end + 1).map((item) => item.value);
    const first = values.findIndex((value) => value !== null);
    const last = values.findLastIndex((value) => value !== null);
    const stops: { offset: number; color: string; edge: "start" | "end" }[] =
      [];
    let previousIndex = first;
    for (let index = first + 1; index <= last; index++) {
      const previous = values[previousIndex];
      const current = values[index];
      if (unit === "gpa" && current === null) continue;
      const difference =
        previous === null || current === null ? 0 : current - previous;
      const amount = unit === "percent" ? difference * 100 : difference;
      const color = !formatGradeChange(amount, unit)
        ? neutral
        : difference > 0
          ? "var(--grade-up)"
          : "var(--grade-down)";
      stops.push(
        {
          offset: (previousIndex - first) / (last - first),
          color,
          edge: "start",
        },
        { offset: (index - first) / (last - first), color, edge: "end" },
      );
      previousIndex = index;
    }
    const color = stops.every((stop) => stop.color === stops[0]?.color)
      ? (stops[0]?.color ?? neutral)
      : undefined;
    return { key, stops, color };
  });
  const values = observations.flatMap(({ value }) =>
    value === null ? [] : [value],
  );
  const padding = unit === "gpa" ? 0.12 : 0.025;
  const domain: [number, number] = values.length
    ? [
        Math.max(0, Math.min(...values) - padding),
        Math.max(...values) + padding,
      ]
    : [0, unit === "gpa" ? 5.5 : 1];
  return { data, lines, domain };
}
