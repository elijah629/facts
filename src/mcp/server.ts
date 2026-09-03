import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  currentGradebook,
  gradeHistory,
  historicalGradebook,
  syncStatus,
} from "@/lib/gradebook/service";

const readSecurity = {
  securitySchemes: [{ type: "oauth2", scopes: ["grades:read"] }],
};
const historySecurity = {
  securitySchemes: [
    { type: "oauth2", scopes: ["grades:read", "grades:history"] },
  ],
};

function result(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

export function createFactsMcpServer(userId: string): McpServer {
  const server = new McpServer({ name: "facts", version: "1.0.0" });

  server.registerTool(
    "get_grades",
    {
      title: "Get current grades",
      description:
        "Refresh live FACTS data, then return normalized class grades and safe freshness metadata.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
      _meta: readSecurity,
    },
    async () => {
      const current = await currentGradebook(userId);
      return result({
        grades: current.calculated,
        freshness: {
          stale: current.sync.stale,
          lastSuccessfulFactsFetch: current.sync.lastSuccessfulFactsFetch,
          latestRevision: current.sync.revisionId,
          errorCode: current.sync.errorCode,
        },
      });
    },
  );

  server.registerTool(
    "get_class",
    {
      title: "Get current class",
      description: "Refresh live FACTS data, then return one normalized class.",
      inputSchema: z.object({
        classId: z.string().describe("Canonical class ID or class name"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
      _meta: readSecurity,
    },
    async ({ classId }) => {
      const current = await currentGradebook(userId);
      const cls = current.calculated?.classes.find(
        (item) =>
          item.id === classId ||
          item.name.localeCompare(classId, undefined, {
            sensitivity: "base",
          }) === 0 ||
          item.fullName.localeCompare(classId, undefined, {
            sensitivity: "base",
          }) === 0,
      );
      if (!cls) throw new Error("CLASS_NOT_FOUND");
      return result({
        class: {
          ...cls,
          gradebook: current.state?.classes[cls.id],
        },
        freshness: {
          stale: current.sync.stale,
          lastSuccessfulFactsFetch: current.sync.lastSuccessfulFactsFetch,
          latestRevision: current.sync.revisionId,
        },
      });
    },
  );

  server.registerTool(
    "get_gradebook_at",
    {
      title: "Get historical gradebook",
      description:
        "Reconstruct gradebook observed at a revision or timestamp, then calculate it with current src/lib/grades code.",
      inputSchema: z
        .object({
          revision: z.string().uuid().optional(),
          timestamp: z.string().datetime().optional(),
        })
        .refine((input) => Boolean(input.revision || input.timestamp), {
          message: "revision or timestamp is required",
        }),
      annotations: { readOnlyHint: true, idempotentHint: true },
      _meta: historySecurity,
    },
    async ({ revision, timestamp }) => {
      const historical = await historicalGradebook(userId, {
        revisionId: revision,
        timestamp: timestamp ? new Date(timestamp) : undefined,
      });
      return result({
        gradebook: historical.state,
        calculated: historical.calculated,
      });
    },
  );

  server.registerTool(
    "get_grade_history",
    {
      title: "Get observed grade history",
      description:
        "Return calculated grades for each distinct state observed by facts. Timestamps are observation times, not teacher edit times.",
      inputSchema: z.object({
        classId: z.string().optional(),
        assignmentId: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
      _meta: historySecurity,
    },
    async ({ classId, assignmentId }) => {
      await currentGradebook(userId);
      const history = (await gradeHistory(userId)).map((revision) => {
        const classIds = classId
          ? revision.calculated.classes
              .filter((item) => item.id === classId || item.name === classId)
              .map((item) => item.id)
          : Object.keys(revision.state.classes);
        const assignments = Object.fromEntries(
          classIds.map((id) => [
            id,
            Object.fromEntries(
              Object.entries(
                revision.state.classes[id]?.assignments ?? {},
              ).filter(([id]) => !assignmentId || id === assignmentId),
            ),
          ]),
        );
        return {
          revision: revision.id,
          sequence: revision.sequence,
          firstObserved: revision.observedAt,
          stateHash: revision.stateHash,
          grades: revision.calculated.classes.filter((item) =>
            classIds.includes(item.id),
          ),
          assignments,
        };
      });
      return result({ history });
    },
  );

  server.registerTool(
    "get_sync_status",
    {
      title: "Get grade sync status",
      description:
        "Return safe synchronization health. Does not expose Gmail or FACTS credentials.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
      _meta: readSecurity,
    },
    async () => result(await syncStatus(userId)),
  );

  return server;
}
