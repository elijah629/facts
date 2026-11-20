import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  FINAL_SEARCH_MAX,
  gradeWithFinal,
  requiredFinalScore,
  sectionGradeForClass,
} from "@/lib/final-calculator";
import { compareReportGrades } from "@/lib/gradebook/changes";
import { revisionHistoryPage } from "@/lib/gradebook/history-view";
import {
  calculateGradebook,
  reportProjection,
} from "@/lib/gradebook/projection";
import {
  currentGradebook,
  gradeHistoryWindow,
  historicalGradebook,
  savedGradebook,
  syncStatus,
} from "@/lib/gradebook/service";
import { schoolGpas, sectionGradePoints } from "@/lib/grades";
import {
  assignmentPage,
  matchingClassIds,
  requireClassId,
} from "./gradebook-details";

const readSecurity = {
  securitySchemes: [{ type: "oauth2", scopes: ["grades:read"] }],
};
const historySecurity = {
  securitySchemes: [
    { type: "oauth2", scopes: ["grades:read", "grades:history"] },
  ],
};
const readOnly = { readOnlyHint: true, idempotentHint: true };
const freshnessSchema = z.object({
  stale: z.boolean(),
  lastSuccessfulFactsFetch: z.iso.datetime().nullable(),
  latestRevision: z.uuid().nullable(),
  errorCode: z.string().optional(),
});
const classSelector = z
  .string()
  .trim()
  .min(1)
  .max(250)
  .describe(
    "Canonical class ID, exact course title, or FACTS course name from get_grades.",
  );
const refreshOption = z
  .boolean()
  .optional()
  .describe(
    "Defaults to true. Set false to read the saved gradebook without contacting FACTS again.",
  );
const historyCursor = z
  .number()
  .int()
  .min(0)
  .max(2147483647)
  .optional()
  .describe(
    "Use nextBefore from the previous page to load older saved revisions.",
  );
const errorMessages = new Map([
  [
    "GRADEBOOK_NOT_FOUND",
    "No saved gradebook. Call get_grades with refresh true to sync your FACTS report.",
  ],
  [
    "CLASS_NOT_FOUND",
    "Class not found. Call get_grades for canonical class IDs.",
  ],
  [
    "AMBIGUOUS_CLASS",
    "More than one class has that title. Use the canonical class ID from get_grades.",
  ],
  [
    "REVISION_NOT_FOUND",
    "Revision not found in your gradebook. Call get_grade_history for available revisions.",
  ],
  [
    "REVISION_NOT_FOUND_AT_TIMESTAMP",
    "No gradebook was saved at or before that time. Call get_grade_history for available dates.",
  ],
  [
    "CATEGORY_NOT_FOUND",
    "Category not found. Call get_class for its exact category IDs.",
  ],
  [
    "SAME_FINAL_CATEGORY",
    "Choose a different replacement category or omit replaceCategoryId.",
  ],
]);

function formatResult(value: Record<string, unknown>) {
  const text = JSON.stringify(value);
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: JSON.parse(text) as Record<string, unknown>,
  };
}

async function runTool(read: () => Promise<Record<string, unknown>>) {
  try {
    return formatResult(await read());
  } catch (error) {
    const code =
      error instanceof Error && errorMessages.has(error.message)
        ? error.message
        : "GRADEBOOK_UNAVAILABLE";
    if (code === "GRADEBOOK_UNAVAILABLE")
      console.warn("MCP gradebook tool unavailable");
    const message =
      errorMessages.get(code) ??
      "Gradebook data is temporarily unavailable. Try again or call get_sync_status.";
    return { ...formatResult({ error: code, message }), isError: true };
  }
}

type Gradebook = Awaited<ReturnType<typeof savedGradebook>>;

function freshness({ sync }: Gradebook) {
  return {
    stale: sync?.stale ?? true,
    lastSuccessfulFactsFetch: sync?.lastSuccessfulFactsFetch ?? null,
    latestRevision: sync?.revisionId ?? null,
    errorCode: sync?.errorCode,
  };
}

