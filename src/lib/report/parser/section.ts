import { Section, SectionHeader } from "@/types/report";
import { parseAssignment } from "./assignment";

function parseSectionHeader(table: HTMLTableElement): SectionHeader {
  const tBody = table.firstElementChild!;
  const row = tBody.children[1];

  const [nameEl, descriptionEl, weightEl] = row.children;

  const name = (nameEl as HTMLTableCellElement).innerText.trim();
  const description =
    (descriptionEl as HTMLTableCellElement).innerText.trim() || undefined;

  const weight = Number(
    (weightEl as HTMLTableCellElement).innerText
      .trim()
      .substring("Weight = ".length),
  ) || 0;

  return {
    name,
    description,
    weight,
  };
}

export function parseSection(
  headerEl: HTMLTableElement,
  bodyEl: HTMLTableElement,
): Section {
  const header = parseSectionHeader(headerEl);
  const tBody = bodyEl.firstElementChild!;
  const last =
    (
      (tBody.lastElementChild as HTMLTableRowElement)
        .children[0] as HTMLTableCellElement
    ).innerText.trim() === "Term Grade";

  const assignments = Array.from(tBody.children)
    .slice(1, last ? -3 : -1)
    .map((tr) => parseAssignment(tr as HTMLTableRowElement));

  return { ...header, assignments };
}
