import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { databaseRead } from "@/lib/db/read";
import { gradebookRevisions } from "@/lib/db/schema";
import { schoolGpas } from "@/lib/grades";
import { historyChanges } from "./history-changes";
import { calculateGradebook, reportProjection } from "./projection";
import {
  type HistoryTransaction,
  readHistoryHead,
  readHistoryRange,
} from "./reconstruct";
import type { TimelineGrades, TimelinePage } from "./timeline-types";
import type { GradebookState } from "./types";

export function timelineGrades(state: GradebookState): TimelineGrades {
  const report = reportProjection(state);
  const school = schoolGpas(report.classes);
  const weighted = calculateGradebook(state, true, report);
  return {
    gpa: school.weighted,
    unweightedGpa: school.unweighted,
    classes: weighted.classes.map(({ id, name, percentage, letter }) => ({
      id,
      name,
      percentage,
      letter,
    })),
  };
}

export async function revisionHistoryPage(
  userId: string,
  options: { before?: number; revision?: string; limit?: number } = {},
): Promise<TimelinePage> {
  return databaseRead(() =>
    db.transaction((tx) => historyPageInTransaction(tx, userId, options), {
      isolationLevel: "repeatable read",
      accessMode: "read only",
    }),
  );
}

export async function historyPageInTransaction(
  tx: HistoryTransaction,
  userId: string,
  options: { before?: number; revision?: string; limit?: number } = {},
): Promise<TimelinePage> {
  const empty: TimelinePage = {
    points: [],
    selectedId: null,
    before: null,
    hasNewer: false,
    unavailable: Boolean(options.revision),
  };
  const head = await readHistoryHead(tx, { userId });
  if (!head || head.headSequence < 0) return empty;
  let before = options.before;
  if (options.revision) {
    // Check ownership before reading payloads, even for direct links.
    const [selected] = await tx
      .select({ sequence: gradebookRevisions.sequence })
      .from(gradebookRevisions)
      .where(
        and(
          eq(gradebookRevisions.streamId, head.streamId),
          eq(gradebookRevisions.id, options.revision),
        ),
      )
      .limit(1);
    if (!selected) return empty;
    before = selected.sequence + 1;
  }
  const newest = Math.min(
    (before ?? head.headSequence + 1) - 1,
    head.headSequence,
  );
  if (newest < 0) return empty;
  const oldest = Math.max(0, newest - (options.limit ?? 20) + 1);
  const rows = await readHistoryRange(
    tx,
    head.streamId,
    Math.max(0, oldest - 1),
    newest,
    head,
  );
  const grades = new Map(
    rows.map((row) => [row.sequence, timelineGrades(row.state)]),
  );
  const states = new Map(rows.map((row) => [row.sequence, row.state]));
  const points = rows
    .filter((row) => row.sequence >= oldest)
    .map((row) => {
      const currentGrades = grades.get(row.sequence);
      const previousState = states.get(row.sequence - 1);
      if (!currentGrades || (row.sequence > 0 && !previousState))
        throw new Error("REVISION_CHAIN_INCOMPLETE");
      return {
        id: row.id,
        sequence: row.sequence,
        observedAt: row.observedAt.toISOString(),
        term: row.state.term,
        schoolYear: `${row.state.yearRange.min}–${row.state.yearRange.max}`,
        grades: currentGrades,
        previousGrades: grades.get(row.sequence - 1) ?? null,
        previousComparable:
          previousState?.term === row.state.term &&
          previousState.yearRange.min === row.state.yearRange.min &&
          previousState.yearRange.max === row.state.yearRange.max,
        changes: previousState ? historyChanges(previousState, row.state) : [],
      };
    });
  return {
    points,
    selectedId: options.revision ?? points.at(-1)?.id ?? null,
    before: oldest > 0 ? oldest : null,
    hasNewer: head.headSequence > newest,
    unavailable: false,
  };
}
