import { parseHTML } from "linkedom";
import type { Report } from "@/types/report";
import { parseClass } from "./class";
import { parseReportHeader } from "./report-header";
import { fullyDateReport } from "./utils";

export function parseReportFromHtml(html: string): Report {
  const { document } = parseHTML(html);
  const doc = document as unknown as Document;
  const tableGroups = extractTableGroups(doc);

  const reportHeader = parseReportHeader(tableGroups[0][0]);
  const classes = tableGroups.map(parseClass);

  classes.sort((a, b) => Number(a.fullName.at(-1)) - Number(b.fullName.at(-1)));

  return fullyDateReport({ ...reportHeader, classes });
}

function extractTableGroups(doc: Document): HTMLTableElement[][] {
  const elements = Array.from(doc.body.childNodes);

  const tableGroups = [];
  const tableGroup = [];

  for (const node of elements) {
    if (node.nodeName === "TABLE") {
      tableGroup.push(node as HTMLTableElement);

      if ((node as HTMLElement).nextElementSibling?.tagName === "BR") {
        tableGroups.push(tableGroup.splice(0));
      }
    }
  }

  if (tableGroup.length > 0) tableGroups.push(tableGroup);

  if (tableGroups.length === 0) {
    throw new Error("The page is not a FACTS grade progress report.");
  }

  return tableGroups;
}
