import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { neonDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

export const databasePool = new Pool({
  connectionString: neonDatabaseUrl("DATABASE_URL"),
  max: 5,
  idleTimeoutMillis: 5_000,
});
attachDatabasePool(databasePool);

export const db = drizzle(databasePool, { schema });
