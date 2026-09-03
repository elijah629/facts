import { describe, expect, test } from "bun:test";
import { compareClassesByPeriod } from "./class-order";

describe("compareClassesByPeriod", () => {
  test("orders FACTS classes by trailing period number", () => {
    const classes = [
      { fullName: "THEO 201A - 10" },
      { fullName: "THEO 201A - 4" },
      { fullName: "THEO 201A - 2" },
    ];

    expect(
      classes.sort(compareClassesByPeriod).map(({ fullName }) => fullName),
    ).toEqual(["THEO 201A - 2", "THEO 201A - 4", "THEO 201A - 10"]);
  });

  test("uses class name as a stable tie-breaker", () => {
    const classes = [
      { fullName: "THEO 201B - 4" },
      { fullName: "THEO 201A - 4" },
    ];

    expect(
      classes.sort(compareClassesByPeriod).map(({ fullName }) => fullName),
    ).toEqual(["THEO 201A - 4", "THEO 201B - 4"]);
  });
});
