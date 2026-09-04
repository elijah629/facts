import { applyGradebookDelta } from "./apply-delta";
import { diffGradebooks } from "./diff";
import { hashGradebook } from "./hash";
import type { GradebookDelta, GradebookState } from "./types";

export type HistoryFormat = "forward-v1" | "reverse-v1";
export interface RevisionRow {
  id: string;
  sequence: number;
  kind: "initial" | "delta";
  data: GradebookState | GradebookDelta | null;
  observedAt: Date;
  stateHash: string;
  sourceEmailReceivedAt?: Date | null;
}
export interface HistoryHead {
  currentState: GradebookState | null;
  headSequence: number;
  headStateHash: string | null;
  headRevisionId: string | null;
}

function verify(state: GradebookState, hash: string | null) {
  if (!hash || hashGradebook(state) !== hash)
    throw new Error("REVISION_INTEGRITY_CHECK_FAILED");
}

// Visit one state at a time. Callers retain only the requested window/projection.
// Rows must be ascending for forward storage and descending for reverse storage.
export function walkHistory(
  rows: RevisionRow[],
  format: HistoryFormat,
  head: HistoryHead | null,
  visit: (row: RevisionRow, state: GradebookState) => void,
) {
  if (!rows.length) throw new Error("GRADEBOOK_HAS_NO_REVISIONS");
  if (format === "forward-v1") {
    let state: GradebookState | undefined;
    let sequence = 0;
    for (const row of rows) {
      if (
        row.sequence !== sequence++ ||
        !row.data ||
        row.kind !== (row.sequence === 0 ? "initial" : "delta")
      )
        throw new Error("REVISION_CHAIN_INCOMPLETE");
      if (row.sequence === 0)
        state = structuredClone(row.data as GradebookState);
      else {
        if (!state) throw new Error("REVISION_CHAIN_INCOMPLETE");
        state = applyGradebookDelta(state, row.data as GradebookDelta);
      }
      verify(state, row.stateHash);
      visit(row, state);
    }
    return;
  }
  if (
    !head?.currentState ||
    rows[0].sequence !== head.headSequence ||
    rows[0].id !== head.headRevisionId
  )
    throw new Error("REVISION_CHAIN_INCOMPLETE");
  let state = structuredClone(head.currentState);
  verify(state, head.headStateHash);
  let sequence = head.headSequence;
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (
      row.sequence !== sequence-- ||
      row.kind !== (row.sequence === 0 ? "initial" : "delta") ||
      (row.sequence === 0 ? row.data !== null : row.data === null)
    )
      throw new Error("REVISION_CHAIN_INCOMPLETE");
    verify(state, row.stateHash);
    visit(row, state);
    if (index < rows.length - 1)
      state = applyGradebookDelta(state, row.data as GradebookDelta);
  }
}

// Produces a checked, lossless conversion while preserving revision identity.
export function convertHistory(
  rows: RevisionRow[],
  format: HistoryFormat,
  head: HistoryHead,
  target: HistoryFormat,
): RevisionRow[] {
  const ordered = [...rows].sort((a, b) => a.sequence - b.sequence);
  if (
    ordered[0]?.sequence !== 0 ||
    ordered.at(-1)?.sequence !== head.headSequence ||
    ordered.at(-1)?.id !== head.headRevisionId ||
    !head.currentState
  )
    throw new Error("REVISION_CHAIN_INCOMPLETE");
  verify(head.currentState, head.headStateHash);
  const result: RevisionRow[] = [];
  let adjacent: { row: RevisionRow; state: GradebookState } | undefined;
  walkHistory(
    format === "reverse-v1" ? [...ordered].reverse() : ordered,
    format,
    head,
    (row, state) => {
      if (row.sequence === head.headSequence) verify(state, head.headStateHash);
      if (format === target) result.push(row);
      else if (target === "reverse-v1") {
        result.push({
          ...row,
          data: adjacent ? diffGradebooks(state, adjacent.state) : null,
        });
      } else {
        if (adjacent)
          result.push({
            ...adjacent.row,
            data: diffGradebooks(state, adjacent.state),
          });
        if (row.sequence === 0) result.push({ ...row, data: state });
      }
      adjacent = { row, state };
    },
  );
  result.sort((a, b) => a.sequence - b.sequence);
  walkHistory(
    target === "reverse-v1" ? [...result].reverse() : result,
    target,
    head,
    () => {},
  );
  return result;
}
