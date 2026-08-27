import type { Report } from "@/types/report";
import { parseClass } from "./class";
import { parseReportHeader } from "./report-header";
import { fullyDateReport } from "./utils";

export function parseReportFromHtml(html: string): Report {
  const doc = Document.parseHTMLUnsafe(html);
  const tableGroups = extractTableGroups(doc);

  const reportHeader = parseReportHeader(tableGroups[0][0]);
  const classes = tableGroups.map(parseClass);

  classes.sort((a, b) => Number(a.fullName.at(-1)) - Number(b.fullName.at(-1)));

  return fullyDateReport({ ...reportHeader, classes });
}

export function parseReportsFromHtml(documents: string[]): Report {
  const reports = documents.map(parseReportFromHtml);
  const first = reports[0];

  if (!first) throw new Error("No class reports were supplied.");

  for (const report of reports.slice(1)) {
    if (report.for !== first.for) {
      throw new Error("All class links must belong to the same student.");
    }
  }

  const classes = reports.flatMap((report) => report.classes);
  const uniqueClasses = [
    ...new Map(classes.map((cls) => [cls.fullName, cls])).values(),
  ];
  uniqueClasses.sort(
    (a, b) => Number(a.fullName.at(-1)) - Number(b.fullName.at(-1)),
  );

  return fullyDateReport({ ...first, classes: uniqueClasses });
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
