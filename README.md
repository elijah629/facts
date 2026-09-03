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

```bash
bun install
bun run db:migrate
bun run dev
```

Run checks with `bun test`, `bun run lint`, and `bun run build`.

Copy `.env.example` to `.env.local`. Create a Neon database, set
`DATABASE_URL`, then run `bun run db:migrate`.

Google Cloud configuration:

1. Use the existing Garces Workspace OAuth project.
2. Set OAuth audience to Internal.
3. Add `https://facts.eli.best/api/auth/callback/google` as an authorized
   redirect URI. Add `http://localhost:3000/api/auth/callback/google` for local
   development.
4. Enable Gmail API. The app requests only
   `https://www.googleapis.com/auth/gmail.readonly` plus identity scopes and
   requests offline authorization.
5. Set production `BETTER_AUTH_URL=https://facts.eli.best`.

Vercel configuration:

1. Add every value from `.env.example` as a server-side environment variable.
2. Deploy the generated Drizzle migration before deploying app code.
3. Keep `vercel.json` daily cron enabled. Vercel calls
   `/api/internal/sync` at `14:17 UTC`; Hobby cron timing may vary within the
   hour. `CRON_SECRET` protects the endpoint automatically.

Connect ChatGPT to `https://facts.eli.best/mcp`. OAuth discovery, authorization,
consent, audience validation, and JWKS verification are served by Better Auth.
