import type { GradebookState } from "./types";

export function state(): GradebookState {
  return {
    studentName: "Student",
    term: "1",
    yearRange: { min: 2026, max: 2027 },
    classes: {
      chemistry: {
        name: "Chemistry",
        displayName: "Chemistry",
        teacher: "Teacher",
        term: "1",
        grading: {
          mode: "mixed",
          roundingPrecision: 2,
          categories: {
            tests: { name: "Tests", description: null, weight: "0.7" },
          },
        },
        assignments: {
          a1: {
            name: "Test 1",
            description: null,
            categoryId: "tests",
            earned: "44",
            possible: "50",
            status: "valid",
            excluded: false,
            extraCredit: false,
            dueDate: "2026-09-04T00:00:00.000Z",
            note: null,
            weight: null,
            curve: null,
            bonus: null,
            penalty: null,
          },
        },
      },
    },
  };
}
