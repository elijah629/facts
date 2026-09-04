import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gradebookRevisions, gradebookStreams } from "@/lib/db/schema";
import { historyChanges } from "./history-changes";
import { calculateGradebook } from "./projection";
import { type HistoryTransaction, readHistoryRange } from "./reconstruct";
import type { TimelineGrades, TimelinePage } from "./timeline-types";
import type { GradebookState } from "./types";

export function timelineGrades(state: GradebookState): TimelineGrades {
  const weighted = calculateGradebook(state);
  const hasGrades = weighted.classes.some((cls) => cls.percentage !== null);
  return {
    gpa: hasGrades ? weighted.gpa : null,
    unweightedGpa: hasGrades ? calculateGradebook(state, false).gpa : null,
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
  options: { before?: number; revision?: string } = {},
): Promise<TimelinePage> {
  return db.transaction((tx) => historyPageInTransaction(tx, userId, options), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
}

export async function historyPageInTransaction(
  tx: HistoryTransaction,
  userId: string,
  options: { before?: number; revision?: string } = {},
): Promise<TimelinePage> {
  const empty: TimelinePage = {
    points: [],
    selectedId: null,
    before: null,
    hasNewer: false,
    unavailable: Boolean(options.revision),
  };
  const [stream] = await tx
    .select({ id: gradebookStreams.id })
    .from(gradebookStreams)
    .where(eq(gradebookStreams.userId, userId))
    .limit(1);
  if (!stream) return empty;
  let before = options.before;
  if (options.revision) {
    // Check ownership before reading payloads, even for direct links.
    const [selected] = await tx
      .select({ sequence: gradebookRevisions.sequence })
      .from(gradebookRevisions)
      .where(
        and(
          eq(gradebookRevisions.streamId, stream.id),
          eq(gradebookRevisions.id, options.revision),
        ),
      )
      .limit(1);
    if (!selected) return empty;
    before = selected.sequence + 1;
  }
  const metadata = await tx
    .select({
      id: gradebookRevisions.id,
      sequence: gradebookRevisions.sequence,
    })
    .from(gradebookRevisions)
    .where(
      and(
        eq(gradebookRevisions.streamId, stream.id),
        before === undefined
          ? undefined
          : lt(gradebookRevisions.sequence, before),
      ),
    )
    .orderBy(desc(gradebookRevisions.sequence))
    .limit(21);
  const selectedRows = metadata.slice(0, 20);
  if (!selectedRows.length) return empty;
  const newest = selectedRows[0].sequence;
  const oldest = selectedRows[selectedRows.length - 1].sequence;
  const rows = await readHistoryRange(
    tx,
    stream.id,
    Math.max(0, oldest - 1),
    newest,
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
        changes: previousState ? historyChanges(previousState, row.state) : [],
      };
    });
  const [latest] = await tx
    .select({ sequence: gradebookRevisions.sequence })
    .from(gradebookRevisions)
    .where(eq(gradebookRevisions.streamId, stream.id))
    .orderBy(desc(gradebookRevisions.sequence))
    .limit(1);
  return {
    points,
    selectedId: options.revision ?? selectedRows[0].id,
    before: metadata.length > 20 ? oldest : null,
    hasNewer: latest.sequence > newest,
    unavailable: false,
  };
}
