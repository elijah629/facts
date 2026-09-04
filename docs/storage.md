# Grade history and storage

## Student history

`/history` shows a GPA chart, time slider, class grades, and one readable entry per
changed assignment. Score and status changes stay together; dates, notes, and
other values are expandable. Adding or removing an entire class does not flood
the feed with all of its assignments. The first report is a starting point, not
an assignment-added event.

Chart points are real saved observations, not estimates from assignment due dates.
The chart and slider share the same selected update. Timestamps use the viewer's
local time zone; they describe when facts observed a report, not when a teacher
edited it. Grading uses the current facts calculator and the AP/Honors Boost
setting. Missing grades produce gaps; term and school-year changes break the line.

The authenticated `GET /api/grades/history/timeline` endpoint accepts `before`
(sequence cursor) or `revision` (UUID; takes precedence). It returns at most 20
ascending points with dates, weighted/unweighted GPA, compact class grades,
previous grades, and grouped changes; plus `selectedId`, `before`, `hasNewer`, and
`unavailable`. It does not return raw reports or storage deltas. A page reads one
additional preceding state to compute the first point's changes. Existing
revision and `before` links remain usable. Older points are fetched on demand;
already-loaded slider selections are local and create no requests.

The existing history API and MCP tools retain their ascending order, revision
identities, timestamp lookup behavior, and calculated responses. The legacy API's
forward payloads are generated on demand when storage is reverse. They are not
stored a second time.

## Storage format

`gradebook_streams.storage_format` distinguishes `forward-v1` (legacy) from
`reverse-v1`. The schema default stays `forward-v1` so older application builds
continue to create readable streams during deployment. The new writer explicitly
creates `reverse-v1` streams and supports both formats for existing streams.

For reverse storage, `gradebook_heads.current_state` is the only full report. The
revision row at sequence n > 0 stores `diffGradebooks(state[n], state[n - 1])`:
applying that payload to version n produces version n - 1. Sequence zero retains
its ID, timestamp, kind, and hash, but its payload is SQL NULL. Every revision's
hash describes the state at that revision, not the result of its reverse delta.

Sync holds the head row lock while writing a delta and replacing the head in one
transaction. Unchanged reports create no revision and do not rewrite the large
JSONB head value. Reads use repeatable-read transactions, verify contiguous
sequences and hashes, and stop when they reach the requested range. A latest-only
read performs no delta applications. An older page must walk from the head to its
oldest requested point; it does not independently replay every displayed point.
Only requested states are retained while walking a chain.

No chart points, rendered sentences, duplicate checkpoints, or second copies of
reports are persisted. This favors storage over instant access to the entire
chart. Older history remains proportional to distance from the head. Source URLs
remain encrypted bearer links. No history retention or authentication cleanup is
part of this migration.

## Deploy and convert

1. Run `bun run db:migrate` with the direct `DATABASE_URL_UNPOOLED`. Migration
   `0001_reverse_history` adds the format column and allows NULL revision data.
   This is compatible with the old writer; it does not convert any streams.
2. Deploy the new application, then let all older application instances and their
   in-flight syncs finish. Do **not** convert a stream while an old writer could
   still write to it; old writers do not understand the format marker.
3. Run `bun run db:history --dry-run`. It validates every state/hash, derives the
   reverse chain, validates its reconstruction, and reports compact JSON byte
   totals without writing changes or printing student data.
4. Run `bun run db:history --apply`. Each stream takes the same head lock as sync.
   It validates the old chain and head, replaces payloads, clears the initial
   payload, and changes the format in one transaction. New compatible syncs can
   run concurrently; they wait on the head lock and read the format afterward.
5. Run `bun run db:inspect`, and open history plus a known older revision.

The converter retains at most adjacent full states during conversion. Its default
is dry-run; `--apply` is explicit. Failed streams roll back completely. Previously
committed streams are skipped on rerun, making the command resumable. Errors omit
student data and connection strings.

To roll back to an older application, first stop all sync writers (including
interactive gradebook requests), then run `bun run db:history --dry-run --to-forward`
and `bun run db:history --apply --to-forward`. This restores initial full payloads
and forward deltas, verifying every hash before committing. Keep writers stopped
until the old application is deployed. The additive schema can remain in place.

## Measure storage

Set the database URLs in the gitignored `.env.local`, then run `bun run db:inspect`.
The audit uses a read-only transaction and query timeouts. It reports table,
index, TOAST, payload and auth-expiration counts, never student contents, account
identities, source URLs or tokens. Converter byte totals measure serialized JSON;
the audit measures actual PostgreSQL storage.

Removing redundant payloads does not immediately reduce allocated PostgreSQL
pages, WAL, or Neon restore history. Compare like-for-like payload measurements;
do not infer gradebook size from total database allocation. This change does not
run intrusive table compaction, purge revisions, or change retention settings.

## Verification

`bun test src/lib/gradebook` exercises semantic summaries, hash and chain
validation, lossless conversion in both directions, a 1,000-update suffix replay,
and isolated PGlite PostgreSQL integration tests. The integration tests apply both
real SQL migrations, check rollback/restart, compare all reconstructed versions,
exercise pagination/direct links/ownership, and confirm that a latest read does
not depend on older payloads. No live database is mutated by these tests.
