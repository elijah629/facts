import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { neonDatabaseUrl } from "./src/lib/env";

loadEnvConfig(process.cwd());

const migrationUrl = neonDatabaseUrl("DATABASE_URL_UNPOOLED");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
