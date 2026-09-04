import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  gradebookHeads,
  gradebookRevisions,
  gradebookStreams,
} from "@/lib/db/schema";
import { type RevisionRow, walkHistory } from "./history-chain";
import type { GradebookState } from "./types";

export type { RevisionRow } from "./history-chain";
export type HistoryTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export function reconstructRows(rows: RevisionRow[]): GradebookState {
  let state: GradebookState | undefined;
  walkHistory(rows, "forward-v1", null, (_, current) => {
    state = current;
  });
  if (!state) throw new Error("GRADEBOOK_HAS_NO_REVISIONS");
  return state;
}

export function reconstructHistoryRows(rows: RevisionRow[]) {
  const result: Array<RevisionRow & { state: GradebookState }> = [];
  walkHistory(rows, "forward-v1", null, (row, state) =>
    result.push({ ...row, state }),
  );
  return result;
}

// Use within a repeatable-read transaction so sync cannot mix head and delta versions.
export async function readHistoryRange(
  tx: HistoryTransaction,
  streamId: string,
  from = 0,
  to?: number,
) {
  const [stream] = await tx
    .select()
    .from(gradebookStreams)
    .where(eq(gradebookStreams.id, streamId));
  const [head] = await tx
    .select()
    .from(gradebookHeads)
    .where(eq(gradebookHeads.streamId, streamId));
  if (!stream || !head || head.headSequence < 0) return [];
  const upper = Math.min(to ?? head.headSequence, head.headSequence);
  if (from > upper) return [];
  const reverse = stream.storageFormat === "reverse-v1";
  const rows = await tx
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
      and(
        eq(gradebookRevisions.streamId, streamId),
        reverse ? gte(gradebookRevisions.sequence, from) : undefined,
        lte(gradebookRevisions.sequence, reverse ? head.headSequence : upper),
      ),
    )
    .orderBy(
      reverse
        ? desc(gradebookRevisions.sequence)
        : asc(gradebookRevisions.sequence),
    );
  const result: Array<RevisionRow & { state: GradebookState }> = [];
  walkHistory(rows, stream.storageFormat, head, (row, state) => {
    if (row.sequence >= from && row.sequence <= upper)
      result.push({ ...row, state });
  });
  if (result.length !== upper - from + 1)
    throw new Error("REVISION_CHAIN_INCOMPLETE");
  return result.sort((a, b) => a.sequence - b.sequence);
}

export async function reconstructRevision(
  revisionId: string,
): Promise<GradebookState> {
  return db.transaction(
    async (tx) => {
      const [row] = await tx
        .select()
        .from(gradebookRevisions)
        .where(eq(gradebookRevisions.id, revisionId));
      if (!row) throw new Error("REVISION_NOT_FOUND");
      const [result] = await readHistoryRange(
        tx,
        row.streamId,
        row.sequence,
        row.sequence,
      );
      if (!result) throw new Error("REVISION_NOT_FOUND");
      return result.state;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function reconstructLatest(
  streamId: string,
): Promise<GradebookState> {
  return db.transaction(
    async (tx) => {
      const [head] = await tx
        .select()
        .from(gradebookHeads)
        .where(eq(gradebookHeads.streamId, streamId));
      if (!head) throw new Error("GRADEBOOK_HAS_NO_REVISIONS");
      const [result] = await readHistoryRange(tx, streamId, head.headSequence);
      if (!result) throw new Error("GRADEBOOK_HAS_NO_REVISIONS");
      return result.state;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function reconstructAt(
  streamId: string,
  timestamp: Date,
): Promise<GradebookState> {
  return db.transaction(
    async (tx) => {
      const [row] = await tx
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
      if (!row) throw new Error("REVISION_NOT_FOUND_AT_TIMESTAMP");
      const [result] = await readHistoryRange(
        tx,
        streamId,
        row.sequence,
        row.sequence,
      );
      if (!result) throw new Error("REVISION_NOT_FOUND_AT_TIMESTAMP");
      return result.state;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
