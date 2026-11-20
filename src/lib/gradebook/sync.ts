import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { databaseRead } from "@/lib/db/read";
import {
  gradebookHeads,
  gradebookRevisions,
  gradebookStreams,
} from "@/lib/db/schema";
import { fetchFactsReport } from "@/lib/facts/fetch-report";
import {
  validateFactsHtml,
  validateParsedReport,
} from "@/lib/facts/validate-report";
import { findFactsReportCandidates } from "@/lib/gmail/find-report";
import { parseReportFromHtml } from "@/lib/report/parser";
import { decryptSource, encryptSource } from "@/lib/security/source-encryption";
import type { Report } from "@/types/report";
import { applyGradebookDelta } from "./apply-delta";
import { canonicalizeReport } from "./canonicalize";
import { diffGradebooks } from "./diff";
import { hashGradebook } from "./hash";
import { packGradebook, unpackGradebook } from "./packed";
import { readHistoryRange } from "./reconstruct";
import { schoolRankProjection } from "./school-rank-projection";
import type { GradebookDelta, GradebookState } from "./types";

const DAY = 24 * 60 * 60 * 1_000;

export interface SyncResult {
  streamId: string;
  revisionId: string | null;
  stateHash: string | null;
  changed: boolean;
  stale: boolean;
  state: GradebookState | null;
  lastSuccessfulFactsFetch: Date | null;
  errorCode?: string;
  delta: GradebookDelta | null;
  previousState: GradebookState | null;
  observedAt: Date | null;
}

interface ResolvedReport {
  report: Report;
  scannedGmail: boolean;
  reportUrl: string;
  source?: { url: string; messageId: string; receivedAt: Date };
}

function safeError(error: unknown): { code: string; message: string } {
  const raw = error instanceof Error ? error.message : "SYNC_FAILED";
  const code = /^[A-Z0-9_]+$/.test(raw) ? raw : "SYNC_FAILED";
  const messages: Record<string, string> = {
    GOOGLE_ACCOUNT_NOT_CONNECTED: "Google account is not connected.",
    GOOGLE_AUTHORIZATION_UNAVAILABLE: "Google authorization is unavailable.",
    GMAIL_API_DISABLED: "Gmail API is disabled for this Google Cloud project.",
    GMAIL_SCOPE_MISSING: "Gmail permission is missing.",
    GMAIL_DOMAIN_BLOCKED: "Google Workspace blocked Gmail access.",
    GMAIL_RATE_LIMITED: "Gmail temporarily rate-limited synchronization.",
    GMAIL_API_FORBIDDEN: "Google denied Gmail access.",
    FACTS_REPORT_EXPIRED_OR_INVALID: "FACTS report link expired or is invalid.",
    FACTS_REPORT_STRUCTURE_INVALID: "FACTS returned an invalid report.",
    NO_USABLE_FACTS_REPORT_FOUND: "No usable FACTS report was found in Gmail.",
  };
  return {
    code,
    message: messages[code] ?? "Gradebook synchronization failed.",
  };
}

async function readHead(userId: string) {
  const [row] = await databaseRead(() =>
    db
      .select({
        streamId: gradebookHeads.streamId,
        storageFormat: gradebookStreams.storageFormat,
        revisionId: gradebookHeads.headRevisionId,
        stateHash: gradebookHeads.headStateHash,
        state: gradebookHeads.currentState,
        encryptedUrl: gradebookHeads.encryptedActiveFactsUrl,
        sourceMessageId: gradebookHeads.activeSourceMessageId,
        sourceReceivedAt: gradebookHeads.activeSourceEmailReceivedAt,
        lastSuccessfulFactsFetch: gradebookHeads.lastSuccessfulFetchAt,
        errorCode: gradebookHeads.lastErrorCode,
        delta: sql<GradebookDelta | null>`case when ${gradebookRevisions.kind} = 'delta' then ${gradebookRevisions.data} end`,
        packedDelta: gradebookRevisions.packedDelta,
        observedAt: gradebookRevisions.observedAt,
      })
      .from(gradebookStreams)
      .innerJoin(
        gradebookHeads,
        eq(gradebookHeads.streamId, gradebookStreams.id),
      )
      .leftJoin(
        gradebookRevisions,
        eq(gradebookRevisions.id, gradebookHeads.headRevisionId),
      )
      .where(eq(gradebookStreams.userId, userId))
      .limit(1),
  );
  return row;
}

function headResult(
  head: NonNullable<Awaited<ReturnType<typeof readHead>>>,
): SyncResult {
  const storedDelta = head.packedDelta
    ? unpackGradebook<GradebookDelta>(head.packedDelta)
    : head.delta;
  const previousState =
    storedDelta && head.state && head.storageFormat === "reverse-v1"
      ? applyGradebookDelta(head.state, storedDelta)
      : null;
  const delta =
    previousState && head.state
      ? diffGradebooks(previousState, head.state)
      : storedDelta;
  return {
    streamId: head.streamId,
    revisionId: head.revisionId,
    stateHash: head.stateHash,
    state: head.state,
    changed: false,
    stale: Boolean(head.errorCode),
    errorCode: head.errorCode ?? undefined,
    lastSuccessfulFactsFetch: head.lastSuccessfulFactsFetch,
    delta,
    previousState,
    observedAt: head.observedAt,
  };
}

