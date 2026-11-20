import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { fetchClientMetadataResource } from "./cimd-fetch";

import { authOptions, mcpResource } from "./options";

export { mcpResource } from "./options";

export const auth = betterAuth({
  ...authOptions,
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
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
