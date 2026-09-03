import { describe, expect, test } from "bun:test";
import { parseReportDocument } from "./index";

describe("FACTS report DOM normalization", () => {
  test("gives fragments browser-style body and table bodies", () => {
    const document = parseReportDocument(
      "<table><tr><td>Grade</td></tr></table>",
    );
    const table = document.body.firstElementChild;
    expect(table?.tagName).toBe("TABLE");
    expect(table?.firstElementChild?.tagName).toBe("TBODY");
    expect(table?.textContent).toBe("Grade");
  });

  test("keeps existing table bodies", () => {
    const document = parseReportDocument(
      "<html><body><table><tbody><tr></tr></tbody></table></body></html>",
    );
    expect(document.querySelectorAll("tbody")).toHaveLength(1);
  });
});
