import { Report } from "@/types/report";
import { parseReportHeader } from "./report-header";
import { parseClass } from "./class";

export function parseReportFromHtml(html: string): Report {
  const doc = Document.parseHTMLUnsafe(html);
  const tableGroups = extractTableGroups(doc);

  const reportHeader = parseReportHeader(tableGroups[0][0]);
  const classes = tableGroups.map(parseClass);

  classes.sort((a, b) => Number(a.fullName.at(-1)) - Number(b.fullName.at(-1)));

  return { ...reportHeader, classes };
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

  return tableGroups;
}
