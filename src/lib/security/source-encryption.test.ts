import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { decryptSource, encryptSource } from "./source-encryption";

const originalKey = process.env.FACTS_SOURCE_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.FACTS_SOURCE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
    "base64",
  );
});

afterAll(() => {
  if (originalKey === undefined) {
    delete process.env.FACTS_SOURCE_ENCRYPTION_KEY;
  } else {
    process.env.FACTS_SOURCE_ENCRYPTION_KEY = originalKey;
  }
});

describe("FACTS source encryption", () => {
  test("round-trips an authenticated encrypted URL", () => {
    const url =
      "https://school.client.factsmgt.com/renweb/email/getreport.cfm?district=x&sessionid=secret";
    const encrypted = encryptSource(url);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(encrypted).not.toContain("secret");
    expect(decryptSource(encrypted)).toBe(url);
  });

  test("rejects malformed payloads", () => {
    expect(() => decryptSource("v1.too.short")).toThrow(
      "ENCRYPTED_SOURCE_INVALID",
    );
  });
});
