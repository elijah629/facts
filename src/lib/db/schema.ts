import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { GradebookDelta, GradebookState } from "@/lib/gradebook/types";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const revisionKind = pgEnum("gradebook_revision_kind", [
  "initial",
  "delta",
]);

export const gradebookStreams = pgTable(
  "gradebook_streams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("gradebook_streams_user_uidx").on(table.userId)],
);

export const gradebookHeads = pgTable("gradebook_heads", {
  streamId: uuid("stream_id")
    .primaryKey()
    .references(() => gradebookStreams.id, { onDelete: "cascade" }),
  headRevisionId: uuid("head_revision_id").references(
    (): AnyPgColumn => gradebookRevisions.id,
    { onDelete: "set null" },
  ),
  headStateHash: text("head_state_hash"),
  headSequence: integer("head_sequence").default(-1).notNull(),
  currentState: jsonb("current_state").$type<GradebookState>(),
  activeSourceMessageId: text("active_source_message_id"),
  activeSourceEmailReceivedAt: timestamp("active_source_email_received_at", {
    withTimezone: true,
  }),
  encryptedActiveFactsUrl: text("encrypted_active_facts_url"),
  activeSourceDiscoveredAt: timestamp("active_source_discovered_at", {
    withTimezone: true,
  }),
  lastGmailScanAt: timestamp("last_gmail_scan_at", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastSuccessfulFetchAt: timestamp("last_successful_fetch_at", {
    withTimezone: true,
  }),
  lastErrorCode: text("last_error_code"),
  lastErrorMessage: text("last_error_message"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const gradebookRevisions = pgTable(
  "gradebook_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => gradebookStreams.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    kind: revisionKind("kind").notNull(),
    data: jsonb("data").$type<GradebookState | GradebookDelta>().notNull(),
    stateHash: text("state_hash").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    sourceMessageId: text("source_message_id"),
    sourceEmailReceivedAt: timestamp("source_email_received_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("gradebook_revisions_stream_sequence_uidx").on(
      table.streamId,
      table.sequence,
    ),
    index("gradebook_revisions_stream_observed_idx").on(
      table.streamId,
      table.observedAt,
    ),
  ],
);