async function savedGradebookHead(userId: string) {
  const head = await readHead(userId);
  return head ? headResult(head) : null;
}

async function ensureHead(userId: string) {
  const head = await readHead(userId);
  if (head) return head;
  await db.transaction(async (tx) => {
    await tx
      .insert(gradebookStreams)
      .values({ userId, storageFormat: "reverse-v1" })
      .onConflictDoNothing();
    await tx.execute(sql`
      insert into ${gradebookHeads} (stream_id)
      select id from ${gradebookStreams} where user_id = ${userId}
      on conflict do nothing
    `);
  });
  const created = await readHead(userId);
  if (!created) throw new Error("STREAM_CREATE_FAILED");
  return created;
}

async function fetchReport(url: string) {
  const html = await fetchFactsReport(url);
  validateFactsHtml(html);
  const report = parseReportFromHtml(html);
  validateParsedReport(report);
  return report;
}

async function resolveReport(
  userId: string,
  head: NonNullable<Awaited<ReturnType<typeof readHead>>>,
  discoverNewSource: boolean,
): Promise<ResolvedReport> {
  const tried = new Set<string>();
  let scannedGmail = false;
  async function discover(newerThan?: Date | null) {
    for await (const source of findFactsReportCandidates(userId, newerThan)) {
      if (tried.has(source.url)) continue;
      tried.add(source.url);
      try {
        return {
          report: await fetchReport(source.url),
          reportUrl: source.url,
          source,
          scannedGmail: true,
        };
      } catch {
        // Another report link may still be valid.
      }
    }
    scannedGmail = true;
    return null;
  }

  if (head.encryptedUrl) {
    const url = decryptSource(head.encryptedUrl);
    if (discoverNewSource) {
      tried.add(url);
      const found = await discover(head.sourceReceivedAt).catch(() => null);
      if (found) return found;
    }
    tried.add(url);
    try {
      return { report: await fetchReport(url), reportUrl: url, scannedGmail };
    } catch {
      // A replacement email may exist even when the saved link has expired.
    }
  }

  const found = await discover();
  if (found) return found;
  throw new Error("NO_USABLE_FACTS_REPORT_FOUND");
}

function attemptIsCurrent(streamId: string, attemptedAt: Date) {
  return and(
    eq(gradebookHeads.streamId, streamId),
    or(
      isNull(gradebookHeads.lastAttemptAt),
      lte(gradebookHeads.lastAttemptAt, attemptedAt),
    ),
  );
}

