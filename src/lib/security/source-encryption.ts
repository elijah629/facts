import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const value = process.env.FACTS_SOURCE_ENCRYPTION_KEY;
  if (!value) throw new Error("FACTS_SOURCE_ENCRYPTION_KEY is not configured.");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) {
    throw new Error("FACTS_SOURCE_ENCRYPTION_KEY must be 32 bytes in base64.");
  }
  return decoded;
}

export function encryptSource(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const payload = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
  return `v1.${payload.toString("base64url")}`;
}

export function decryptSource(value: string): string {
  const [version, encoded, extra] = value.split(".");
  if (
    version !== "v1" ||
    !encoded ||
    extra !== undefined ||
    !/^[A-Za-z0-9_-]+$/.test(encoded)
  ) {
    throw new Error("ENCRYPTED_SOURCE_INVALID");
  }
  const payload = Buffer.from(encoded, "base64url");
  if (payload.length <= 28) throw new Error("ENCRYPTED_SOURCE_INVALID");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
