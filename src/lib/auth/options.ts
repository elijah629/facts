import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { requiredEnv } from "@/lib/env";

export const baseUrl = requiredEnv("BETTER_AUTH_URL");
export const mcpResource = `${new URL(baseUrl).origin}/mcp`;
const googleWorkspaceDomain = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim()
  .toLowerCase()
  .replace(/^@/, "");

export const authOptions = {
  appName: "facts",
  baseURL: baseUrl,
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  session: {
    expiresIn: 30 * 86400,
    updateAge: 86400,
    cookieCache: { enabled: true, maxAge: 60 },
  },
  trustedOrigins: [new URL(baseUrl).origin],
  account: {
    accountLinking: { enabled: false },
    encryptOAuthTokens: true,
  },
  user: {
    validateUserInfo: ({ user, source }) => {
      const allowed =
        source.oauth?.providerId === "google" &&
        user.emailVerified === true &&
        (!googleWorkspaceDomain ||
          user.email?.toLowerCase().endsWith(`@${googleWorkspaceDomain}`));
      return allowed
        ? undefined
        : {
            error: "email_not_allowed",
            errorDescription:
              "Sign in with the verified Google account that receives your FACTS report links.",
          };
    },
  },
  socialProviders: {
    google: {
      clientId: requiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
      accessType: "offline",
      prompt: "select_account",
      includeGrantedScopes: false,
      ...(googleWorkspaceDomain ? { hd: googleWorkspaceDomain } : {}),
    },
  },
} satisfies BetterAuthOptions;