async function performSync(
  userId: string,
  discoverNewSource: boolean,
): Promise<SyncResult> {
  const attemptedAt = new Date();
  const head = await ensureHead(userId);
  const previous = headResult(head);

  try {
    const resolved = await resolveReport(userId, head, discoverNewSource);
    const observedAt = new Date();
    const next = canonicalizeReport(resolved.report, head.state ?? undefined);
    const stateHash = hashGradebook(next);
    const source = resolved.source;
    const changedSource =
      source &&
      (source.messageId !== head.sourceMessageId ||
        source.url !==
          (head.encryptedUrl ? decryptSource(head.encryptedUrl) : null));
    const status = {
      ...schoolRankProjection(resolved.report, resolved.reportUrl),
      lastAttemptAt: attemptedAt,
      lastSuccessfulFetchAt: observedAt,
      lastErrorCode: null,
      lastErrorMessage: null,
      ...(resolved.scannedGmail ? { lastGmailScanAt: observedAt } : {}),
      ...(changedSource
        ? {
            encryptedActiveFactsUrl: encryptSource(source.url),
            activeSourceMessageId: source.messageId,
            activeSourceEmailReceivedAt: source.receivedAt,
            activeSourceDiscoveredAt: observedAt,
          }
        : {}),
      updatedAt: observedAt,
    };

    if (stateHash === head.stateHash) {
      const updated = await db
        .update(gradebookHeads)
        .set(status)
        .where(
          and(
            attemptIsCurrent(head.streamId, attemptedAt),
            eq(gradebookHeads.headStateHash, stateHash),
          ),
        );
      if (!updated.rowCount)
        return (await savedGradebookHead(userId)) ?? previous;
      return {
        ...previous,
        stale: false,
        errorCode: undefined,
        lastSuccessfulFactsFetch: observedAt,
      };
    }

    const result = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({
          revisionId: gradebookHeads.headRevisionId,
          stateHash: gradebookHeads.headStateHash,
          sequence: gradebookHeads.headSequence,
          state: gradebookHeads.currentState,
          sourceMessageId: gradebookHeads.activeSourceMessageId,
          sourceReceivedAt: gradebookHeads.activeSourceEmailReceivedAt,
        })
        .from(gradebookHeads)
        .where(attemptIsCurrent(head.streamId, attemptedAt))
        .for("update");
      if (!locked) return null;

      const observedSourceDate = source?.receivedAt ?? head.sourceReceivedAt;
      if (
        locked.sourceReceivedAt &&
        (!observedSourceDate || locked.sourceReceivedAt > observedSourceDate) &&
        locked.sourceMessageId !== head.sourceMessageId
      )
        return null;

      const lockedNext =
        locked.stateHash === head.stateHash
          ? next
          : canonicalizeReport(resolved.report, locked.state ?? undefined);
      const lockedHash =
        lockedNext === next ? stateHash : hashGradebook(lockedNext);
      if (lockedHash === locked.stateHash) {
        await tx
          .update(gradebookHeads)
          .set(status)
          .where(eq(gradebookHeads.streamId, head.streamId));
        return null;
      }

      const sourceMessageId = source?.messageId ?? locked.sourceMessageId;
      const sourceEmailReceivedAt =
        source?.receivedAt ?? locked.sourceReceivedAt;
      const revisionFields = {
        stateHash: lockedHash,
        observedAt,
        sourceMessageId,
        sourceEmailReceivedAt,
      };
      const [stream] = await tx
        .select({ format: gradebookStreams.storageFormat })
        .from(gradebookStreams)
        .where(eq(gradebookStreams.id, head.streamId));
      const reverse = stream.format === "reverse-v1";
      const [dailyHead] =
        locked.revisionId && locked.state
          ? await tx
              .select({
                startedAt: gradebookRevisions.windowStartedAt,
                data: gradebookRevisions.data,
                packedDelta: gradebookRevisions.packedDelta,
              })
              .from(gradebookRevisions)
              .where(eq(gradebookRevisions.id, locked.revisionId))
          : [];
      const replace =
        dailyHead?.startedAt != null &&
        observedAt.getTime() - dailyHead.startedAt.getTime() < DAY;
      let base = locked.state;
      if (replace && base && dailyHead) {
        if (reverse) {
          const inverse = dailyHead.packedDelta
            ? unpackGradebook<GradebookDelta>(dailyHead.packedDelta)
            : (dailyHead.data as GradebookDelta | null);
          if (!inverse) throw new Error("REVISION_CHAIN_INCOMPLETE");
          base = applyGradebookDelta(base, inverse);
        } else {
          const [baseline] = await readHistoryRange(
            tx,
            head.streamId,
            locked.sequence - 1,
            locked.sequence - 1,
          );
          if (!baseline) throw new Error("REVISION_CHAIN_INCOMPLETE");
          base = baseline.state;
        }
      }
      const delta = base ? diffGradebooks(base, lockedNext) : null;
      const packedDelta =
        delta && base
          ? packGradebook(reverse ? diffGradebooks(lockedNext, base) : delta)
          : null;
      const sequence = replace ? locked.sequence : locked.sequence + 1;
      let revisionId = locked.revisionId;

      if (replace && revisionId) {
        await tx
          .update(gradebookRevisions)
          .set({ ...revisionFields, data: null, packedDelta })
          .where(eq(gradebookRevisions.id, revisionId));
      } else {
        const [revision] = await tx
          .insert(gradebookRevisions)
          .values({
            ...revisionFields,
            streamId: head.streamId,
            sequence,
            kind: delta ? "delta" : "initial",
            data: !delta && !reverse ? lockedNext : null,
            packedDelta,
            windowStartedAt: delta ? observedAt : null,
          })
          .returning({ id: gradebookRevisions.id });
        revisionId = revision.id;
      }

      await tx
        .update(gradebookHeads)
        .set({
          ...status,
          headRevisionId: revisionId,
          headStateHash: lockedHash,
          headSequence: sequence,
          currentState: lockedNext,
        })
        .where(eq(gradebookHeads.streamId, head.streamId));

      return {
        streamId: head.streamId,
        revisionId,
        stateHash: lockedHash,
        changed: true,
        stale: false,
        state: lockedNext,
        lastSuccessfulFactsFetch: observedAt,
        delta,
        previousState: base,
        observedAt,
      };
    });
    return result ?? (await savedGradebookHead(userId)) ?? previous;
  } catch (error) {
    const safe = safeError(error);
    const updated = await db
      .update(gradebookHeads)
      .set({
        lastAttemptAt: attemptedAt,
        lastErrorCode: safe.code,
        lastErrorMessage: safe.message,
        updatedAt: new Date(),
      })
      .where(
        and(
          attemptIsCurrent(head.streamId, attemptedAt),
          head.stateHash
            ? eq(gradebookHeads.headStateHash, head.stateHash)
            : isNull(gradebookHeads.headStateHash),
        ),
      );
    if (!updated.rowCount)
      return (await savedGradebookHead(userId)) ?? previous;
    return { ...previous, stale: true, errorCode: safe.code };
  }
}

// Share overlapping live requests on the same instance. The database row lock
// also serializes revision writes when requests land on separate instances.
const inFlight = new Map<string, Promise<SyncResult>>();

export function syncGradebook(
  userId: string,
  options: { discoverNewSource?: boolean } = {},
) {
  const current = inFlight.get(userId);
  if (current) return current;
  const pending = performSync(
    userId,
    options.discoverNewSource === true,
  ).finally(() => {
    inFlight.delete(userId);
  });
  inFlight.set(userId, pending);
  return pending;
}
