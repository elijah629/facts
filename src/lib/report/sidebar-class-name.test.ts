import { describe, expect, test } from "bun:test";
import { sidebarClassName } from "./sidebar-class-name";

describe("sidebar class names", () => {
  test("shortens Ag Mechanics", () => {
    expect(sidebarClassName("Agri-Design: Ag Mech & Engineering Design")).toBe(
      "Ag Mechanics",
    );
  });

  test("keeps unknown class names", () => {
    expect(sidebarClassName("Algebra II (H)")).toBe("Algebra II (H)");
  });
});
