import { expect, test } from "bun:test";
import { databaseRead } from "./read";

test("an idempotent read retries a terminated connection wrapped by Drizzle", async () => {
  let reads = 0;
  const failure = new Error("Failed query", {
    cause: new Error("Connection terminated unexpectedly"),
  });
  expect(
    await databaseRead(async () => {
      if (++reads === 1) throw failure;
      return "loaded";
    }),
  ).toBe("loaded");
  expect(reads).toBe(2);
});

test("read retries stop after one retry and leave other failures alone", async () => {
  let reads = 0;
  const failure = Object.assign(new Error("server restarting"), {
    code: "57P03",
  });
  await expect(
    databaseRead(async () => {
      reads++;
      throw failure;
    }),
  ).rejects.toBe(failure);
  expect(reads).toBe(2);
  const corrupt = new Error("REVISION_CHAIN_INCOMPLETE");
  await expect(
    databaseRead(async () => {
      reads++;
      throw corrupt;
    }),
  ).rejects.toBe(corrupt);
  expect(reads).toBe(3);
});
