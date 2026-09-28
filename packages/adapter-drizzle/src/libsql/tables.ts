import type { DiagnosticsSnapshot, FeedbackStatus, FeedbackType, ScreenshotRegion } from "@siteping/core";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { DEFAULT_SITEPING_TABLE_NAMES, type SitepingTableNames } from "../constants/table-names.js";

/**
 * Build the SitePing tables for SQLite / libSQL (Turso). Export them from
 * your Drizzle schema so `drizzle-kit generate` / `push` creates them:
 *
 * ```ts
 * // db/schema.ts
 * export const { sitepingFeedbacks, sitepingAnnotations } = createSitepingSqliteTables();
 * ```
 *
 * JSON columns are stored as text and timestamps as epoch milliseconds. The
 * feedback table is an ordinary rowid table: its implicit `rowid`, which the
 * database assigns on every insert, breaks `createdAt` ties in the "newest
 * first" ordering — never redeclare it `WITHOUT ROWID`.
 */
export function createSitepingSqliteTables(names: SitepingTableNames = DEFAULT_SITEPING_TABLE_NAMES) {
  const sitepingFeedbacks = sqliteTable(
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
      screenshotRegion: text("screenshot_region", { mode: "json" }).$type<ScreenshotRegion>(),
      diagnostics: text("diagnostics", { mode: "json" }).$type<DiagnosticsSnapshot>(),
      viewport: text("viewport").notNull(),
      userAgent: text("user_agent").notNull(),
      authorName: text("author_name").notNull(),
      authorEmail: text("author_email").notNull(),
      clientId: text("client_id").notNull(),
      resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
      createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
      updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
      // `message` lowercased in JavaScript (`String.prototype.toLowerCase`, Unicode-aware), the
      // column the text search reads: SQLite's LIKE folds only ASCII case, so `Échec` would not
      // match `échec`. The store fills it on insert (a feedback's message never changes); rows
      // written before this column existed, or by the host application, stay NULL and the search
      // falls back to `message` with ASCII-only folding. Internal — never part of the feedback record.
      messageSearch: text("message_search"),
    },
    (table) => [
      uniqueIndex(`${names.feedbacks}_client_id_key`).on(table.clientId),
      index(`${names.feedbacks}_project_status_created_idx`).on(table.projectName, table.status, table.createdAt),
      index(`${names.feedbacks}_project_url_idx`).on(table.projectName, table.url),
    ],
  );

  const sitepingAnnotations = sqliteTable(
    names.annotations,
    {
      id: text("id").primaryKey(),
      feedbackId: text("feedback_id")
        .notNull()
        .references(() => sitepingFeedbacks.id, { onDelete: "cascade" }),
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
      xPct: real("x_pct").notNull(),
      yPct: real("y_pct").notNull(),
      wPct: real("w_pct").notNull(),
      hPct: real("h_pct").notNull(),
      scrollX: real("scroll_x").notNull(),
      scrollY: real("scroll_y").notNull(),
      viewportW: integer("viewport_w").notNull(),
      viewportH: integer("viewport_h").notNull(),
      devicePixelRatio: real("device_pixel_ratio").notNull().default(1),
      // Submission index within the feedback: `annotations[0]` is the primary anchor, and
      // every annotation of a feedback shares one `createdAt`. Rows written before this
      // column existed default to 0 and keep their `createdAt` order.
      position: integer("position").notNull().default(0),
      createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index(`${names.annotations}_feedback_id_idx`).on(table.feedbackId)],
  );

  return { sitepingFeedbacks, sitepingAnnotations };
}

export type SitepingSqliteTables = ReturnType<typeof createSitepingSqliteTables>;
