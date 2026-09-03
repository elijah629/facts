# Grade history and storage

The `/history` page reads the signed-in user's revision stream from Neon. It
replays the initial state and subsequent deltas, verifies the selected state's
hash, and displays readable before/after changes. It does not persist rendered
diffs or calculated grades. The revision list fetches 20 metadata rows at a time;
only the selected revision's chain is replayed.

## Measure before migrating

Set `DATABASE_URL` (or `DATABASE_URL_UNPOOLED`) in the gitignored `.env.local`, then:

```sh
bun run db:inspect
```

This runs a read-only transaction with query timeouts. Output contains sizes and
counts, never grade contents, account identities, URLs, or tokens. It separates:

- Whole-database allocation, which includes PostgreSQL catalogs.
- User-table storage, indexes, TOAST, and estimated dead tuples.
- Actual stored revision payload bytes versus uncompressed text size.
- Current-state cache payload bytes.
- Expired authentication-record counts, without deleting them.

The Neon dashboard may show a different storage metric, including retained
history or other branches. Record the metric's label, branch count, and restore
window before comparing it to `pg_database_size`. Three application revisions do
not by themselves explain a 35 MB database. Do not treat that total as three
payload sizes.

## What is stored and why

Ordinary identifiers, revision sequence, timestamps, hashes, source metadata,
and authentication fields use typed SQL columns. There are no new JSON columns.
The existing JSONB payloads remain for the nested initial gradebook and sparse,
field-level deltas: retaining their shape makes exact replay possible without an
entity/attribute/value schema or lossy conversion of historical values. JSONB is
not the only possible design, but replacing it blindly is not a demonstrated
space saving. A relational migration needs measurements and a verified backfill.

One current-state JSONB cache avoids replaying all revisions during every live
sync. It is now updated only when the gradebook hash changes, rather than on
every unchanged poll. This avoids needless large-value rewrites. It does not
retroactively shrink existing allocation or Neon restore history.

No retention window, revisions, authentication rows, or indexes are deleted by
this change. Expired-token cleanup and any table compaction should be considered
only after measuring actual usage and verifying authentication dependencies.
Do not run `VACUUM FULL` or purge initial snapshots as a speculative fix: the
former takes intrusive locks, and the latter breaks delta replay.

## Privacy

Grade data is readable by the database administrator. Application history queries
are always scoped to the authenticated user's stream, including direct revision
links. There is no public or cross-user history endpoint. FACTS source URLs remain
encrypted because they are bearer links capable of fetching reports, not merely
copies of already-stored grades.

References: [PostgreSQL size functions](https://www.postgresql.org/docs/current/functions-admin.html),
[Neon storage model](https://github.com/neondatabase/neon/blob/main/docs/synthetic-size.md).
