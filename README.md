# facts

A local-first grade viewer for FACTS SIS emailed Gradebook Progress Reports.
Paste the report link from the RenWeb email to import every class at once.

Only `https://*.client.factsmgt.com/renweb/email/getreport.cfm` links are
accepted. Report links contain private, temporary credentials and should not be
shared or committed.

## Development

```bash
bun install
bun run dev
```

Run checks with `bun test`, `bun run lint`, and `bun run build`.
