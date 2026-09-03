import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gradebookRevisions, gradebookStreams } from "@/lib/db/schema";
import { applyGradebookDelta } from "./apply-delta";
import { hashGradebook } from "./hash";
import { historyChanges } from "./history-changes";
import { calculateGradebook } from "./projection";
import { reconstructRows, revisionRowsThrough } from "./reconstruct";
import type { GradebookDelta, GradebookState } from "./types";

export async function revisionHistoryPage(
  userId: string,
  options: { before?: number; revision?: string },
) {
  const [stream] = await db
    .select({ id: gradebookStreams.id })
    .from(gradebookStreams)
    .where(eq(gradebookStreams.userId, userId))
    .limit(1);
  if (!stream) return { revisions: [], hasOlder: false, selected: null };
  const rows = await db
    .select({
      id: gradebookRevisions.id,
      sequence: gradebookRevisions.sequence,
      kind: gradebookRevisions.kind,
      observedAt: gradebookRevisions.observedAt,
    })
    .from(gradebookRevisions)
    .where(
      and(
        eq(gradebookRevisions.streamId, stream.id),
        options.before === undefined
          ? undefined
          : lt(gradebookRevisions.sequence, options.before),
      ),
    )
    .orderBy(desc(gradebookRevisions.sequence))
    .limit(21);
  const revisions = rows.slice(0, 20);
  const selectedId = options.revision ?? revisions[0]?.id;
  if (!selectedId)
    return { revisions, hasOlder: rows.length > 20, selected: null };
  // Ownership is checked before reading any revision payload, including direct links.
  const [selected] = await db
    .select({
      id: gradebookRevisions.id,
      sequence: gradebookRevisions.sequence,
      kind: gradebookRevisions.kind,
      observedAt: gradebookRevisions.observedAt,
    })
    .from(gradebookRevisions)
    .where(
      and(
        eq(gradebookRevisions.streamId, stream.id),
        eq(gradebookRevisions.id, selectedId),
      ),
    )
    .limit(1);
  if (!selected)
    return { revisions, hasOlder: rows.length > 20, selected: null };
  const chain = await revisionRowsThrough(stream.id, selected.sequence);
  const last = chain.at(-1);
  if (!last || last.id !== selected.id)
    throw new Error("REVISION_CHAIN_INCOMPLETE");
  const previous =
    chain.length > 1 ? reconstructRows(chain.slice(0, -1)) : null;
  const state =
    last.kind === "initial"
      ? (last.data as GradebookState)
      : previous
        ? applyGradebookDelta(previous, last.data as GradebookDelta)
        : null;
  if (!state || hashGradebook(state) !== last.stateHash)
    throw new Error("REVISION_INTEGRITY_CHECK_FAILED");
  return {
    revisions,
    hasOlder: rows.length > 20,
    selected: {
      ...selected,
      changes: previous ? historyChanges(previous, state) : [],
      calculated: calculateGradebook(state),
      previousCalculated: previous ? calculateGradebook(previous) : null,
    },
  };
}
