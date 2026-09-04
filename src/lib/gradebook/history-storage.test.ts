import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { canonicalizeReport, reportFromCanonical } from "./canonicalize";
import { diffGradebooks } from "./diff";
import { hashGradebook } from "./hash";
import { convertHistory, type RevisionRow } from "./history-chain";
import { state } from "./history-fixture";
import type { HistoryTransaction } from "./reconstruct";

// The app pool is never queried: all reads below use the isolated Postgres engine.
process.env.DATABASE_URL ??= "postgresql://test:test@example.neon.tech/test";
const { readHistoryRange } = await import("./reconstruct");
const { historyPageInTransaction, timelineGrades } = await import(
  "./history-view"
);
const engine = new PGlite();
const database = drizzle(engine, { schema });
const streamId = crypto.randomUUID();
const foreignStream = crypto.randomUUID();
const foreignRevision = crypto.randomUUID();
const states = Array.from({ length: 30 }, (_, index) => {
  const current = state();
  current.classes.chemistry.assignments.a1.earned = String(20 + index);
  return current;
});
const rows: RevisionRow[] = states.map((current, index) => ({
  id: crypto.randomUUID(),
  sequence: index,
  kind: index ? "delta" : "initial",
  data: index ? diffGradebooks(states[index - 1], current) : current,
  observedAt: new Date(1788480000000 + index * 1000),
  stateHash: hashGradebook(current),
}));
const head = {
  currentState: states[states.length - 1],
  headSequence: 29,
  headStateHash: rows[rows.length - 1].stateHash,
  headRevisionId: rows[rows.length - 1].id,
};

beforeAll(async () => {
  await engine.exec(
    await Bun.file(
      `${import.meta.dir}/../../../drizzle/0000_amusing_bucky.sql`,
    ).text(),
  );
  await engine.exec(
    await Bun.file(
      `${import.meta.dir}/../../../drizzle/0001_reverse_history.sql`,
    ).text(),
  );
  await database.insert(schema.user).values([
    { id: "owner", name: "Test owner", email: "owner@example.test" },
    { id: "other", name: "Test other", email: "other@example.test" },
  ]);
  await database.insert(schema.gradebookStreams).values([
    { id: streamId, userId: "owner" },
    { id: foreignStream, userId: "other" },
  ]);
  await database
    .insert(schema.gradebookRevisions)
    .values(rows.map((row) => ({ ...row, streamId })));
  await database.insert(schema.gradebookHeads).values({ ...head, streamId });
  await database
    .insert(schema.gradebookRevisions)
    .values({ ...rows[0], id: foreignRevision, streamId: foreignStream });
  await database.insert(schema.gradebookHeads).values({
    streamId: foreignStream,
    currentState: states[0],
    headSequence: 0,
    headStateHash: rows[0].stateHash,
    headRevisionId: foreignRevision,
  });
});
afterAll(async () => {
  await engine.close();
});
function transaction<T>(fn: (tx: HistoryTransaction) => Promise<T>) {
  return database.transaction((tx) => fn(tx as unknown as HistoryTransaction));
}
async function changeFormat(target: "forward-v1" | "reverse-v1", fail = false) {
  return transaction(async (tx) => {
    const [stream] = await tx
      .select()
      .from(schema.gradebookStreams)
      .where(eq(schema.gradebookStreams.id, streamId));
    const saved = await tx
      .select()
      .from(schema.gradebookRevisions)
      .where(eq(schema.gradebookRevisions.streamId, streamId));
    const converted = convertHistory(saved, stream.storageFormat, head, target);
    for (const row of converted)
      await tx
        .update(schema.gradebookRevisions)
        .set({ data: row.data })
        .where(eq(schema.gradebookRevisions.id, row.id));
    await tx
      .update(schema.gradebookStreams)
      .set({ storageFormat: target })
      .where(eq(schema.gradebookStreams.id, streamId));
    if (fail) throw new Error("SIMULATED_MIGRATION_FAILURE");
  });
}

