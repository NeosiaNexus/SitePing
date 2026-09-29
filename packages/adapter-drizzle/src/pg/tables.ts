import type {
  CommentAuthorRole,
  DiagnosticsSnapshot,
  FeedbackStatus,
  FeedbackType,
  ScreenshotRegion,
} from "@siteping/core";
import {
  bigint,
  doublePrecision,
  foreignKey,
  getTableConfig,
  index,
  integer,
  jsonb,
  type PgTable,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { DRIZZLE_STORE_MESSAGE_PREFIX } from "../constants/errors.js";
import { POSTGRES_IDENTIFIER_MAX_BYTES } from "../constants/sql.js";
import { DEFAULT_SITEPING_TABLE_NAMES, type SitepingTableNames } from "../constants/table-names.js";

/**
 * Refuse identifiers PostgreSQL would truncate. It cuts every name past
 * {@link POSTGRES_IDENTIFIER_MAX_BYTES} bytes without an error, so each later
 * `drizzle-kit push` or `generate` sees the declared name missing and drops
 * and recreates the index or foreign key — or two names cut to the same
 * prefix and the migration fails.
 *
 * @param tables - The tables, whose own, index and foreign-key names are checked.
 */
function assertIdentifiersFitPostgres(tables: readonly PgTable[]): void {
  const encoder = new TextEncoder();
  for (const table of tables) {
    const { name, indexes, foreignKeys } = getTableConfig(table);
    const identifiers = [
      name,
      ...indexes.flatMap((tableIndex) => tableIndex.config.name ?? []),
      ...foreignKeys.map((key) => key.getName()),
    ];
    for (const identifier of identifiers) {
      const bytes = encoder.encode(identifier).length;
      if (bytes > POSTGRES_IDENTIFIER_MAX_BYTES) {
        throw new RangeError(
          `${DRIZZLE_STORE_MESSAGE_PREFIX}: "${identifier}" is ${bytes} bytes long, over PostgreSQL's ${POSTGRES_IDENTIFIER_MAX_BYTES}-byte identifier limit — pass shorter table names to createSitepingPgTables`,
        );
      }
    }
  }
}

/**
 * Build the SitePing tables for PostgreSQL. Export them from your Drizzle
 * schema so `drizzle-kit generate` / `push` creates them:
 *
 * ```ts
 * // db/schema.ts
 * export const { sitepingFeedbacks, sitepingAnnotations, sitepingComments } = createSitepingPgTables();
 * ```
 *
 * Index and foreign-key names derive from the table names, which leaves the
 * feedback table at most 36 bytes, annotations 47 and comments 42.
 *
 * @throws `RangeError` when a table, index or foreign-key name would pass
 *   PostgreSQL's 63-byte identifier limit.
 */
export function createSitepingPgTables(names: SitepingTableNames = DEFAULT_SITEPING_TABLE_NAMES) {
  const sitepingFeedbacks = pgTable(
    names.feedbacks,
    {
      id: text("id").primaryKey(),
      projectName: text("project_name").notNull(),
      type: text("type").$type<FeedbackType>().notNull(),
      message: text("message").notNull(),
      status: text("status").$type<FeedbackStatus>().notNull().default("open"),
      url: text("url").notNull(),
      urlPattern: text("url_pattern"),
      screenshotUrl: text("screenshot_url"),
      screenshotRegion: jsonb("screenshot_region").$type<ScreenshotRegion>(),
      diagnostics: jsonb("diagnostics").$type<DiagnosticsSnapshot>(),
      viewport: text("viewport").notNull(),
      userAgent: text("user_agent").notNull(),
      authorName: text("author_name").notNull(),
      authorEmail: text("author_email").notNull(),
      clientId: text("client_id").notNull(),
      resolvedAt: timestamp("resolved_at", { withTimezone: true, precision: 3 }),
      createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
      updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
      // Database-wide insertion ordinal: breaks `createdAt` ties between rows created in the
      // same millisecond, by any store instance or process — or by the host application
      // inserting directly — so "newest first" and offset pages stay stable. The database
      // assigns it on every insert. Internal — never part of the feedback record.
      creationSequence: bigint("creation_sequence", { mode: "number" }).generatedAlwaysAsIdentity(),
      // `message` lowercased in JavaScript (`String.prototype.toLowerCase`, Unicode-aware), the
      // column the text search reads: `ILIKE` folds case with the collation / `LC_CTYPE`, so under
      // `C` `Échec` would not match `échec`. The store fills it on insert (a feedback's message
      // never changes); rows written by the host application stay NULL and the search falls
      // back to `message ILIKE`. Internal — never part of the feedback record.
      messageSearch: text("message_search"),
    },
    (table) => [
      uniqueIndex(`${names.feedbacks}_client_id_key`).on(table.clientId),
      index(`${names.feedbacks}_project_status_created_idx`).on(table.projectName, table.status, table.createdAt),
      index(`${names.feedbacks}_project_url_idx`).on(table.projectName, table.url),
    ],
  );

  const sitepingAnnotations = pgTable(
    names.annotations,
    {
      id: text("id").primaryKey(),
      feedbackId: text("feedback_id").notNull(),
      cssSelector: text("css_selector").notNull(),
      xpath: text("xpath").notNull(),
      textSnippet: text("text_snippet").notNull(),
      elementTag: text("element_tag").notNull(),
      elementId: text("element_id"),
      textPrefix: text("text_prefix").notNull(),
      textSuffix: text("text_suffix").notNull(),
      fingerprint: text("fingerprint").notNull(),
      neighborText: text("neighbor_text").notNull(),
      anchorKey: text("anchor_key"),
      xPct: doublePrecision("x_pct").notNull(),
      yPct: doublePrecision("y_pct").notNull(),
      wPct: doublePrecision("w_pct").notNull(),
      hPct: doublePrecision("h_pct").notNull(),
      scrollX: doublePrecision("scroll_x").notNull(),
      scrollY: doublePrecision("scroll_y").notNull(),
      viewportW: integer("viewport_w").notNull(),
      viewportH: integer("viewport_h").notNull(),
      devicePixelRatio: doublePrecision("device_pixel_ratio").notNull().default(1),
      // Submission index within the feedback: `annotations[0]` is the primary anchor, and
      // every annotation of a feedback shares one `createdAt`. Rows the host application
      // inserts without it default to 0 and keep their `createdAt` order.
      position: integer("position").notNull().default(0),
      createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
    },
    (table) => [
      foreignKey({
        name: `${names.annotations}_feedback_id_fk`,
        columns: [table.feedbackId],
        foreignColumns: [sitepingFeedbacks.id],
      }).onDelete("cascade"),
      index(`${names.annotations}_feedback_id_idx`).on(table.feedbackId),
    ],
  );

  const sitepingComments = pgTable(
    names.comments,
    {
      id: text("id").primaryKey(),
      feedbackId: text("feedback_id").notNull(),
      body: text("body").notNull(),
      authorName: text("author_name").notNull(),
      authorEmail: text("author_email").notNull(),
      authorRole: text("author_role").$type<CommentAuthorRole>().notNull().default("client"),
      clientId: text("client_id").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
      // Posting index within the thread, assigned by the insert itself: breaks `createdAt`
      // ties so a thread reads in posting order. Rows the host application inserts without
      // it default to 0 and keep their `createdAt` order.
      position: integer("position").notNull().default(0),
    },
    (table) => [
      foreignKey({
        name: `${names.comments}_feedback_id_fk`,
        columns: [table.feedbackId],
        foreignColumns: [sitepingFeedbacks.id],
      }).onDelete("cascade"),
      uniqueIndex(`${names.comments}_client_id_key`).on(table.clientId),
      index(`${names.comments}_feedback_created_idx`).on(table.feedbackId, table.createdAt),
    ],
  );

  assertIdentifiersFitPostgres([sitepingFeedbacks, sitepingAnnotations, sitepingComments]);
  return { sitepingFeedbacks, sitepingAnnotations, sitepingComments };
}

export type SitepingPgTables = ReturnType<typeof createSitepingPgTables>;
