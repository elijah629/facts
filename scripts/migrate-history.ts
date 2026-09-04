import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { neonDatabaseUrl } from "../src/lib/env";
import {
  convertHistory,
  type HistoryFormat,
  type HistoryHead,
  type RevisionRow,
} from "../src/lib/gradebook/history-chain";

loadEnvConfig(process.cwd());
const args = new Set(process.argv.slice(2));
const allowed = new Set(["--apply", "--dry-run", "--to-forward"]);
if (
  [...args].some((arg) => !allowed.has(arg)) ||
  (args.has("--apply") && args.has("--dry-run"))
) {
  console.error(
    "Usage: bun scripts/migrate-history.ts [--dry-run | --apply] [--to-forward]",
  );
  process.exit(1);
}
const apply = args.has("--apply");
const target: HistoryFormat = args.has("--to-forward")
  ? "forward-v1"
  : "reverse-v1";

async function migrate() {
  const name = process.env.DATABASE_URL_UNPOOLED
    ? "DATABASE_URL_UNPOOLED"
    : "DATABASE_URL";
  if (!process.env[name]) throw new Error("DATABASE_NOT_CONFIGURED");
  const client = new Client({
    connectionString: neonDatabaseUrl(name),
    connectionTimeoutMillis: 10_000,
  });
  let converted = 0;
  let beforeBytes = 0;
  let afterBytes = 0;
  try {
    await client.connect();
    // IDs only; never log user identities or grade data.
    const streams = await client.query<{ id: string }>(
      "SELECT id FROM gradebook_streams WHERE storage_format <> $1 ORDER BY id",
      [target],
    );
    for (const { id } of streams.rows) {
      try {
        // Share the sync writer's lock. Read format only after acquiring it.
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query("SET LOCAL statement_timeout = '60s'");
        const headResult = await client.query<HistoryHead>(
          `SELECT current_state AS "currentState", head_sequence AS "headSequence", head_state_hash AS "headStateHash", head_revision_id AS "headRevisionId" FROM gradebook_heads WHERE stream_id = $1 FOR UPDATE`,
          [id],
        );
        const formatResult = await client.query<{
          storage_format: HistoryFormat;
        }>(
          "SELECT storage_format FROM gradebook_streams WHERE id = $1 FOR UPDATE",
          [id],
        );
        const format = formatResult.rows[0]?.storage_format;
        if (!format || format === target) {
          await client.query("ROLLBACK");
          continue;
        }
        const { rows } = await client.query<RevisionRow>(
          `SELECT id, sequence, kind, data, state_hash AS "stateHash", observed_at AS "observedAt" FROM gradebook_revisions WHERE stream_id = $1 ORDER BY sequence`,
          [id],
        );
        const head = headResult.rows[0];
        if (rows.length && !head) throw new Error("REVISION_CHAIN_INCOMPLETE");
        if (
          !rows.length &&
          head &&
          (head.headSequence !== -1 ||
            head.currentState !== null ||
            head.headRevisionId !== null)
        )
          throw new Error("REVISION_CHAIN_INCOMPLETE");
        const result = rows.length
          ? convertHistory(rows, format, head, target)
          : [];
        const oldBytes = rows.reduce(
          (sum, row) =>
            sum +
            (row.data === null
              ? 0
              : Buffer.byteLength(JSON.stringify(row.data))),
          0,
        );
        const newBytes = result.reduce(
          (sum, row) =>
            sum +
            (row.data === null
              ? 0
              : Buffer.byteLength(JSON.stringify(row.data))),
          0,
        );
        if (apply) {
          for (const row of result)
            await client.query(
              "UPDATE gradebook_revisions SET data = $1::jsonb WHERE id = $2 AND stream_id = $3",
              [row.data === null ? null : JSON.stringify(row.data), row.id, id],
            );
          await client.query(
            "UPDATE gradebook_streams SET storage_format = $1 WHERE id = $2",
            [target, id],
          );
          await client.query("COMMIT");
        } else await client.query("ROLLBACK");
        converted++;
        beforeBytes += oldBytes;
        afterBytes += newBytes;
      } catch {
        await client.query("ROLLBACK");
        throw new Error("MIGRATION_FAILED");
      }
    }
    console.log(
      JSON.stringify({
        mode: apply ? "applied" : "dry-run",
        target,
        streams: converted,
        beforeJsonBytes: beforeBytes,
        afterJsonBytes: afterBytes,
      }),
    );
  } finally {
    await client.end();
  }
}

migrate().catch(() => {
  console.error(
    "History migration stopped. Check database configuration, schema, locks and chain integrity. The failing stream was rolled back; rerun to resume completed streams safely.",
  );
  process.exitCode = 1;
});
