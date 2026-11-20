# facts

facts is a persistent grade service for FACTS SIS Gradebook Progress Reports.
Users sign in with the Google account that receives their FACTS report links.
The server uses read-only Gmail access to find those links, fetches the live
report before current-grade reads, and stores each distinct observed state as
an immutable initial snapshot or semantic delta in Neon Postgres.

FACTS HTML remains the source of truth. Canonical raw assignment and grading
configuration is stored; calculated percentages are not. Historical states are
reconstructed and passed to the existing `src/lib/grades` calculator. There is
no calculator versioning, so future behavior changes in that module also affect
historical projections.

The public `/mcp` endpoint uses Streamable HTTP MCP 2026-07-28 with Better Auth
OAuth, PKCE, CIMD, resource-bound tokens, and `grades:read` plus
`grades:history` scopes. It returns normalized grade data only. Gmail tokens,
email bodies, FACTS URLs, SessionIDs, and raw FACTS HTML never enter MCP output.

### MCP tools

- `get_grades` returns classes, both term GPAs, grade movement and sync status.
- `get_class` returns category IDs, scores, weights and optional assignments.
- `list_assignments` filters by class, status, title and due date. Use `nextOffset`
  to page through matches. Set `includeDetails` for instructions and teacher notes.
- `project_final_grade` uses category IDs from `get_class` to calculate a projected
  course grade or the final score needed for a target.
- `get_grade_history` starts with the latest 10 observations. Use `nextBefore` as
  `before` for older pages. Pass `assignmentId` to track one assignment or
  `includeAssignments: true` to retrieve all assignment records one revision at a time.
- `get_recent_changes` gives readable changes from saved observations.
- `get_gradebook_at` retrieves a snapshot by revision ID or timestamp.
- `get_sync_status` checks the last sync without fetching a report.

Current-grade tools refresh FACTS by default. For follow-up calls, set
`refresh: false` to reuse the saved gradebook and compare its latest revision ID
across pages. Percentages in grades and assignments are fractions; final-exam
inputs and outputs use 0–100 units.

## Development

Use Node 24 LTS (the repository pins `24.20.0`) and Bun 1.4.5. Vercel should
also be set to Node `24.x`.

```bash
bun install
bun run db:migrate
bun run dev
```

Run checks with `bun test`, `bun run lint`, and `bun run build`.

Copy `.env.example` to `.env.local`. Use Neon's pooled connection string for
`DATABASE_URL` and its direct connection string for `DATABASE_URL_UNPOOLED`.
The app pool is registered with Vercel Fluid Compute; only Drizzle migrations
use the direct URL. Both connections enforce `sslmode=verify-full` in code.

The checked-in `drizzle/0000_*.sql` is the complete initial schema. No previous
migration should be applied. Run `bun run db:migrate` once when ready; do not
run it merely to build or test the app.

Google Cloud configuration:

1. Use a Google Cloud project owned by the Garces Workspace organization.
2. Choose the Google Auth Platform audience appropriate for the deployment.
   Set optional `GOOGLE_WORKSPACE_DOMAIN` to restrict sign-in to one Workspace
   domain; omit it to allow any verified Google account.
3. Add `https://facts.eli.best/api/auth/callback/google` as an authorized
   redirect URI. Add `http://localhost:3000/api/auth/callback/google` for local
   development.
4. Enable Gmail API. The app requests only
   `https://www.googleapis.com/auth/gmail.readonly` plus identity scopes and
   requests offline authorization. Internal Workspace apps are exempt from the
   public restricted-scope verification flow, but a Workspace administrator may
   still need to trust the app and allow the Gmail scope. The Gmail API does not
   require paid Google Cloud credits below its published daily quota threshold.
5. Set production `BETTER_AUTH_URL=https://facts.eli.best`.
6. Keep the Google client ID, client secret, Better Auth secret, and source
   encryption key server-only. OAuth access and refresh tokens are encrypted by
   Better Auth; FACTS report URLs use their own key.

Vercel configuration:

1. Add the runtime values from `.env.example` as server-side environment
   variables. `DATABASE_URL_UNPOOLED` is needed only wherever migrations run.
2. Apply the generated Drizzle migration before the first production deploy.
3. Keep `vercel.json` daily cron enabled. Vercel sends an authenticated `GET`
   to `/api/internal/sync` at `14:17 UTC`; Hobby cron timing may vary within the
   hour. Set `CRON_SECRET` in Production and do not call the route manually with
   query-string secrets.

Connect ChatGPT to `https://facts.eli.best/mcp`. OAuth discovery, authorization,
consent, audience validation, and JWKS verification are served by Better Auth.
