import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://build:build@127.0.0.1:5432/facts_build_placeholder";

export const sqlClient = postgres(databaseUrl, {
  max: 5,
  prepare: false,
  idle_timeout: 20,
});

export const db = drizzle(sqlClient, { schema });

export function requireDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }
}
