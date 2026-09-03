import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { auth, mcpResource } from "@/lib/auth";
import { createFactsMcpServer } from "@/mcp/server";

const protectedHandler = requireMcpAuth(
  auth,
  async (request, claims) => {
    const userId =
      typeof claims.userId === "string"
        ? claims.userId
        : typeof claims.sub === "string"
          ? claims.sub
          : null;
    if (!userId) {
      return Response.json(
        {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Authenticated user missing." },
          id: null,
        },
        { status: 401 },
      );
    }
    const handler = createMcpHandler(() => createFactsMcpServer(userId), {
      legacy: "reject",
      responseMode: "json",
    });
    return handler.fetch(request);
  },
  {
    resource: mcpResource,
    requiredScopes: ["grades:read", "grades:history"],
  },
);

export async function POST(request: Request): Promise<Response> {
  return protectedHandler(request);
}