function loadGradebook(userId: string, refresh?: boolean, calculate = false) {
  return refresh === false
    ? savedGradebook(userId, calculate)
    : currentGradebook(userId, calculate);
}

function classDetails(current: Gradebook, selector: string) {
  const id = requireClassId(current.state, selector);
  const raw = current.state?.classes[id];
  const cls = current.report?.classes.find(
    (course) => course.fullName === raw?.name,
  );
  if (!raw || !cls) throw new Error("CLASS_NOT_FOUND");
  const categoryIds = Object.keys(raw.grading.categories).sort((a, b) =>
    a.localeCompare(b),
  );
  return { id, raw, cls, categoryIds };
}

export function createFactsMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "facts",
    version: "1.1.0",
  });

  server.registerTool(
    "get_grades",
    {
      title: "Get current grades",
      description:
        "Get your course IDs, teacher names, class marks, weighted and unweighted term GPA, and changes since the previous saved revision in this term. Class percentage is a fraction (0.98 = 98%); classChanges are percentage points. Refreshes FACTS by default.",
      inputSchema: z.object({ refresh: refreshOption }),
      annotations: readOnly,
      _meta: readSecurity,
    },
    async ({ refresh }) =>
      runTool(async () => {
        const current = await loadGradebook(userId, refresh, true);
        const report = current.report;
        const previous = current.sync?.previousState;
        return {
          grades: current.calculated,
          schoolGpa: report ? schoolGpas(report.classes) : null,
          ...(report
            ? compareReportGrades(
                report,
                previous ? reportProjection(previous) : null,
              )
            : {}),
          freshness: freshness(current),
        };
      }),
  );

  server.registerTool(
    "get_class",
    {
      title: "Get current class",
      description:
        "Get one course's grade, teacher, category IDs, category grades, points and weights. Includes full assignment records by default. Use list_assignments for filtered or paginated assignment details. Category percentage is a fraction (0.98 = 98%).",
      inputSchema: z.object({
        classId: classSelector,
        refresh: refreshOption,
        includeAssignments: z
          .boolean()
          .optional()
          .describe(
            "Defaults to true. Set false to return only class and category information.",
          ),
      }),
      annotations: readOnly,
      _meta: readSecurity,
    },
    async ({ classId, refresh, includeAssignments }) =>
      runTool(async () => {
        const current = await loadGradebook(userId, refresh, true);
        const { id, cls, raw, categoryIds } = classDetails(current, classId);
        const calculated = current.calculated?.classes.find(
          (course) => course.id === id,
        );
        const { assignments, ...gradebook } = raw;
        return {
          class: {
            ...calculated,
            categoryGrades: cls.sections.map((section, index) => {
              const percentage = sectionGradeForClass(cls, index);
              return {
                id: categoryIds[index],
                name: section.name,
                percentage:
                  percentage === false || !Number.isFinite(percentage)
                    ? null
                    : percentage,
                weight: section.weight ?? null,
                ...sectionGradePoints(section),
              };
            }),
            gradebook:
              includeAssignments === false
                ? gradebook
                : { ...gradebook, assignments },
          },
          freshness: freshness(current),
        };
      }),
  );

  server.registerTool(
    "list_assignments",
    {
      title: "List or search assignments",
      description:
        "Find missing, graded, or excused work by course, assignment title, or inclusive due-date range. Return assignment and category IDs, due dates, scores, and status. Use the same filters and nextOffset for additional pages. Percentage is a fraction (0.98 = 98%).",
      inputSchema: z
        .object({
          classId: classSelector.optional(),
          status: z.enum(["graded", "missing", "excused"]).optional(),
          dueFrom: z.iso
            .date()
            .optional()
            .describe("Earliest due date, inclusive (YYYY-MM-DD)."),
          dueThrough: z.iso
            .date()
            .optional()
            .describe("Latest due date, inclusive (YYYY-MM-DD)."),
          query: z
            .string()
            .trim()
            .min(1)
            .max(200)
            .optional()
            .describe("Substring of assignment title."),
          includeDetails: z
            .boolean()
            .optional()
            .describe(
              "Include assignment instructions, teacher notes, and score adjustments.",
            ),
          sort: z
            .enum(["due_asc", "due_desc"])
            .optional()
            .describe("Defaults to earliest due date first."),
          offset: z.number().int().min(0).max(2147483647).optional(),
          limit: z
            .number()
            .int()
            .min(1)
            .max(30)
            .optional()
            .describe("Defaults to 15."),
          refresh: refreshOption,
        })
        .refine(
          ({ dueFrom, dueThrough }) =>
            !dueFrom || !dueThrough || dueFrom <= dueThrough,
          {
            message: "dueFrom must be on or before dueThrough",
          },
        ),
      outputSchema: z.object({
        assignments: z.array(
          z.object({
            assignmentId: z.string(),
            classId: z.string(),
            className: z.string(),
            categoryId: z.string(),
            category: z.string().nullable(),
            name: z.string(),
            status: z.enum(["graded", "missing", "excused"]),
            dueDate: z.string(),
            earned: z.number().nullable(),
            possible: z.number().nullable(),
            percentage: z.number().nullable(),
            excluded: z.boolean(),
            extraCredit: z.boolean(),
            description: z.string().nullable().optional(),
            note: z.string().nullable().optional(),
            weight: z.string().nullable().optional(),
            curve: z.string().nullable().optional(),
            bonus: z.string().nullable().optional(),
            penalty: z.string().nullable().optional(),
          }),
        ),
        total: z.number().int(),
        nextOffset: z.number().int().nullable(),
        freshness: freshnessSchema,
      }),
      annotations: readOnly,
      _meta: readSecurity,
    },
    async ({ refresh, ...filters }) =>
      runTool(async () => {
        const current = await loadGradebook(userId, refresh);
        return {
          ...assignmentPage(current.state, filters),
          freshness: freshness(current),
        };
      }),
  );

  server.registerTool(
    "project_final_grade",
    {
      title: "Project a final exam grade",
      description:
        "Use your actual course grading rules to estimate a course grade or find the final exam score needed for a target. Use finalCategoryId from get_class. Input and output percentages use 0–100 units (90 means 90%). The optional replacement simulates a policy that replaces the lowest score in a different category only when the final improves it.",
      inputSchema: z
        .object({
          classId: classSelector,
          finalCategoryId: z.string().min(1).max(250),
          finalPossiblePoints: z.number().positive().max(1_000_000),
          finalPercent: z.number().min(0).max(FINAL_SEARCH_MAX).optional(),
          targetPercent: z.number().min(0).max(200).optional(),
          replaceCategoryId: z.string().min(1).max(250).optional(),
          refresh: refreshOption,
        })
        .refine(
          ({ finalPercent, targetPercent }) =>
            finalPercent !== undefined || targetPercent !== undefined,
          {
            message: "Provide finalPercent, targetPercent, or both",
          },
        ),
      outputSchema: z.object({
        course: z.object({
          id: z.string(),
          name: z.string(),
          gradingMethod: z.enum(["points", "mixed", "percent"]),
        }),
        finalCategory: z.string(),
        finalPossiblePoints: z.number(),
        replacementCategory: z.string().nullable(),
        finalPercent: z.number().optional(),
        projectedCoursePercent: z.number().nullable().optional(),
        targetCoursePercent: z.number().optional(),
        requiredFinalPercent: z.number().nullable().optional(),
        minimumCoursePercent: z.number().nullable().optional(),
        maximumCoursePercent: z.number().nullable().optional(),
        finalSearchCeilingPercent: z.number().optional(),
        freshness: freshnessSchema,
      }),
      annotations: readOnly,
      _meta: readSecurity,
    },
    async (input) =>
      runTool(async () => {
        const current = await loadGradebook(userId, input.refresh);
        const { id, cls, categoryIds } = classDetails(current, input.classId);
        const finalSectionIndex = categoryIds.indexOf(input.finalCategoryId);
        const replaceSectionIndex =
          input.replaceCategoryId === undefined
            ? undefined
            : categoryIds.indexOf(input.replaceCategoryId);
        if (finalSectionIndex < 0 || replaceSectionIndex === -1)
          throw new Error("CATEGORY_NOT_FOUND");
        if (finalSectionIndex === replaceSectionIndex)
          throw new Error("SAME_FINAL_CATEGORY");
        const options = {
          finalSectionIndex,
          replaceSectionIndex,
          finalPossiblePoints: input.finalPossiblePoints,
        };
        const projected =
          input.finalPercent === undefined
            ? undefined
            : gradeWithFinal(cls, {
                ...options,
                finalPercent: input.finalPercent / 100,
              });
        const target =
          input.targetPercent === undefined
            ? undefined
            : requiredFinalScore(cls, {
                ...options,
                targetPercent: input.targetPercent / 100,
              });
        return {
          course: {
            id,
            name: cls.displayName,
            gradingMethod: cls.gradingMethod,
          },
          finalCategory: cls.sections[finalSectionIndex].name,
          finalPossiblePoints: input.finalPossiblePoints,
          replacementCategory:
            replaceSectionIndex === undefined
              ? null
              : cls.sections[replaceSectionIndex].name,
          ...(projected === undefined
            ? {}
            : {
                finalPercent: input.finalPercent,
                projectedCoursePercent:
                  projected === null ? null : projected * 100,
              }),
          ...(target === undefined
            ? {}
            : {
                targetCoursePercent: input.targetPercent,
                requiredFinalPercent: target.score,
                minimumCoursePercent:
                  target.minGrade === null ? null : target.minGrade * 100,
                maximumCoursePercent:
                  target.maxGrade === null ? null : target.maxGrade * 100,
                finalSearchCeilingPercent: FINAL_SEARCH_MAX,
              }),
          freshness: freshness(current),
        };
      }),
  );

  server.registerTool(
    "get_gradebook_at",
    {
      title: "Get historical gradebook",
      description:
        "Get your gradebook at a saved revision ID or at the last observation on or before a timestamp. Revision takes precedence if both are provided. Use includeAssignments false for a smaller response.",
      inputSchema: z
        .object({
          revision: z.uuid().optional(),
          timestamp: z.iso.datetime({ offset: true }).optional(),
          includeAssignments: z
            .boolean()
            .optional()
            .describe("Defaults to true."),
        })
        .refine((input) => Boolean(input.revision || input.timestamp), {
          message: "revision or timestamp is required",
        }),
      annotations: readOnly,
      _meta: historySecurity,
    },
    async ({ revision, timestamp, includeAssignments }) =>
      runTool(async () => {
        const historical = await historicalGradebook(userId, {
          revisionId: revision,
          timestamp: timestamp ? new Date(timestamp) : undefined,
        });
        return {
          gradebook:
            includeAssignments === false
              ? {
                  ...historical.state,
                  classes: Object.fromEntries(
                    Object.entries(historical.state.classes).map(
                      ([id, { assignments: _assignments, ...course }]) => [
                        id,
                        course,
                      ],
                    ),
                  ),
                }
              : historical.state,
          calculated: historical.calculated,
        };
      }),
  );

  server.registerTool(
    "get_grade_history",
    {
      title: "Get observed grade history",
      description:
        "Page through saved grade observations, oldest to newest within each page. Starts with the latest 10 observations. Pass nextBefore as before for older pages. Returns both term GPAs and class grades. Use an assignment ID to track its score or opt in to all assignment records. Timestamps are observation times.",
      inputSchema: z.object({
        classId: classSelector.optional(),
        assignmentId: z
          .string()
          .trim()
          .min(1)
          .max(250)
          .optional()
          .describe(
            "Canonical assignment ID from list_assignments or get_class.",
          ),
        includeAssignments: z
          .boolean()
          .optional()
          .describe(
            "Defaults to false. Set true to include all assignment records for selected classes; an assignmentId always includes that assignment.",
          ),
        before: historyCursor,
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe(
            "Defaults to 10. With all assignment records, pages are limited to one revision.",
          ),
      }),
      annotations: readOnly,
      _meta: historySecurity,
    },
    async ({ classId, assignmentId, includeAssignments, before, limit }) =>
      runTool(async () => {
        const { rows, nextBefore } = await gradeHistoryWindow(userId, {
          before,
          limit: includeAssignments && !assignmentId ? 1 : (limit ?? 10),
        });
        const history = rows.map((revision) => {
          const report = reportProjection(revision.state);
          const calculated = calculateGradebook(revision.state, true, report);
          const classIds = new Set(
            classId
              ? matchingClassIds(revision.state, classId)
              : Object.keys(revision.state.classes),
          );
          const assignments =
            assignmentId || includeAssignments
              ? Object.fromEntries(
                  [...classIds].flatMap((id) => {
                    const records = revision.state.classes[id].assignments;
                    if (!assignmentId) return [[id, records]];
                    return Object.hasOwn(records, assignmentId)
                      ? [[id, { [assignmentId]: records[assignmentId] }]]
                      : [];
                  }),
                )
              : {};
          return {
            revision: revision.id,
            sequence: revision.sequence,
            firstObserved: revision.windowStartedAt ?? revision.observedAt,
            lastObserved: revision.observedAt,
            stateHash: revision.stateHash,
            term: revision.state.term,
            yearRange: revision.state.yearRange,
            schoolGpa: schoolGpas(report.classes),
            grades: calculated.classes.filter((item) => classIds.has(item.id)),
            assignments,
          };
        });
        return { history, nextBefore };
      }),
  );

  server.registerTool(
    "get_recent_changes",
    {
      title: "Get recent gradebook changes",
      description:
        "Summarize scores, due dates, missing work, and other student-facing changes in recent saved updates. Reads saved history without refreshing FACTS. Use nextBefore to examine earlier revisions.",
      inputSchema: z.object({
        before: historyCursor,
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("Number of saved revisions to inspect. Defaults to 3."),
        maxChangesPerRevision: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Defaults to 15. Use the revision ID with get_gradebook_at for a complete snapshot.",
          ),
      }),
      outputSchema: z.object({
        updates: z.array(
          z.object({
            revision: z.uuid(),
            observedAt: z.iso.datetime(),
            term: z.string(),
            schoolYear: z.string(),
            changes: z.array(
              z.object({
                className: z.string(),
                item: z.string(),
                kind: z.enum(["added", "removed", "changed"]),
                summary: z.string(),
              }),
            ),
            totalChanges: z.number().int(),
          }),
        ),
        nextBefore: z.number().int().nullable(),
      }),
      annotations: readOnly,
      _meta: historySecurity,
    },
    async ({ before, limit, maxChangesPerRevision }) =>
      runTool(async () => {
        const page = await revisionHistoryPage(userId, {
          before,
          limit: limit ?? 3,
        });
        return {
          updates: page.points.map(
            ({ id, observedAt, term, schoolYear, changes }) => ({
              revision: id,
              observedAt,
              term,
              schoolYear,
              changes: changes
                .slice(0, maxChangesPerRevision ?? 15)
                .map(({ className, item, kind, summary }) => ({
                  className,
                  item,
                  kind,
                  summary,
                })),
              totalChanges: changes.length,
            }),
          ),
          nextBefore: page.before,
        };
      }),
  );

  server.registerTool(
    "get_sync_status",
    {
      title: "Get grade sync status",
      description:
        "Check when your FACTS gradebook last synced, whether data is stale, and any safe error code. This does not refresh the source.",
      inputSchema: z.object({}),
      annotations: readOnly,
      _meta: readSecurity,
    },
    async () => runTool(() => syncStatus(userId)),
  );

  return server;
}
