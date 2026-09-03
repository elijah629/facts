import type { Assignment } from "@/types/report";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function words(value: string): string[] {
  return (
    value
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

function commonPrefixRatio(left: string[], right: string[]): number {
  let common = 0;

  while (
    common < left.length &&
    common < right.length &&
    left[common] === right[common]
  ) {
    common++;
  }

  return left.length === 0 ? 0 : common / left.length;
}

function separatorScore(
  source: string,
  separatorIndex: number,
  name: string,
  description: string,
): number {
  const descriptionWords = words(description);
  const nameVariants = [words(name)];
  const labelSeparator = name.indexOf(": ");

  if (labelSeparator !== -1) {
    nameVariants.push(words(name.slice(labelSeparator + 2)));
  }

  const repeatedPrefix = Math.max(
    ...nameVariants.map((variant) =>
      commonPrefixRatio(variant, descriptionWords),
    ),
  );

  // FACTS sometimes leaves a trailing space on the title before inserting
  // its own separator. An internal title colon does not have that space.
  const explicitBoundary = /\s/.test(source[separatorIndex - 1] ?? "") ? 2 : 0;

  return explicitBoundary + repeatedPrefix;
}

function trimRepeatedName(name: string, description: string): string {
  const comparableName = name.toLowerCase();
  const comparableDescription = description.toLowerCase();
  let result = description;

  if (comparableDescription.startsWith(comparableName)) {
    result = description
      .slice(name.length)
      .replace(/^[\s:;—–-]+/, "")
      .trim();
  }

  if (result.startsWith("(") && result.endsWith(")")) {
    result = result.slice(1, -1).trim();
  }

  return result;
}

export function parseAssignmentLabel(rawName: string): {
  name: string;
  description?: string;
} {
  const source = normalizeWhitespace(rawName);
  const separators = Array.from(source.matchAll(/:\s+/g));

  if (separators.length === 0) {
    return { name: source };
  }

  const candidates = separators.map((match) => {
    const separatorIndex = match.index;
    const name = source.slice(0, separatorIndex).trim();
    const description = source.slice(separatorIndex + match[0].length).trim();

    return {
      name,
      description,
      score: separatorScore(source, separatorIndex, name, description),
    };
  });

  const best = candidates.reduce((current, candidate) =>
    candidate.score > current.score ? candidate : current,
  );
  const description = trimRepeatedName(best.name, best.description);

  return {
    name: best.name,
    description: description || undefined,
  };
}

export function parseAssignment(
  row: HTMLTableRowElement,
  sourceIndex: number,
): Assignment {
  let [
    rawName,
    points,
    maxPoints,
    _average,
    status,
    rawDue,
    rawCurve,
    rawBonus,
    rawPenalty,
    ...rest
  ] = Array.from(row.children).map((cell) =>
    (cell as HTMLTableCellElement).innerText.trim(),
  );

  const note = rest.at(-1);
  const rawWeight = rest.length > 1 ? Number(rest[0]) : undefined;
  const weight =
    rawWeight !== undefined && Number.isFinite(rawWeight)
      ? rawWeight
      : undefined;
  const adjustment = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const curve = adjustment(rawCurve);
  const bonus = adjustment(rawBonus);
  const penalty = adjustment(rawPenalty);

  const [month, day] = rawDue.split("/").map(Number);
  const due = new Date(Date.UTC(0, month - 1, day));

  const { name, description } = parseAssignmentLabel(rawName);

  status = status.toLowerCase() as Assignment["status"];

  if (status === "valid") {
    return {
      status: "valid",
      sourceIndex,
      name,
      description,

      points: Number(points),
      maxPoints: Number(maxPoints),

      due,

      note: note || undefined,
      weight,
      curve,
      bonus,
      penalty,
    };
  }

  if (status === "excuse") {
    return {
      status: "excuse",
      sourceIndex,
      name,
      description,

      due,
      note: note || undefined,
      weight,
      curve,
      bonus,
      penalty,
    };
  }

  if (status === "missing") {
    return {
      status: "missing",
      sourceIndex,
      name,
      description,

      maxPoints: Number(maxPoints),

      due,
      note: note || undefined,
      weight,
      curve,
      bonus,
      penalty,
    };
  }

  return {
    status: "excuse", // fallback
    sourceIndex,
    name,
    description,

    due,
    note: note || undefined,
    weight,
    curve,
    bonus,
    penalty,
  };
}
