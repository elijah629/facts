import { parseHTML } from "linkedom";
import type { Report } from "@/types/report";
import { parseClass } from "./class";
import { parseReportHeader } from "./report-header";
import { fullyDateReport } from "./utils";

export function parseReportFromHtml(html: string): Report {
  const doc = parseReportDocument(html);
  const tableGroups = extractTableGroups(doc);

  const reportHeader = parseReportHeader(tableGroups[0][0]);
  const classes = tableGroups.map(parseClass);

  classes.sort((a, b) => Number(a.fullName.at(-1)) - Number(b.fullName.at(-1)));

  return fullyDateReport({ ...reportHeader, classes });
}

export function parseReportDocument(html: string): Document {
  const source = /<body(?:\s|>)/i.test(html)
    ? html
    : `<html><body>${html}</body></html>`;
  const { document } = parseHTML(source);

  for (const table of document.querySelectorAll("table")) {
    const directRows = Array.from(table.children).filter(
      (child) => child.tagName === "TR",
    );
    if (directRows.length === 0) continue;
    const body = document.createElement("tbody");
    table.insertBefore(body, directRows[0]);
    for (const row of directRows) body.append(row);
  }

  return document as unknown as Document;
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
