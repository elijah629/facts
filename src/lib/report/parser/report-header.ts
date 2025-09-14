import type { ReportHeader } from "@/types/report";
import { formatName } from "./utils";

export function parseReportHeader(table: HTMLTableElement): ReportHeader {
  const tBody = table.firstElementChild!;

  const [_, firstRow, secondRow] = tBody.children;

  const $for = formatName(
    (firstRow.firstElementChild as HTMLTableCellElement).innerText,
  );
  const term = (secondRow.children[1] as HTMLTableCellElement).innerText;

  const yearRange = (
    firstRow.children[1] as HTMLTableCellElement
  ).innerText.split("-");

  const min = Number(yearRange[0]);
  const max = Number(yearRange[1]);

  return {
    for: $for,
    term,
    yearRange: { min, max },
  };
}
