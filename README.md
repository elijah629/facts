# facts

A local-first grade viewer for FACTS SIS per-class Gradebook Progress Report
links. On first use, export and paste the link for every class. The links and
parsed report remain in browser storage. When a FACTS session expires, paste
one newly exported link; facts applies that session ID to the saved class links
and refreshes the complete report.

Only `https://*.client.factsmgt.com/pwr/NAScopy/Gradebook/GradeBookProgressReport-PW.cfm`
links are accepted. Report links contain private, temporary credentials and
should not be shared or committed.

## Development

```bash
bun install
bun run dev
```

Run checks with `bun test`, `bun run lint`, and `bun run build`.
