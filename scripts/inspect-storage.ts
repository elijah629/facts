import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { neonDatabaseUrl } from "../src/lib/env";

loadEnvConfig(process.cwd());

async function inspectStorage() {
  const name = process.env.DATABASE_URL_UNPOOLED
    ? "DATABASE_URL_UNPOOLED"
    : "DATABASE_URL";
  if (!process.env[name])
    throw new Error(
      "Set DATABASE_URL in .env.local, then run bun run db:inspect.",
    );
  const client = new Client({
    connectionString: neonDatabaseUrl(name),
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    await client.query(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '2s'");
    const reports = [
      [
        "Database total (includes catalogs, not just grade data)",
        `SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size, pg_database_size(current_database()) AS bytes`,
      ],
      [
        "User tables, indexes and TOAST (allocated bytes)",
        `SELECT s.schemaname, s.relname AS table_name, pg_size_pretty(pg_total_relation_size(s.relid)) AS total, pg_size_pretty(pg_table_size(s.relid)) AS table_with_toast, pg_size_pretty(pg_indexes_size(s.relid)) AS indexes, CASE WHEN c.reltoastrelid = 0 THEN '0 bytes' ELSE pg_size_pretty(pg_total_relation_size(c.reltoastrelid)) END AS toast, s.n_live_tup AS estimated_live_rows, s.n_dead_tup AS estimated_dead_rows FROM pg_stat_user_tables s JOIN pg_class c ON c.oid = s.relid ORDER BY pg_total_relation_size(s.relid) DESC`,
      ],
      [
        "User-table total versus database total",
        `SELECT pg_size_pretty(coalesce(sum(pg_total_relation_size(relid)),0)::bigint) AS user_tables_total FROM pg_stat_user_tables`,
      ],
      [
        "Revision payloads (no student data)",
        `SELECT kind, count(*) AS revisions, pg_size_pretty(coalesce(sum(pg_column_size(data)),0)::bigint) AS stored_payload, pg_size_pretty(coalesce(sum(octet_length(data::text)),0)::bigint) AS uncompressed_text, max(pg_column_size(data)) AS largest_payload_bytes FROM gradebook_revisions GROUP BY kind ORDER BY kind`,
      ],
      [
        "Current-state cache",
        `SELECT count(*) AS heads, pg_size_pretty(coalesce(sum(pg_column_size(current_state)),0)::bigint) AS stored_payload FROM gradebook_heads`,
      ],
      [
        "Expired auth records (counts only; nothing deleted)",
        `SELECT 'session' AS table_name, count(*) AS total, count(*) FILTER (WHERE expires_at < now()) AS expired FROM session UNION ALL SELECT 'verification', count(*), count(*) FILTER (WHERE expires_at < now()) FROM verification UNION ALL SELECT 'oauth_access_token', count(*), count(*) FILTER (WHERE expires_at < now()) FROM oauth_access_token UNION ALL SELECT 'oauth_refresh_token', count(*), count(*) FILTER (WHERE expires_at < now()) FROM oauth_refresh_token`,
      ],
    ] as const;
    for (const [title, query] of reports) {
      console.log(`\n${title}`);
      console.table((await client.query(query)).rows);
    }
    await client.query("ROLLBACK");
    console.log(
      "\nRead-only audit complete. No records, retention settings, or indexes changed.",
    );
  } finally {
    await client.end();
  }
}

inspectStorage().catch((error: unknown) => {
  // Database errors can embed credentials or query data; don't dump them.
  console.error(
    process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
      ? "Storage audit failed. Check DB connectivity, schema and read permissions."
      : error instanceof Error
        ? error.message
        : "Storage audit failed.",
  );
  process.exitCode = 1;
});
