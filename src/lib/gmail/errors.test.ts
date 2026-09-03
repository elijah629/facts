import { describe, expect, test } from "bun:test";
import { gmailErrorCode } from "./errors";

function forbidden(reason: string, message = "Forbidden") {
  return new Response(
    JSON.stringify({ error: { message, errors: [{ reason }] } }),
    { status: 403 },
  );
}

describe("Gmail API errors", () => {
  test("identifies a disabled Gmail API", async () => {
    expect(await gmailErrorCode(forbidden("accessNotConfigured"))).toBe(
      "GMAIL_API_DISABLED",
    );
  });

  test("identifies modern service-disabled errors", async () => {
    const response = new Response(
      JSON.stringify({ error: { details: [{ reason: "SERVICE_DISABLED" }] } }),
      { status: 403 },
    );
    expect(await gmailErrorCode(response)).toBe("GMAIL_API_DISABLED");
  });

  test("identifies missing OAuth scopes", async () => {
    expect(await gmailErrorCode(forbidden("insufficientPermissions"))).toBe(
      "GMAIL_SCOPE_MISSING",
    );
  });

  test("keeps unknown 403 responses generic", async () => {
    expect(await gmailErrorCode(forbidden("forbidden"))).toBe(
      "GMAIL_API_FORBIDDEN",
    );
  });
});
