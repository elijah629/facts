import { and, eq } from "drizzle-orm";
import {
  oauthAccessToken,
  oauthConsent,
  oauthRefreshToken,
} from "@/lib/db/auth-schema";
import type { db } from "@/lib/db/client";

// Better Auth's deleteOAuthConsent only removes consent. Revoke the user's
// token grants too, without deleting the shared OAuth client registration.
export async function revokeAppGrant(
  database: Pick<typeof db, "transaction">,
  userId: string,
  clientId: string,
) {
  await database.transaction(async (tx) => {
    const revoked = new Date();
    await tx
      .update(oauthRefreshToken)
      .set({
        revoked,
        rotationReplayResponse: null,
        rotationReplayExpiresAt: null,
      })
      .where(
        and(
          eq(oauthRefreshToken.userId, userId),
          eq(oauthRefreshToken.clientId, clientId),
        ),
      );
    await tx
      .update(oauthAccessToken)
      .set({ revoked })
      .where(
        and(
          eq(oauthAccessToken.userId, userId),
          eq(oauthAccessToken.clientId, clientId),
        ),
      );
    await tx
      .delete(oauthConsent)
      .where(
        and(
          eq(oauthConsent.userId, userId),
          eq(oauthConsent.clientId, clientId),
        ),
      );
  });
}
