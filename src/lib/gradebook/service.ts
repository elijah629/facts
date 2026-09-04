import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  gradebookHeads,
  gradebookRevisions,
  gradebookStreams,
} from "@/lib/db/schema";
import { diffGradebooks } from "./diff";
import { calculateGradebook, reportProjection } from "./projection";
import {
  readHistoryRange,
  reconstructAt,
  reconstructRevision,
} from "./reconstruct";
import { syncGradebook } from "./sync";

export async function currentGradebook(userId: string) {
  const sync = await syncGradebook(userId);
  if (!sync.revisionId || !sync.state) {
    return { sync, state: null, report: null, calculated: null };
  }
  const state = sync.state;
  return {
    sync,
    state,
    report: reportProjection(state),
    calculated: calculateGradebook(state),
  };
}

export async function historicalGradebook(
  userId: string,
  selector: { revisionId?: string; timestamp?: Date },
) {
  const [stream] = await db
    .select({ id: gradebookStreams.id })
    .from(gradebookStreams)
    .where(eq(gradebookStreams.userId, userId))
    .limit(1);
  if (!stream) throw new Error("GRADEBOOK_NOT_FOUND");
  if (selector.revisionId) {
    const [owned] = await db
      .select({ id: gradebookRevisions.id })
      .from(gradebookRevisions)
      .where(
        and(
          eq(gradebookRevisions.id, selector.revisionId),
          eq(gradebookRevisions.streamId, stream.id),
        ),
      )
      .limit(1);
    if (!owned) throw new Error("REVISION_NOT_FOUND");
  }
  const state = selector.revisionId
    ? await reconstructRevision(selector.revisionId)
    : await reconstructAt(stream.id, selector.timestamp ?? new Date());
  return { state, calculated: calculateGradebook(state) };
}

export async function gradeHistory(userId: string) {
  const [stream] = await db
    .select({ id: gradebookStreams.id })
    .from(gradebookStreams)
    .where(eq(gradebookStreams.userId, userId))
    .limit(1);
  if (!stream) return [];
  return db.transaction(
    async (tx) => {
      const rows = await readHistoryRange(tx, stream.id);
      return rows.map((revision, index) => ({
        ...revision,
        data:
          index === 0
            ? revision.state
            : diffGradebooks(rows[index - 1].state, revision.state),
        calculated: calculateGradebook(revision.state),
      }));
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function syncStatus(userId: string) {
  const [row] = await db
    .select({
      streamId: gradebookStreams.id,
      revisionId: gradebookHeads.headRevisionId,
      lastAttempt: gradebookHeads.lastAttemptAt,
      lastSuccessfulFactsFetch: gradebookHeads.lastSuccessfulFetchAt,
      errorCode: gradebookHeads.lastErrorCode,
      errorMessage: gradebookHeads.lastErrorMessage,
    })
    .from(gradebookStreams)
    .leftJoin(gradebookHeads, eq(gradebookHeads.streamId, gradebookStreams.id))
    .where(eq(gradebookStreams.userId, userId))
    .limit(1);
  return row
    ? { ...row, stale: Boolean(row.errorCode) }
    : {
        streamId: null,
        revisionId: null,
        lastAttempt: null,
        lastSuccessfulFactsFetch: null,
        errorCode: null,
        errorMessage: null,
        stale: true,
      };
}
