"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { revokeAppGrant } from "@/lib/auth/connected-apps";
import { currentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function revokeConnectedApp(clientId: string) {
  const session = await currentSession();
  if (!session) return { error: "Sign in again to revoke app access." };
  if (!z.string().min(1).max(2048).safeParse(clientId).success) {
    return {
      error:
        "This app could not be identified. Refresh the page and try again.",
    };
  }
  try {
    await revokeAppGrant(db, session.user.id, clientId);
  } catch {
    return { error: "Access could not be revoked. Try again." };
  }
  revalidatePath("/connected-apps");
  return { success: true };
}
