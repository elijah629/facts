import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { neonDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

export const databasePool = new Pool({
  connectionString: neonDatabaseUrl("DATABASE_URL"),
  max: 5,
  idleTimeoutMillis: 3_000,
  connectionTimeoutMillis: 7_000,
  maxLifetimeSeconds: 60,
  keepAlive: true,
});
attachDatabasePool(databasePool);
databasePool.on("error", () => console.warn("Idle Neon connection closed"));

export const db = drizzle(databasePool, { schema });
