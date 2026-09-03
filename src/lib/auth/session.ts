import { headers } from "next/headers";
import { auth } from "./index";

export async function currentSession() {
  return auth.api.getSession({ headers: await headers() });
}
