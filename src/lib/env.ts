export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function neonDatabaseUrl(name: string): string {
  const url = new URL(requiredEnv(name));
  if (!url.hostname.toLowerCase().endsWith(".neon.tech")) {
    throw new Error(`${name} must be a Neon Postgres URL.`);
  }
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
