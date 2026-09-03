# facts

facts is a persistent grade service for FACTS SIS Gradebook Progress Reports.
Users sign in with a verified `@mygarces.org` Google account. The server uses
read-only Gmail access to discover temporary FACTS report links, fetches the
live report before current-grade reads, and stores each distinct observed state
as an immutable initial snapshot or semantic delta in Neon Postgres.

FACTS HTML remains the source of truth. Canonical raw assignment and grading
configuration is stored; calculated percentages are not. Historical states are
reconstructed and passed to the existing `src/lib/grades` calculator. There is
no calculator versioning, so future behavior changes in that module also affect
historical projections.

The public `/mcp` endpoint uses Streamable HTTP MCP 2026-07-28 with Better Auth
OAuth, PKCE, CIMD, resource-bound tokens, and `grades:read` plus
`grades:history` scopes. It returns normalized grade data only. Gmail tokens,
email bodies, FACTS URLs, SessionIDs, and raw FACTS HTML never enter MCP output.

## Development

Use Node 24 LTS (the repository pins `24.20.0`) and Bun 1.4.0. Vercel should
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
2. Set Google Auth Platform audience to **Internal**. This prevents accounts
   outside `mygarces.org` from authorizing; the server also checks Google's
   verified email and hosted-domain claim.
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
