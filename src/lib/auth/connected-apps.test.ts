import { describe, expect, test } from "bun:test";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { revokeAppGrant } from "./connected-apps";

function databaseDouble(failAt?: string) {
  const mutations: {
    table: string;
    values?: object;
    sql: string;
    params: unknown[];
  }[] = [];
  let transactions = 0;
  const dialect = new PgDialect();
  const where = (table: PgTable, values?: object) => ({
    where: async (condition: SQL) => {
      const name = getTableName(table);
      if (name === failAt) throw new Error("database unavailable");
      mutations.push({ table: name, values, ...dialect.sqlToQuery(condition) });
    },
  });
  const tx = {
    update: (table: PgTable) => ({
      set: (values: object) => where(table, values),
    }),
    delete: (table: PgTable) => where(table),
  };
  const database = {
    transaction: async (run: (transaction: typeof tx) => Promise<void>) => {
      transactions++;
      return run(tx);
    },
  } as unknown as Parameters<typeof revokeAppGrant>[0];
  return { database, mutations, transactions: () => transactions };
}

describe("revokeAppGrant", () => {
  test("revokes only the session user's client grants in one transaction", async () => {
    const mock = databaseDouble();
    await revokeAppGrant(mock.database, "user-a", "shared-client");
    expect(mock.transactions()).toBe(1);
    expect(mock.mutations.map((mutation) => mutation.table)).toEqual([
      "oauth_refresh_token",
      "oauth_access_token",
      "oauth_consent",
    ]);
    for (const mutation of mock.mutations) {
      expect(mutation.params).toEqual(["user-a", "shared-client"]);
      expect(mutation.sql).toContain('"user_id" = $1');
      expect(mutation.sql).toContain('"client_id" = $2');
      expect(mutation.sql).toContain(" and ");
    }
    expect(mock.mutations[0].values).toEqual({
      revoked: expect.any(Date),
      rotationReplayResponse: null,
      rotationReplayExpiresAt: null,
    });
    expect(mock.mutations[1].values).toEqual({ revoked: expect.any(Date) });
    expect(mock.mutations[2].values).toBeUndefined();
  });

  test("propagates failures so the transaction rolls back instead of removing consent alone", async () => {
    const mock = databaseDouble("oauth_access_token");
    await expect(
      revokeAppGrant(mock.database, "user-a", "client-a"),
    ).rejects.toThrow("database unavailable");
    expect(mock.mutations.map((mutation) => mutation.table)).toEqual([
      "oauth_refresh_token",
    ]);
  });
});