describe("history storage and authenticated timeline queries", () => {
  test("real schema migrations preserve legacy storage and bounded pages", async () => {
    const page = await transaction((tx) =>
      historyPageInTransaction(tx, "owner"),
    );
    expect(page.points).toHaveLength(20);
    expect(page.points[0].sequence).toBe(10);
    expect(page.before).toBe(10);
    expect(page.selectedId).toBe(rows[29].id);
    expect(page.points[0].previousGrades).not.toBeNull();
    expect(page.points[0].changes).toHaveLength(1);
    expect(page.points[0]).not.toHaveProperty("state");
    expect(page.points[0]).not.toHaveProperty("data");
    const older = await transaction((tx) =>
      historyPageInTransaction(tx, "owner", { before: 10 }),
    );
    expect(older.points).toHaveLength(10);
    expect(older.before).toBeNull();
    expect(older.points[0].changes).toEqual([]);
    expect(older.points[0].previousGrades).toBeNull();
  });

  test("rollback leaves the original chain and format intact", async () => {
    await expect(changeFormat("reverse-v1", true)).rejects.toThrow(
      "SIMULATED_MIGRATION_FAILURE",
    );
    const [stream] = await database
      .select()
      .from(schema.gradebookStreams)
      .where(eq(schema.gradebookStreams.id, streamId));
    expect(stream.storageFormat).toBe("forward-v1");
    const [first] = await database
      .select()
      .from(schema.gradebookRevisions)
      .where(eq(schema.gradebookRevisions.id, rows[0].id));
    expect(first.data).toEqual(states[0]);
  });

  test("migration preserves every version and timeline, and is restartable", async () => {
    const oldPage = await transaction((tx) =>
      historyPageInTransaction(tx, "owner"),
    );
    await changeFormat("reverse-v1");
    await changeFormat("reverse-v1");
    expect(
      await transaction((tx) => historyPageInTransaction(tx, "owner")),
    ).toEqual(oldPage);
    const restored = await transaction((tx) => readHistoryRange(tx, streamId));
    expect(restored.map((row) => row.state)).toEqual(states);
    const [first] = await database
      .select()
      .from(schema.gradebookRevisions)
      .where(eq(schema.gradebookRevisions.id, rows[0].id));
    expect(first.data).toBeNull();
  });

  test("latest ignores corrupt old payloads; historical reads detect them", async () => {
    const [saved] = await database
      .select()
      .from(schema.gradebookRevisions)
      .where(eq(schema.gradebookRevisions.id, rows[2].id));
    await database
      .update(schema.gradebookRevisions)
      .set({ data: null })
      .where(eq(schema.gradebookRevisions.id, rows[2].id));
    try {
      expect(
        (await transaction((tx) => readHistoryRange(tx, streamId, 29, 29)))[0]
          .state,
      ).toEqual(states[29]);
      await expect(
        transaction((tx) => readHistoryRange(tx, streamId, 0, 29)),
      ).rejects.toThrow("REVISION_CHAIN_INCOMPLETE");
    } finally {
      await database
        .update(schema.gradebookRevisions)
        .set({ data: saved.data })
        .where(eq(schema.gradebookRevisions.id, saved.id));
    }
  });

  test("direct links and absent users never expose another stream", async () => {
    expect(
      (
        await transaction((tx) =>
          historyPageInTransaction(tx, "owner", { revision: foreignRevision }),
        )
      ).unavailable,
    ).toBe(true);
    expect(
      (await transaction((tx) => historyPageInTransaction(tx, "nobody")))
        .points,
    ).toEqual([]);
    const page = await transaction((tx) =>
      historyPageInTransaction(tx, "owner", { revision: rows[12].id }),
    );
    expect(page.selectedId).toBe(rows[12].id);
    expect(page.hasNewer).toBe(true);
    expect(page.points.at(-1)?.sequence).toBe(12);
    const foreign = await database
      .select()
      .from(schema.gradebookStreams)
      .where(
        and(
          eq(schema.gradebookStreams.id, foreignStream),
          eq(schema.gradebookStreams.userId, "other"),
        ),
      );
    expect(foreign[0].storageFormat).toBe("forward-v1");
  });

  test("GPA points respect weighting and leave absent grades empty", () => {
    const current = state();
    current.classes.chemistry.displayName = "AP Chemistry";
    const weighted = timelineGrades(current);
    expect(weighted.gpa).toBe(4.3);
    expect(weighted.unweightedGpa).toBe(3.3);
    current.classes.chemistry.assignments = {};
    expect(timelineGrades(current).gpa).toBeNull();
    current.classes = {};
    expect(timelineGrades(current).gpa).toBeNull();
  });

  test("due-date edits retain unambiguous assignment identity", () => {
    const previous = state();
    const report = reportFromCanonical(previous);
    const baseline = canonicalizeReport(report);
    report.classes[0].sections[0].assignments[0].due = new Date(
      "2026-09-06T00:00:00Z",
    );
    const next = canonicalizeReport(report, baseline);
    const classId = Object.keys(baseline.classes)[0];
    expect(Object.keys(next.classes[classId].assignments)).toEqual(
      Object.keys(baseline.classes[classId].assignments),
    );
  });
  test("repeated assignment names do not steal an existing assignment ID", () => {
    const previous = canonicalizeReport(reportFromCanonical(state()));
    const report = reportFromCanonical(previous);
    const section = report.classes[0].sections[0];
    section.assignments.unshift({
      ...section.assignments[0],
      due: new Date("2026-09-06T00:00:00Z"),
    });
    const next = canonicalizeReport(report, previous);
    const classId = Object.keys(previous.classes)[0];
    const originalId = Object.keys(previous.classes[classId].assignments)[0];
    expect(Object.keys(next.classes[classId].assignments)).toHaveLength(2);
    expect(next.classes[classId].assignments[originalId].dueDate).toBe(
      previous.classes[classId].assignments[originalId].dueDate,
    );
  });
});
