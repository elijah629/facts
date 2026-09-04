import { describe, expect, test } from "bun:test";
import { diffGradebooks } from "./diff";
import { hashGradebook } from "./hash";
import { convertHistory, type RevisionRow, walkHistory } from "./history-chain";
import { state } from "./history-fixture";
import type { GradebookState } from "./types";

export function chain(states: GradebookState[]) {
  const rows: RevisionRow[] = states.map((current, sequence) => ({
    id: `revision-${sequence}`,
    sequence,
    kind: sequence ? "delta" : "initial",
    data: sequence ? diffGradebooks(states[sequence - 1], current) : current,
    stateHash: hashGradebook(current),
    observedAt: new Date(1788480000000 + sequence * 1000),
  }));
  const head = {
    currentState: states[states.length - 1],
    headSequence: rows.length - 1,
    headStateHash: rows[rows.length - 1].stateHash,
    headRevisionId: rows[rows.length - 1].id,
  };
  return { rows, head };
}

describe("lossless reverse history", () => {
  test("converts all semantic transitions and restores the original forward chain", () => {
    const first = state();
    const second = structuredClone(first);
    second.classes.chemistry.assignments.a1.earned = null;
    second.classes.chemistry.assignments.a1.status = "missing";
    second.classes.chemistry.grading.categories.tests.weight = null;
    second.classes.chemistry.assignments.a2 = {
      ...first.classes.chemistry.assignments.a1,
      name: "Test 2",
    };
    const third = structuredClone(second);
    delete third.classes.chemistry.assignments.a1;
    third.classes.chemistry.grading.mode = "points";
    third.classes.chemistry.grading.roundingPrecision = 3;
    const fourth = structuredClone(third);
    delete fourth.classes.chemistry;
    fourth.term = "2";
    fourth.yearRange = { min: 2027, max: 2028 };
    const states = [first, second, third, fourth];
    const { rows, head } = chain(states);
    const reverse = convertHistory(rows, "forward-v1", head, "reverse-v1");
    expect(reverse[0].data).toBeNull();
    expect(
      reverse.map((row) => [row.id, row.stateHash, row.observedAt]),
    ).toEqual(rows.map((row) => [row.id, row.stateHash, row.observedAt]));
    walkHistory([...reverse].reverse(), "reverse-v1", head, (row, value) =>
      expect(value).toEqual(states[row.sequence]),
    );
    expect(convertHistory(reverse, "reverse-v1", head, "forward-v1")).toEqual(
      rows,
    );
    expect(convertHistory(reverse, "reverse-v1", head, "reverse-v1")).toEqual(
      reverse,
    );
  });

  test("one revision needs no duplicate full report", () => {
    const { rows, head } = chain([state()]);
    const reverse = convertHistory(rows, "forward-v1", head, "reverse-v1");
    expect(reverse[0].data).toBeNull();
    expect(convertHistory(reverse, "reverse-v1", head, "forward-v1")).toEqual(
      rows,
    );
  });

  test("gaps, corrupt hashes, wrong head and invalid payloads fail closed", () => {
    const first = state();
    const second = structuredClone(first);
    second.studentName = "New name";
    const third = structuredClone(second);
    third.term = "2";
    const { rows, head } = chain([first, second, third]);
    const reverse = convertHistory(
      rows,
      "forward-v1",
      head,
      "reverse-v1",
    ).reverse();
    expect(() =>
      walkHistory([reverse[0], reverse[2]], "reverse-v1", head, () => {}),
    ).toThrow("REVISION_CHAIN_INCOMPLETE");
    expect(() =>
      walkHistory(
        reverse,
        "reverse-v1",
        { ...head, headRevisionId: "wrong" },
        () => {},
      ),
    ).toThrow("REVISION_CHAIN_INCOMPLETE");
    const broken = structuredClone(reverse);
    broken[1].stateHash = "bad";
    expect(() => walkHistory(broken, "reverse-v1", head, () => {})).toThrow(
      "REVISION_INTEGRITY_CHECK_FAILED",
    );
    const invalid = structuredClone(reverse);
    invalid[0].data = null;
    expect(() => walkHistory(invalid, "reverse-v1", head, () => {})).toThrow(
      "REVISION_CHAIN_INCOMPLETE",
    );
    expect(() =>
      convertHistory(rows.slice(1), "forward-v1", head, "reverse-v1"),
    ).toThrow("REVISION_CHAIN_INCOMPLETE");
  });

  test("a recent window walks only its suffix of a long chain", () => {
    const states = Array.from({ length: 1000 }, (_, i) => {
      const current = state();
      current.classes.chemistry.assignments.a1.earned = String(i);
      return current;
    });
    const { rows, head } = chain(states);
    const reverse = convertHistory(rows, "forward-v1", head, "reverse-v1");
    let count = 0;
    walkHistory(
      reverse.slice(-21).reverse(),
      "reverse-v1",
      head,
      (row, value) => {
        count++;
        expect(hashGradebook(value)).toBe(rows[row.sequence].stateHash);
      },
    );
    expect(count).toBe(21);
    count = 0;
    walkHistory(reverse.slice(-1), "reverse-v1", head, () => {
      count++;
    });
    expect(count).toBe(1);
  });
});
