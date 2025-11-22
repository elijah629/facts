import type { Class, ClassHeader } from "@/types/report";
import { parseSection } from "./section";
import { formatName, normalizeWeights } from "./utils";

function parseClassHeader(table: HTMLTableElement): ClassHeader {
  const tBody = table.firstElementChild!;

  const [_, firstRow, secondRow, thirdRow] = tBody.children;

  const instructor = formatName(
    (firstRow.children[2] as HTMLTableCellElement).innerText,
  );
  const fullName = (
    secondRow.firstElementChild as HTMLTableCellElement
  ).innerText.trim();

  const gradingMethod = (
    secondRow.children[2] as HTMLTableCellElement
  ).innerText
    .trim()
    .toLowerCase() as ClassHeader["gradingMethod"];

  const displayName = (
    thirdRow.firstElementChild as HTMLTableCellElement
  ).innerText.trim();

  return {
    fullName,
    displayName,
    instructor,
    gradingMethod,
  };
}

export function parseClass(tables: HTMLTableElement[]): Class {
  const header = parseClassHeader(tables[0]);

  const sections = [];

  for (let i = 1; i < tables.length; i += 2) {
    const header = tables[i];
    const body = tables[i + 1];

    sections.push(parseSection(header, body));
  }

  if (header.gradingMethod === "mixed" || header.gradingMethod === "percent") {
    sections.sort((a, b) => b.weight! - a.weight!);
  }

  let lastI = tables.length % 2 === 0 ? tables.length - 1 : tables.length - 2;

  const roundingPrecision = (
    (
      (
        (tables[lastI + 1].firstElementChild as HTMLTableSectionElement)
          .lastElementChild as HTMLTableRowElement
      ).children[1] as HTMLTableCellElement
    ).innerText
      .trim()
      .split(".")[1] || ""
  ).length;

  const weights = sections.map((x) => x.weight);

  if (weights.some((x) => typeof x === "undefined")) {
    return { ...header, sections, roundingPrecision };
  }

  const normalized = normalizeWeights(weights as number[]);

  for (let i = 0; i < sections.length; i++) {
    sections[i].weight = normalized[i];
  }

  return { ...header, sections, roundingPrecision };
}
