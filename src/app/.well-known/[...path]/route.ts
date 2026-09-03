import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return auth.handler(request);
}

export async function HEAD(request: Request): Promise<Response> {
  return auth.handler(request);
}
