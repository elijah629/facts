import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { jwt } from "better-auth/plugins";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { requiredEnv } from "@/lib/env";
import { fetchClientMetadataResource } from "./cimd-fetch";

const baseUrl = requiredEnv("BETTER_AUTH_URL");
const googleWorkspaceDomain = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim()
  .toLowerCase()
  .replace(/^@/, "");
export const mcpResource = `${new URL(baseUrl).origin}/mcp`;

export const auth = betterAuth({
  appName: "facts",
  baseURL: baseUrl,
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
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
      prompt: "select_account consent",
      includeGrantedScopes: false,
      ...(googleWorkspaceDomain ? { hd: googleWorkspaceDomain } : {}),
    },
  },
  plugins: [
    jwt(),
    mcp({
      loginPage: "/sign-in",
      consentPage: "/consent",
      resource: mcpResource,
      scopes: [
        "openid",
        "email",
        "profile",
        "offline_access",
        "grades:read",
        "grades:history",
      ],
      resources: [
        {
          identifier: mcpResource,
          name: "facts grade service",
          allowedScopes: ["grades:read", "grades:history"],
        },
      ],
      customAccessTokenClaims: ({ user }) => ({
        userId: user?.id,
      }),
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
