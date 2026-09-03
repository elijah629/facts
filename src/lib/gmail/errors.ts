interface GoogleApiError {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string }>;
    details?: Array<{ reason?: string }>;
  };
}

export async function gmailErrorCode(response: Response): Promise<string> {
  if (response.status !== 403) return `GMAIL_API_${response.status}`;

  let payload: GoogleApiError | undefined;
  try {
    payload = (await response.json()) as GoogleApiError;
  } catch {
    return "GMAIL_API_FORBIDDEN";
  }

  const reason = (
    payload.error?.errors?.[0]?.reason ??
    payload.error?.details?.[0]?.reason ??
    ""
  )
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const message = payload.error?.message?.toLowerCase() ?? "";

  if (
    reason === "accessnotconfigured" ||
    reason === "servicedisabled" ||
    message.includes("has not been used in project") ||
    message.includes("is disabled")
  ) {
    return "GMAIL_API_DISABLED";
  }
  if (
    reason === "insufficientpermissions" ||
    message.includes("insufficient authentication scopes")
  ) {
    return "GMAIL_SCOPE_MISSING";
  }
  if (reason === "domainpolicy" || message.includes("domain policy")) {
    return "GMAIL_DOMAIN_BLOCKED";
  }
  if (
    reason.includes("ratelimit") ||
    reason === "dailylimitexceeded" ||
    reason === "quotaexceeded"
  ) {
    return "GMAIL_RATE_LIMITED";
  }
  return "GMAIL_API_FORBIDDEN";
}
