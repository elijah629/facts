import { and, asc, desc, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gradebookRevisions } from "@/lib/db/schema";
import { applyGradebookDelta } from "./apply-delta";
import type { GradebookDelta, GradebookState } from "./types";

export interface RevisionRow {
  id: string;
  sequence: number;
  kind: "initial" | "delta";
  data: GradebookState | GradebookDelta;
  observedAt: Date;
  stateHash: string;
  sourceEmailReceivedAt?: Date | null;
}

export function reconstructRows(rows: RevisionRow[]): GradebookState {
  let state: GradebookState | undefined;
  for (const revision of rows) {
    if (revision.kind === "initial") {
      state = structuredClone(revision.data as GradebookState);
    } else {
      if (!state) throw new Error("REVISION_CHAIN_MISSING_INITIAL_STATE");
      state = applyGradebookDelta(state, revision.data as GradebookDelta);
    }
  }
  if (!state) throw new Error("GRADEBOOK_HAS_NO_REVISIONS");
  return state;
}

export function reconstructHistoryRows(
  rows: RevisionRow[],
): Array<RevisionRow & { state: GradebookState }> {
  let state: GradebookState | undefined;
  return rows.map((revision) => {
    if (revision.kind === "initial") {
      state = structuredClone(revision.data as GradebookState);
    } else {
      if (!state) throw new Error("REVISION_CHAIN_MISSING_INITIAL_STATE");
      state = applyGradebookDelta(state, revision.data as GradebookDelta);
    }
    return { ...revision, state: structuredClone(state) };
  });
}

export async function revisionRowsThrough(
  streamId: string,
  sequence?: number,
): Promise<RevisionRow[]> {
  return db
    .select({
      id: gradebookRevisions.id,
      sequence: gradebookRevisions.sequence,
      kind: gradebookRevisions.kind,
      data: gradebookRevisions.data,
      observedAt: gradebookRevisions.observedAt,
      stateHash: gradebookRevisions.stateHash,
      sourceEmailReceivedAt: gradebookRevisions.sourceEmailReceivedAt,
    })
    .from(gradebookRevisions)
    .where(
      sequence === undefined
        ? eq(gradebookRevisions.streamId, streamId)
        : and(
            eq(gradebookRevisions.streamId, streamId),
            lte(gradebookRevisions.sequence, sequence),
          ),
    )
    .orderBy(asc(gradebookRevisions.sequence));
}

export async function reconstructRevision(
  revisionId: string,
): Promise<GradebookState> {
  const [revision] = await db
    .select({
      streamId: gradebookRevisions.streamId,
      sequence: gradebookRevisions.sequence,
    })
    .from(gradebookRevisions)
    .where(eq(gradebookRevisions.id, revisionId))
    .limit(1);
  if (!revision) throw new Error("REVISION_NOT_FOUND");
  return reconstructRows(
    await revisionRowsThrough(revision.streamId, revision.sequence),
  );
}

export async function reconstructLatest(
  streamId: string,
): Promise<GradebookState> {
  return reconstructRows(await revisionRowsThrough(streamId));
}

export async function reconstructAt(
  streamId: string,
  timestamp: Date,
): Promise<GradebookState> {
  const [revision] = await db
    .select({ sequence: gradebookRevisions.sequence })
    .from(gradebookRevisions)
    .where(
      and(
        eq(gradebookRevisions.streamId, streamId),
        lte(gradebookRevisions.observedAt, timestamp),
      ),
    )
    .orderBy(
      desc(gradebookRevisions.observedAt),
      desc(gradebookRevisions.sequence),
    )
    .limit(1);
  if (!revision) throw new Error("REVISION_NOT_FOUND_AT_TIMESTAMP");
  return reconstructRows(
    await revisionRowsThrough(streamId, revision.sequence),
  );
}
