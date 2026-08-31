import type { Section, SectionHeader } from "@/types/report";
import { parseAssignment } from "./assignment";

function parseSectionHeader(table: HTMLTableElement): SectionHeader {
  const tBody = table.firstElementChild;

  if (!tBody) {
    throw new Error("Section header table is missing a body.");
  }

  const row = tBody.children[1];

  const [nameEl, descriptionEl, weightEl] = row.children;

  const name = (nameEl as HTMLTableCellElement).innerText.trim();
  const description =
    (descriptionEl as HTMLTableCellElement).innerText.trim() || undefined;

  const weight = (weightEl as HTMLTableCellElement).innerText
    .trim()
    .substring("Weight = ".length);

  return {
    name,
    description,
    weight: weight.length === 0 ? undefined : Number(weight),
  };
}

export function parseSection(
  headerEl: HTMLTableElement,
  bodyEl: HTMLTableElement,
): Section {
  const header = parseSectionHeader(headerEl);
  const tBody = bodyEl.firstElementChild;

  if (!tBody) {
    throw new Error("Section body table is missing a body.");
  }

  const last =
    (
      (tBody.lastElementChild as HTMLTableRowElement)
        .children[0] as HTMLTableCellElement
    ).innerText.trim() === "Term Grade";

  const assignments = Array.from(tBody.children)
    .slice(1, last ? -3 : -1)
    .map((tr, sourceIndex) =>
      parseAssignment(tr as HTMLTableRowElement, sourceIndex),
    );

  return { ...header, assignments };
}
