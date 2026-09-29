import { inspect } from "node:util";
import {
  applyFeedbackFilters,
  buildFeedbackRecord,
  type CommentCreateInput,
  type FeedbackCreateInput,
  isStoreNotFound,
  isStorePersistence,
  type ScreenshotStorage,
} from "@siteping/core";
import { getTableName, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PROJECT_DELETE_CHUNK_SIZE } from "../src/constants/deletes.js";
import { SCREENSHOT_DELETE_CONCURRENCY } from "../src/constants/screenshots.js";
import { DEFAULT_SITEPING_TABLE_NAMES, type SitepingTableNames } from "../src/constants/table-names.js";
import { createLibSQLSitepingStore, createSitepingSqliteTables } from "../src/libsql/index.js";
import { createPgSitepingStore, createSitepingPgTables } from "../src/pg/index.js";
import type { DrizzleStore, DrizzleStoreOptions } from "../src/shared/store.js";
import { createLibSQLTestDatabase, createPgTestDatabase, type DriverCallInterceptor } from "./databases.js";

const SCREENSHOT_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
/** Response cap of the size-limited driver — smaller than one inline screenshot in the tests using it. */
const RESPONSE_SIZE_LIMIT_BYTES = 16 * 1024;
/** Time the injected test clocks start at, far from the real wall clock. */
const FROZEN_TIME_MS = Date.parse("2026-01-01T00:00:00.000Z");
const CUSTOM_TABLE_NAMES: SitepingTableNames = {
  feedbacks: "review_feedbacks",
  annotations: "review_annotations",
  comments: "review_comments",
};

function feedbackInput(overrides: Partial<FeedbackCreateInput> = {}): FeedbackCreateInput {
  return {
    projectName: "site",
    type: "bug",
    message: "Checkout button is broken",
    status: "open",
    url: "https://example.com/checkout",
    viewport: "1280x720",
    userAgent: "Mozilla/5.0",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    clientId: crypto.randomUUID(),
    annotations: [
      {
        cssSelector: "button.pay",
        xpath: "/html/body/button",
        textSnippet: "Pay",
        elementTag: "BUTTON",
        textPrefix: "",
        textSuffix: "",
        fingerprint: "1:0:pay",
        neighborText: "",
        xPct: 0,
        yPct: 0,
        wPct: 1,
        hPct: 1,
        scrollX: 0,
        scrollY: 0,
        viewportW: 1280,
        viewportH: 720,
        devicePixelRatio: 1,
      },
    ],
    ...overrides,
  };
}

function commentInput(overrides: Partial<CommentCreateInput> = {}): CommentCreateInput {
  return {
    body: "Fixed on staging",
    authorName: "Bob",
    authorEmail: "bob@example.com",
    authorRole: "team",
    clientId: crypto.randomUUID(),
    ...overrides,
  };
}

/** A feedback row written by the host application itself, bypassing the store; `now` stamps its timestamps. */
function applicationFeedbackRow(now?: Date) {
  const { annotations: _annotations, ...row } = buildFeedbackRecord(feedbackInput(), {
    id: crypto.randomUUID(),
    annotationId: () => crypto.randomUUID(),
    ...(now ? { now } : {}),
  });
  return row;
}

type ApplicationFeedbackRow = ReturnType<typeof applicationFeedbackRow>;

/** Annotation inputs told apart by their selector, to check the stored order. */
function orderedAnnotations(count: number): FeedbackCreateInput["annotations"] {
  const [template] = feedbackInput().annotations;
  if (!template) throw new Error("feedbackInput() must provide an annotation template");
  return Array.from({ length: count }, (_, index) => ({ ...template, cssSelector: `li:nth-child(${index + 1})` }));
}

/** Whether a driver call carries the store's feedback insert (PostgreSQL wraps it in a CTE, libSQL may batch it). */
function isFeedbackInsert(statementSql: string): boolean {
  return statementSql.toLowerCase().includes(`insert into "${DEFAULT_SITEPING_TABLE_NAMES.feedbacks}"`);
}

/** Whether a driver call deletes feedback rows (libSQL batches it with the annotation delete). */
function isFeedbackDelete(statementSql: string): boolean {
  return statementSql.toLowerCase().includes(`delete from "${DEFAULT_SITEPING_TABLE_NAMES.feedbacks}"`);
}

/** Whether a driver call reads feedback rows. */
function isFeedbackRead(statementSql: string): boolean {
  const normalizedSql = statementSql.toLowerCase();
  return (
    normalizedSql.startsWith("select") && normalizedSql.includes(`from "${DEFAULT_SITEPING_TABLE_NAMES.feedbacks}"`)
  );
}

/** Whether a driver call reads annotation rows. */
function isAnnotationRead(statementSql: string): boolean {
  const normalizedSql = statementSql.toLowerCase();
  return (
    normalizedSql.startsWith("select") && normalizedSql.includes(`from "${DEFAULT_SITEPING_TABLE_NAMES.annotations}"`)
  );
}

/** Whether a driver call writes comment rows. */
function isCommentWrite(statementSql: string): boolean {
  const normalizedSql = statementSql.toLowerCase();
  const table = `"${DEFAULT_SITEPING_TABLE_NAMES.comments}"`;
  return normalizedSql.includes(`insert into ${table}`) || normalizedSql.includes(`delete from ${table}`);
}

/** Whether a driver call updates feedback rows. */
function isFeedbackUpdate(statementSql: string): boolean {
  return statementSql.toLowerCase().includes(`update "${DEFAULT_SITEPING_TABLE_NAMES.feedbacks}"`);
}

/** Rows per insert of a bulk application import — keeps each statement below SQLite's bound-parameter limit. */
const APPLICATION_INSERT_BATCH_SIZE = 200;
/** Response cap of the size-limited driver in the bulk-delete tests — one delete chunk fits, a whole test project does not. */
const BULK_DELETE_RESPONSE_LIMIT_BYTES = 256 * 1024;
/** Characters padding each external screenshot URL of the bulk-delete tests, so a project's URLs outgrow the cap. */
const LONG_SCREENSHOT_URL_PADDING_LENGTH = 200;

/** Application rows of `projectName` whose screenshots are stored externally under long, row-unique URLs. */
function externallyStoredScreenshotRows(count: number, projectName = "site"): ApplicationFeedbackRow[] {
  return Array.from({ length: count }, () => {
    const row = applicationFeedbackRow();
    const padding = "x".repeat(LONG_SCREENSHOT_URL_PADDING_LENGTH);
    return { ...row, projectName, screenshotUrl: `https://cdn.example.com/${row.id}/${padding}.jpg` };
  });
}

/** An error followed by its `cause`s — Drizzle's PostgreSQL session wraps driver errors in a `DrizzleQueryError`. */
function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  for (let current = error; current !== undefined && !chain.includes(current); ) {
    chain.push(current);
    current = current instanceof Error ? current.cause : undefined;
  }
  return chain;
}

/**
 * A driver call's result — one result or a libSQL batch of them — reporting only the rows
 * `reported` keeps of those its statement returned.
 */
function withReportedRows(result: unknown, reported: (rows: unknown[]) => unknown[]): unknown {
  if (Array.isArray(result)) return result.map((single) => withReportedRows(single, reported));
  const { rows } = result as { rows: unknown[] };
  return { ...(result as object), rows: reported(rows) };
}

const REJECTED_WRITE_OPERATIONS = ["INSERT", "UPDATE", "DELETE"] as const;

interface DialectUnderTest {
  name: string;
  open(names?: SitepingTableNames): Promise<{
    createStore(options?: DrizzleStoreOptions): DrizzleStore;
    /** A store on the same database, reached through a driver that caps response size. */
    createStoreBehindResponseSizeLimit(maxResponseBytes: number, options?: DrizzleStoreOptions): DrizzleStore;
    /** A store on the same database whose driver calls all go through `intercept`. */
    createStoreWithDriverInterceptor(intercept: DriverCallInterceptor, options?: DrizzleStoreOptions): DrizzleStore;
    countAnnotations(): Promise<number>;
    countComments(): Promise<number>;
    /** Write through the same `db` as the host application would — an insert and a bulk update, outside the store. */
    writeAsApplication(): Promise<void>;
    /** Insert one feedback row through the exported table, as the host application would — no internal column set. */
    insertFeedbackAsApplication(row: ApplicationFeedbackRow): Promise<void>;
    /** Insert many feedback rows through the exported table, as the host application's bulk import would. */
    insertFeedbacksAsApplication(rows: readonly ApplicationFeedbackRow[]): Promise<void>;
    /** Re-insert every annotation row in reverse physical order, as a dump/restore or a table rewrite may. */
    reverseAnnotationStorageOrder(): Promise<void>;
    /** Re-insert every comment row in reverse physical order, as a dump/restore or a table rewrite may. */
    reverseCommentStorageOrder(): Promise<void>;
    /**
     * Make the database's own case folding of `message` ASCII-only, as a PostgreSQL database
     * created with `LC_CTYPE = 'C'` does; resolves to the undo. SQLite's LIKE already folds
     * only ASCII case, so libSQL needs no change.
     */
    foldMessageCaseAsciiOnly(): Promise<() => Promise<void>>;
    /**
     * Stop enforcing foreign keys, as a libSQL connection without `PRAGMA foreign_keys = ON`
     * does; resolves to the undo. PostgreSQL always enforces them, so it needs no change.
     */
    stopEnforcingForeignKeys(): Promise<() => Promise<void>>;
    /** Make the database reject writes to the feedback table; resolves to the undo. */
    rejectFeedbackWrites(): Promise<() => Promise<void>>;
    /**
     * Make the database skip deletes of feedback rows without an error, as a trigger or a
     * row-level security policy may; resolves to the undo.
     */
    skipFeedbackDeletes(): Promise<() => Promise<void>>;
    reset(): Promise<void>;
    close(): Promise<void>;
  }>;
}

const dialects: DialectUnderTest[] = [
  {
    name: "PostgreSQL (PGlite)",
    async open(names) {
      const database = await createPgTestDatabase(names);
      const tables = createSitepingPgTables(names);
      return {
        createStore: (options) => createPgSitepingStore(database.db, { ...options, tables }),
        createStoreBehindResponseSizeLimit: (maxResponseBytes, options) =>
          createPgSitepingStore(database.withResponseSizeLimit(maxResponseBytes), { ...options, tables }),
        createStoreWithDriverInterceptor: (intercept, options) =>
          createPgSitepingStore(database.withDriverCallInterceptor(intercept), { ...options, tables }),
        countAnnotations: async () => (await database.db.select().from(tables.sitepingAnnotations)).length,
        countComments: async () => (await database.db.select().from(tables.sitepingComments)).length,
        async writeAsApplication() {
          await database.db.insert(tables.sitepingFeedbacks).values(applicationFeedbackRow());
          await database.db.update(tables.sitepingFeedbacks).set({ authorName: "Edited by the application" });
        },
        async insertFeedbackAsApplication(row) {
          await database.db.insert(tables.sitepingFeedbacks).values(row);
        },
        async insertFeedbacksAsApplication(rows) {
          for (let start = 0; start < rows.length; start += APPLICATION_INSERT_BATCH_SIZE) {
            await database.db
              .insert(tables.sitepingFeedbacks)
              .values(rows.slice(start, start + APPLICATION_INSERT_BATCH_SIZE));
          }
        },
        async reverseAnnotationStorageOrder() {
          const rows = await database.db.select().from(tables.sitepingAnnotations);
          await database.db.delete(tables.sitepingAnnotations);
          for (const row of rows.reverse()) await database.db.insert(tables.sitepingAnnotations).values(row);
        },
        async reverseCommentStorageOrder() {
          const rows = await database.db.select().from(tables.sitepingComments);
          await database.db.delete(tables.sitepingComments);
          for (const row of rows.reverse()) await database.db.insert(tables.sitepingComments).values(row);
        },
        async foldMessageCaseAsciiOnly() {
          const alterMessageCollation = (collation: string) =>
            database.db.execute(
              sql`ALTER TABLE ${tables.sitepingFeedbacks} ALTER COLUMN ${sql.identifier(tables.sitepingFeedbacks.message.name)} TYPE text COLLATE ${sql.identifier(collation)}`,
            );
          await alterMessageCollation("C");
          return async () => {
            await alterMessageCollation("default");
          };
        },
        async stopEnforcingForeignKeys() {
          return async () => {};
        },
        async rejectFeedbackWrites() {
          // PGlite is a single session: every later statement runs read-only.
          await database.db.execute(sql`SET default_transaction_read_only = on`);
          return async () => {
            await database.db.execute(sql`SET default_transaction_read_only = off`);
          };
        },
        async skipFeedbackDeletes() {
          await database.db.execute(
            sql`CREATE FUNCTION skip_feedback_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$`,
          );
          await database.db.execute(
            sql`CREATE TRIGGER skip_feedback_delete BEFORE DELETE ON ${tables.sitepingFeedbacks} FOR EACH ROW EXECUTE FUNCTION skip_feedback_delete()`,
          );
          return async () => {
            await database.db.execute(sql`DROP TRIGGER skip_feedback_delete ON ${tables.sitepingFeedbacks}`);
            await database.db.execute(sql`DROP FUNCTION skip_feedback_delete()`);
          };
        },
        reset: database.reset,
        close: database.close,
      };
    },
  },
  {
    name: "libSQL (Turso)",
    async open(names) {
      const database = await createLibSQLTestDatabase(names);
      const tables = createSitepingSqliteTables(names);
      return {
        createStore: (options) => createLibSQLSitepingStore(database.db, { ...options, tables }),
        createStoreBehindResponseSizeLimit: (maxResponseBytes, options) =>
          createLibSQLSitepingStore(database.withResponseSizeLimit(maxResponseBytes), { ...options, tables }),
        createStoreWithDriverInterceptor: (intercept, options) =>
          createLibSQLSitepingStore(database.withDriverCallInterceptor(intercept), { ...options, tables }),
        countAnnotations: async () => (await database.db.select().from(tables.sitepingAnnotations)).length,
        countComments: async () => (await database.db.select().from(tables.sitepingComments)).length,
        async writeAsApplication() {
          await database.db.insert(tables.sitepingFeedbacks).values(applicationFeedbackRow());
          await database.db.update(tables.sitepingFeedbacks).set({ authorName: "Edited by the application" });
        },
        async insertFeedbackAsApplication(row) {
          await database.db.insert(tables.sitepingFeedbacks).values(row);
        },
        async insertFeedbacksAsApplication(rows) {
          for (let start = 0; start < rows.length; start += APPLICATION_INSERT_BATCH_SIZE) {
            await database.db
              .insert(tables.sitepingFeedbacks)
              .values(rows.slice(start, start + APPLICATION_INSERT_BATCH_SIZE));
          }
        },
        async reverseAnnotationStorageOrder() {
          const rows = await database.db.select().from(tables.sitepingAnnotations);
          await database.db.delete(tables.sitepingAnnotations);
          for (const row of rows.reverse()) await database.db.insert(tables.sitepingAnnotations).values(row);
        },
        async reverseCommentStorageOrder() {
          const rows = await database.db.select().from(tables.sitepingComments);
          await database.db.delete(tables.sitepingComments);
          for (const row of rows.reverse()) await database.db.insert(tables.sitepingComments).values(row);
        },
        async foldMessageCaseAsciiOnly() {
          return async () => {};
        },
        async stopEnforcingForeignKeys() {
          await database.db.run(sql`PRAGMA foreign_keys = OFF`);
          return async () => {
            await database.db.run(sql`PRAGMA foreign_keys = ON`);
          };
        },
        async rejectFeedbackWrites() {
          const feedbackTable = sql.identifier(getTableName(tables.sitepingFeedbacks));
          const triggerName = (operation: string) => sql.identifier(`reject_feedback_${operation.toLowerCase()}`);
          for (const operation of REJECTED_WRITE_OPERATIONS) {
            await database.db.run(
              sql`CREATE TRIGGER ${triggerName(operation)} BEFORE ${sql.raw(operation)} ON ${feedbackTable} BEGIN SELECT RAISE(ABORT, 'database is read-only'); END`,
            );
          }
          return async () => {
            for (const operation of REJECTED_WRITE_OPERATIONS) {
              await database.db.run(sql`DROP TRIGGER ${triggerName(operation)}`);
            }
          };
        },
        async skipFeedbackDeletes() {
          const feedbackTable = sql.identifier(getTableName(tables.sitepingFeedbacks));
          await database.db.run(
            sql`CREATE TRIGGER skip_feedback_delete BEFORE DELETE ON ${feedbackTable} BEGIN SELECT RAISE(IGNORE); END`,
          );
          return async () => {
            await database.db.run(sql`DROP TRIGGER skip_feedback_delete`);
          };
        },
        reset: database.reset,
        close: database.close,
      };
    },
  },
];

/** URL a contract-breaking storage returns for every upload, whatever the feedback id. */
const SHARED_SCREENSHOT_URL = "https://cdn.example.com/content-addressed.jpg";

/**
 * A storage that breaks the `ScreenshotStorage` URL ownership rule by ignoring the
 * feedback id (as content-addressed keys do) — the store's reference check is its
 * only defense, outside the contract.
 */
function sharedUrlStorage() {
  return recordingStorage({
    async upload() {
      return { url: SHARED_SCREENSHOT_URL };
    },
  });
}

function recordingStorage(overrides: Partial<ScreenshotStorage> = {}) {
  const uploads: Array<{ feedbackId: string; mimeType: string }> = [];
  const deletions: string[] = [];
  const storage: ScreenshotStorage = {
    async upload(_dataUrl, context) {
      uploads.push(context);
      return { url: `https://cdn.example.com/${context.feedbackId}.jpg` };
    },
    async delete(url) {
      deletions.push(url);
    },
    ...overrides,
  };
  return { storage, uploads, deletions };
}

for (const dialect of dialects) {
  describe(`DrizzleStore — ${dialect.name}`, () => {
    let database: Awaited<ReturnType<DialectUnderTest["open"]>>;
    const logger = { warn: vi.fn() };

    beforeAll(async () => {
      database = await dialect.open();
    });
    afterAll(() => database.close());
    beforeEach(async () => {
      await database.reset();
      logger.warn.mockClear();
    });

    it("persists the storage URL instead of the data URL and deletes it with the feedback", async () => {
      const { storage, uploads, deletions } = recordingStorage();
      const store = database.createStore({ screenshotStorage: storage, logger });
      const input = feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL });

      const created = await store.createFeedback(input);
      await store.deleteFeedback(created.id);

      // Uploaded under the record id — server-generated, unlike the clientId.
      expect(uploads).toEqual([{ feedbackId: created.id, mimeType: "image/jpeg" }]);
      expect(created.screenshotUrl).toBe(`https://cdn.example.com/${created.id}.jpg`);
      expect(deletions).toEqual([created.screenshotUrl]);
    });

    it("uploads each screenshot with the MIME type its data URL declares, JPEG, PNG or WebP only", async () => {
      const { storage, uploads } = recordingStorage();
      const store = database.createStore({ screenshotStorage: storage, logger });

      for (const dataUrl of [
        "data:image/png;base64,iVBORw0KGgo=",
        "data:image/webp;base64,UklGRg==",
        SCREENSHOT_DATA_URL,
        "data:IMAGE/PNG;base64,iVBORw0KGgo=",
        "data:;base64,/9j/4AAQ",
        // The store is public: its callers skip the HTTP schema, and an SVG label is script-capable.
        "data:image/svg+xml;base64,PHN2Zz4=",
      ]) {
        await store.createFeedback(feedbackInput({ screenshotDataUrl: dataUrl }));
      }

      expect(uploads.map((upload) => upload.mimeType)).toEqual([
        "image/png",
        "image/webp",
        "image/jpeg",
        "image/png",
        "image/jpeg",
        "image/jpeg",
      ]);
    });

    it("does not upload again when a clientId is replayed", async () => {
      const { storage, uploads } = recordingStorage();
      const store = database.createStore({ screenshotStorage: storage, logger });
      const input = feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL });

      const first = await store.createFeedback(input);
      const replay = await store.createFeedback(input);

      expect(replay.id).toBe(first.id);
      expect(uploads).toHaveLength(1);
    });

    it("reports created only for the first createFeedbackIfAbsent of a clientId", async () => {
      const store = database.createStore({ logger });
      const input = feedbackInput();

      const first = await store.createFeedbackIfAbsent(input);
      const replay = await store.createFeedbackIfAbsent(input);

      expect(first.created).toBe(true);
      expect(replay).toEqual({ feedback: expect.objectContaining({ id: first.feedback.id }), created: false });
    });

    it("inserts once and discards the losers' uploads when separate store instances race on a clientId", async () => {
      let uploadCount = 0;
      const { storage, deletions } = recordingStorage({
        async upload(_dataUrl, context) {
          uploadCount += 1;
          return { url: `https://cdn.example.com/${context.feedbackId}-${uploadCount}.jpg` };
        },
      });
      // Distinct instances share nothing in memory, so only the database's
      // unique clientId index can arbitrate — as with several server processes.
      const stores = [1, 2, 3].map(() => database.createStore({ screenshotStorage: storage, logger }));
      const input = feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL });

      const outcomes = await Promise.all(stores.map((store) => store.createFeedbackIfAbsent(input)));

      const inserted = outcomes.filter((outcome) => outcome.created);
      expect(inserted).toHaveLength(1);
      const winner = inserted[0]?.feedback;
      for (const outcome of outcomes) expect(outcome.feedback.id).toBe(winner?.id);
      expect((await stores[0]?.getFeedbacks({ projectName: "site" }))?.total).toBe(1);
      expect(await database.countAnnotations()).toBe(1);
      // Every caller that uploaded but lost the insert deletes its own upload, never the winner's.
      expect(deletions).toHaveLength(uploadCount - 1);
      expect(deletions).not.toContain(winner?.screenshotUrl);
    });

    it("keeps the winner's own screenshot when a racing loser finishes uploading last", async () => {
      // An object store keyed by the upload's feedbackId, as the documented key pattern builds it.
      const objects = new Map<string, string>();
      let releaseLateUpload: () => void = () => {};
      const lateUploadGate = new Promise<void>((resolve) => {
        releaseLateUpload = resolve;
      });
      const lateScreenshot = `${SCREENSHOT_DATA_URL}late`;
      const storage: ScreenshotStorage = {
        async upload(dataUrl, context) {
          if (dataUrl === lateScreenshot) await lateUploadGate;
          const url = `https://cdn.example.com/${context.feedbackId}.jpg`;
          objects.set(url, dataUrl);
          return { url };
        },
        async delete(url) {
          objects.delete(url);
        },
      };
      const clientId = crypto.randomUUID();
      const [lateStore, winningStore] = [1, 2].map(() => database.createStore({ screenshotStorage: storage, logger }));

      // Both attempts miss the clientId lookup; the late one uploads only after the other inserted.
      const lateAttempt = lateStore?.createFeedbackIfAbsent(
        feedbackInput({ clientId, screenshotDataUrl: lateScreenshot }),
      );
      const winner = await winningStore?.createFeedbackIfAbsent(
        feedbackInput({ clientId, screenshotDataUrl: SCREENSHOT_DATA_URL }),
      );
      releaseLateUpload();
      const loser = await lateAttempt;

      expect(winner?.created).toBe(true);
      expect(loser).toEqual({ feedback: expect.objectContaining({ id: winner?.feedback.id }), created: false });
      const winnerScreenshotUrl = winner?.feedback.screenshotUrl ?? "";
      expect(objects.get(winnerScreenshotUrl)).toBe(SCREENSHOT_DATA_URL);
      // The loser's own object is cleaned up; only the winner's remains.
      expect([...objects.keys()]).toEqual([winnerScreenshotUrl]);
    });

    describe("when a duplicate create loses the insert race and reading the winner back fails", () => {
      /**
       * A loser store whose feedback insert conflicts: right before that insert runs,
       * a separate store inserts the winning row for the same clientId (the loser has
       * already missed it in its first lookup and uploaded its screenshot).
       * `afterLostInsert` runs once the conflicting insert has completed.
       */
      function loserAgainstWinner(
        clientId: string,
        storage: ScreenshotStorage,
        afterLostInsert: (winnerId: string) => Promise<void>,
        interceptLaterCall: DriverCallInterceptor = (_statementSql, run) => run(),
      ): DrizzleStore {
        const referee = database.createStore({ logger });
        let lostInsert = false;
        return database.createStoreWithDriverInterceptor(
          async (statementSql, run) => {
            if (lostInsert) return interceptLaterCall(statementSql, run);
            if (!isFeedbackInsert(statementSql)) return run();
            const winner = await referee.createFeedback(feedbackInput({ clientId }));
            const result = await run();
            lostInsert = true;
            await afterLostInsert(winner.id);
            return result;
          },
          { screenshotStorage: storage, logger },
        );
      }

      it("discards the loser's upload when the winning row is deleted before the loser reads it back", async () => {
        const { storage, uploads, deletions } = recordingStorage();
        const clientId = crypto.randomUUID();
        const cleanup = database.createStore({ logger });
        const loser = loserAgainstWinner(clientId, storage, (winnerId) => cleanup.deleteFeedback(winnerId));

        await expect(
          loser.createFeedbackIfAbsent(feedbackInput({ clientId, screenshotDataUrl: SCREENSHOT_DATA_URL })),
        ).rejects.toThrow(`clientId ${clientId} conflicted but no row was found`);

        expect(uploads).toHaveLength(1);
        expect(deletions).toEqual([`https://cdn.example.com/${uploads[0]?.feedbackId}.jpg`]);
        expect((await cleanup.getFeedbacks({ projectName: "site" })).total).toBe(0);
      });

      it("discards the loser's upload and reports a StorePersistenceError when reading the winning row back rejects", async () => {
        const { storage, uploads, deletions } = recordingStorage();
        const clientId = crypto.randomUUID();
        const lookupFailure = new Error("connection lost while reading the winning row back");
        let lookupRejected = false;
        const loser = loserAgainstWinner(
          clientId,
          storage,
          async () => {},
          (_statementSql, run) => {
            if (lookupRejected) return run();
            lookupRejected = true;
            return Promise.reject(lookupFailure);
          },
        );

        const failure = await loser
          .createFeedbackIfAbsent(feedbackInput({ clientId, screenshotDataUrl: SCREENSHOT_DATA_URL }))
          .then(
            () => null,
            (error: unknown) => error,
          );

        expect(isStorePersistence(failure)).toBe(true);
        expect(causeChain(failure)).toContain(lookupFailure);

        expect(uploads).toHaveLength(1);
        expect(deletions).toEqual([`https://cdn.example.com/${uploads[0]?.feedbackId}.jpg`]);
        const stored = await database.createStore({ logger }).findByClientId(clientId);
        expect(stored?.screenshotUrl).toBeNull();
      });
    });

    it("keeps the winner's screenshot when a contract-breaking storage shares one URL across racing uploads", async () => {
      const { storage, deletions } = sharedUrlStorage();
      const stores = [1, 2, 3].map(() => database.createStore({ screenshotStorage: storage, logger }));
      const input = feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL });

      const outcomes = await Promise.all(stores.map((store) => store.createFeedbackIfAbsent(input)));

      expect(outcomes.filter((outcome) => outcome.created)).toHaveLength(1);
      expect(deletions).toEqual([]);
    });

    it("completes concurrent creates, updates and deletes issued from one process", async () => {
      const store = database.createStore({ logger });
      const [toUpdate, toDelete] = await Promise.all([
        store.createFeedback(feedbackInput()),
        store.createFeedback(feedbackInput()),
      ]);

      await Promise.all([
        store.createFeedback(feedbackInput()),
        store.updateFeedback(toUpdate.id, { status: "in_progress", resolvedAt: null }),
        store.deleteFeedback(toDelete.id),
        store.createFeedbackIfAbsent(feedbackInput()),
      ]);

      const page = await store.getFeedbacks({ projectName: "site" });
      expect(page.total).toBe(3);
      expect(page.feedbacks.find((feedback) => feedback.id === toUpdate.id)?.status).toBe("in_progress");
      expect(await store.verifyProjectOwnership(toDelete.id, "site")).toBe(false);
    });

    it("saves the feedback without screenshot and warns when the upload fails", async () => {
      const uploadError = new Error("storage unavailable");
      const { storage } = recordingStorage({ upload: () => Promise.reject(uploadError) });
      const store = database.createStore({ screenshotStorage: storage, logger });

      const created = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));

      expect(created.screenshotUrl).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("upload failed"), {
        clientId: created.clientId,
        feedbackId: created.id,
        error: uploadError,
      });
    });

    it("leaves degraded-path reporting to the host application when no logger is injected", async () => {
      const consoleWarn = vi.spyOn(console, "warn");
      try {
        const { storage } = recordingStorage({ upload: () => Promise.reject(new Error("storage unavailable")) });
        const withFailingStorage = database.createStore({ screenshotStorage: storage });
        const withInlineScreenshots = database.createStore();

        const created = await withFailingStorage.createFeedback(
          feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }),
        );
        await withInlineScreenshots.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));

        expect(created.screenshotUrl).toBeNull();
        expect(consoleWarn).not.toHaveBeenCalled();
      } finally {
        consoleWarn.mockRestore();
      }
    });

    it("cleans up every uploaded screenshot of a project on deleteAllFeedbacks", async () => {
      const { storage, deletions } = recordingStorage();
      const store = database.createStore({ screenshotStorage: storage, logger });
      const withScreenshot = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));
      await store.createFeedback(feedbackInput());
      await store.createFeedback(feedbackInput({ projectName: "other-site", screenshotDataUrl: SCREENSHOT_DATA_URL }));

      await store.deleteAllFeedbacks("site");

      expect(deletions).toEqual([withScreenshot.screenshotUrl]);
      expect((await store.getFeedbacks({ projectName: "other-site" })).total).toBe(1);
    });

    it("keeps a screenshot a contract-breaking storage shares across feedbacks until the last one referencing it is deleted", async () => {
      const { storage, deletions } = sharedUrlStorage();
      const store = database.createStore({ screenshotStorage: storage, logger });
      const first = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));
      const second = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));
      expect([first.screenshotUrl, second.screenshotUrl]).toEqual([SHARED_SCREENSHOT_URL, SHARED_SCREENSHOT_URL]);

      await store.deleteFeedback(first.id);
      expect(deletions).toEqual([]);

      await store.deleteFeedback(second.id);
      expect(deletions).toEqual([SHARED_SCREENSHOT_URL]);
    });

    it("keeps a screenshot a contract-breaking storage shares with another project on deleteAllFeedbacks, and deletes it once when the last project goes", async () => {
      const { storage, deletions } = sharedUrlStorage();
      const store = database.createStore({ screenshotStorage: storage, logger });
      await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));
      await store.createFeedback(feedbackInput({ projectName: "other-site", screenshotDataUrl: SCREENSHOT_DATA_URL }));
      await store.createFeedback(feedbackInput({ projectName: "other-site", screenshotDataUrl: SCREENSHOT_DATA_URL }));

      await store.deleteAllFeedbacks("site");
      expect(deletions).toEqual([]);

      await store.deleteAllFeedbacks("other-site");
      expect(deletions).toEqual([SHARED_SCREENSHOT_URL]);
    });

    it("completes deletes and keeps cleaning up when the delete hook throws synchronously", async () => {
      const cleanupError = new Error("storage client not ready");
      let failingUrl = "";
      const { storage, deletions } = recordingStorage();
      const recordDeletion = storage.delete?.bind(storage);
      storage.delete = (url) => {
        if (url === failingUrl) throw cleanupError;
        return recordDeletion?.(url) ?? Promise.resolve();
      };
      const store = database.createStore({ screenshotStorage: storage, logger });
      const single = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));
      const failing = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));
      const cleaned = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));
      failingUrl = single.screenshotUrl ?? "";

      await expect(store.deleteFeedback(single.id)).resolves.toBeUndefined();
      failingUrl = failing.screenshotUrl ?? "";
      await expect(store.deleteAllFeedbacks("site")).resolves.toBeUndefined();

      expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(0);
      expect(deletions).toEqual([cleaned.screenshotUrl]);
      for (const screenshotUrl of [single.screenshotUrl, failing.screenshotUrl]) {
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("delete failed"), {
          screenshotUrl,
          error: cleanupError,
        });
      }
    });

    it("keeps at most the concurrency limit of storage deletions in flight when a project delete frees many screenshots", async () => {
      const screenshotCount = 50;
      let inFlight = 0;
      let peakInFlight = 0;
      const { storage, deletions } = recordingStorage();
      const recordDeletion = storage.delete?.bind(storage);
      storage.delete = async (url) => {
        inFlight += 1;
        peakInFlight = Math.max(peakInFlight, inFlight);
        // Keep each deletion pending across a macrotask so concurrent calls overlap.
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        await recordDeletion?.(url);
      };
      const store = database.createStore({ screenshotStorage: storage, logger });
      const created = await Promise.all(
        Array.from({ length: screenshotCount }, () =>
          store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL })),
        ),
      );

      await store.deleteAllFeedbacks("site");

      expect(peakInFlight).toBe(SCREENSHOT_DELETE_CONCURRENCY);
      expect([...deletions].sort()).toEqual(created.map((feedback) => feedback.screenshotUrl).sort());
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("removes the annotations and comments of deleted feedbacks, even where the database does not enforce foreign keys", async () => {
      const restoreForeignKeys = await database.stopEnforcingForeignKeys();
      try {
        const store = database.createStore({ logger });
        // A delete hook switches deleteAllFeedbacks to its chunked path.
        const storeWithDeleteHook = database.createStore({ logger, screenshotStorage: recordingStorage().storage });
        const created = [
          await store.createFeedback(feedbackInput()),
          await store.createFeedback(feedbackInput({ projectName: "bulk" })),
          await store.createFeedback(feedbackInput({ projectName: "chunked" })),
          await store.createFeedback(feedbackInput({ projectName: "kept" })),
        ];
        for (const feedback of created) await store.addComment(feedback.id, commentInput());
        const [single] = created;
        if (!single) throw new Error("fixture");

        await store.deleteFeedback(single.id);
        await store.deleteAllFeedbacks("bulk");
        await storeWithDeleteHook.deleteAllFeedbacks("chunked");

        expect(await database.countAnnotations()).toBe(1);
        expect(await database.countComments()).toBe(1);
      } finally {
        await restoreForeignKeys();
      }
    });

    describe("when updateFeedback meets a database failure", () => {
      it("leaves the row untouched and reports a StorePersistenceError when reading the annotations fails", async () => {
        const stored = await database.createStore({ logger }).createFeedback(feedbackInput());
        const readFailure = new Error("connection lost while reading the annotations");
        const store = database.createStoreWithDriverInterceptor(
          (statementSql, run) => (isAnnotationRead(statementSql) ? Promise.reject(readFailure) : run()),
          { logger },
        );

        const failure = await store.updateFeedback(stored.id, { status: "in_progress", resolvedAt: null }).then(
          () => null,
          (error: unknown) => error,
        );

        expect(isStorePersistence(failure)).toBe(true);
        expect(causeChain(failure)).toContain(readFailure);
        const [unchanged] = (await database.createStore({ logger }).getFeedbacks({ projectName: "site" })).feedbacks;
        expect(unchanged).toMatchObject({ id: stored.id, status: "open", updatedAt: stored.updatedAt });
      });

      it("returns the updated record without querying the database once the update has committed", async () => {
        const stored = await database.createStore({ logger }).createFeedback(feedbackInput());
        let updateCommitted = false;
        const store = database.createStoreWithDriverInterceptor(
          async (statementSql, run) => {
            if (updateCommitted) throw new Error(`unexpected query after the update committed: ${statementSql}`);
            const result = await run();
            if (isFeedbackUpdate(statementSql)) updateCommitted = true;
            return result;
          },
          { logger },
        );

        const updated = await store.updateFeedback(stored.id, { status: "in_progress", resolvedAt: null });

        expect(updateCommitted).toBe(true);
        expect(updated).toMatchObject({ id: stored.id, status: "in_progress", annotations: stored.annotations });
      });
    });

    describe("when deleteAllFeedbacks frees more screenshots than one driver response can carry", () => {
      it("deletes every row and cleans up every screenshot through a size-capped driver", async () => {
        const rows = externallyStoredScreenshotRows(PROJECT_DELETE_CHUNK_SIZE * 3);
        await database.insertFeedbacksAsApplication(rows);
        const writer = database.createStore({ logger });
        await writer.createFeedback(feedbackInput());
        await writer.createFeedback(feedbackInput({ projectName: "other-site" }));
        const screenshotUrls = rows.map((row) => row.screenshotUrl);
        expect(JSON.stringify(screenshotUrls).length).toBeGreaterThan(BULK_DELETE_RESPONSE_LIMIT_BYTES);
        const { storage, deletions } = recordingStorage();
        const store = database.createStoreBehindResponseSizeLimit(BULK_DELETE_RESPONSE_LIMIT_BYTES, {
          screenshotStorage: storage,
          logger,
        });

        await store.deleteAllFeedbacks("site");

        expect((await writer.getFeedbacks({ projectName: "site" })).total).toBe(0);
        expect((await writer.getFeedbacks({ projectName: "other-site" })).total).toBe(1);
        expect(await database.countAnnotations()).toBe(1);
        expect([...deletions].sort()).toEqual([...screenshotUrls].sort());
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it("keeps the cleanup of committed chunks when a later chunk fails, and completes the delete on retry", async () => {
        const rows = externallyStoredScreenshotRows(PROJECT_DELETE_CHUNK_SIZE + 10);
        await database.insertFeedbacksAsApplication(rows);
        const { storage, deletions } = recordingStorage();
        const chunkFailure = new Error("connection lost while deleting the second chunk");
        let feedbackDeletes = 0;
        const store = database.createStoreWithDriverInterceptor(
          (statementSql, run) => {
            if (!isFeedbackDelete(statementSql)) return run();
            feedbackDeletes += 1;
            return feedbackDeletes === 2 ? Promise.reject(chunkFailure) : run();
          },
          { screenshotStorage: storage, logger },
        );
        const reader = database.createStore({ logger });

        const failure = await store.deleteAllFeedbacks("site").then(
          () => null,
          (error: unknown) => error,
        );

        expect(isStorePersistence(failure)).toBe(true);
        expect(causeChain(failure)).toContain(chunkFailure);
        const remaining = await reader.getFeedbacks({ projectName: "site", limit: 50 });
        expect(remaining.total).toBe(rows.length - PROJECT_DELETE_CHUNK_SIZE);
        const remainingUrls = new Set(remaining.feedbacks.map((feedback) => feedback.screenshotUrl));
        expect(deletions).toHaveLength(PROJECT_DELETE_CHUNK_SIZE);
        expect(deletions.filter((url) => remainingUrls.has(url))).toEqual([]);

        await store.deleteAllFeedbacks("site");

        expect((await reader.getFeedbacks({ projectName: "site" })).total).toBe(0);
        expect([...deletions].sort()).toEqual(rows.map((row) => row.screenshotUrl).sort());
      });

      it("never reads inline screenshots back while cleaning up a project with a delete hook", async () => {
        // Each inline screenshot alone is larger than the driver accepts in a response.
        const inlineScreenshot = `${SCREENSHOT_DATA_URL}${"A".repeat(RESPONSE_SIZE_LIMIT_BYTES)}`;
        const writer = database.createStore({ logger });
        await writer.createFeedback(feedbackInput({ screenshotDataUrl: inlineScreenshot }));
        const single = await writer.createFeedback(feedbackInput({ screenshotDataUrl: inlineScreenshot }));
        const { storage, deletions } = recordingStorage();
        const store = database.createStoreBehindResponseSizeLimit(RESPONSE_SIZE_LIMIT_BYTES, {
          screenshotStorage: storage,
          logger,
        });

        await store.deleteFeedback(single.id);
        await store.deleteAllFeedbacks("site");

        expect((await writer.getFeedbacks({ projectName: "site" })).total).toBe(0);
        expect(await database.countAnnotations()).toBe(0);
        expect(deletions).toEqual([]);
      });
    });

    describe("when deleteAllFeedbacks deletes chunk by chunk alongside other deletes", () => {
      // A concurrent delete that took rows a chunk picked leaves that chunk short or empty
      // (PostgreSQL waits for its locks, then skips the rows it removed). Here the chunk's own
      // statement deletes them and reports only some, as the store then sees it.
      it.each([
        ["every row", () => []],
        ["some rows", (rows: unknown[]) => rows.slice(1)],
      ])("finishes the project when a concurrent delete took %s of a chunk", async (_taken, reported) => {
        await database.insertFeedbacksAsApplication(externallyStoredScreenshotRows(PROJECT_DELETE_CHUNK_SIZE + 20));
        let firstChunk = true;
        const store = database.createStoreWithDriverInterceptor(
          async (statementSql, run) => {
            const result = await run();
            if (!firstChunk || !isFeedbackDelete(statementSql)) return result;
            firstChunk = false;
            return withReportedRows(result, reported);
          },
          { screenshotStorage: recordingStorage().storage, logger },
        );

        await store.deleteAllFeedbacks("site");

        expect((await database.createStore({ logger }).getFeedbacks({ projectName: "site" })).total).toBe(0);
      });

      it("fails instead of retrying forever when the database keeps rows it is told to delete", async () => {
        const store = database.createStore({ screenshotStorage: recordingStorage().storage, logger });
        await store.createFeedback(feedbackInput());
        await store.createFeedback(feedbackInput());
        const restoreDeletes = await database.skipFeedbackDeletes();
        try {
          const failure = await store.deleteAllFeedbacks("site").then(
            () => null,
            (error: unknown) => error,
          );

          expect(isStorePersistence(failure)).toBe(true);
        } finally {
          await restoreDeletes();
        }
        expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(2);
      });
    });

    it("deletes feedbacks with inline screenshots through a size-capped driver when no cleanup hook exists", async () => {
      // Each inline screenshot alone is larger than the driver accepts in a response.
      const inlineScreenshot = `${SCREENSHOT_DATA_URL}${"A".repeat(RESPONSE_SIZE_LIMIT_BYTES)}`;
      const writer = database.createStore({ logger });
      const single = await writer.createFeedback(feedbackInput({ screenshotDataUrl: inlineScreenshot }));
      await writer.createFeedback(feedbackInput({ screenshotDataUrl: inlineScreenshot }));
      await writer.createFeedback(feedbackInput({ screenshotDataUrl: inlineScreenshot }));
      const uploadOnlyStorage: ScreenshotStorage = { upload: recordingStorage().storage.upload };
      const stores = [
        database.createStoreBehindResponseSizeLimit(RESPONSE_SIZE_LIMIT_BYTES, { logger }),
        database.createStoreBehindResponseSizeLimit(RESPONSE_SIZE_LIMIT_BYTES, {
          screenshotStorage: uploadOnlyStorage,
          logger,
        }),
      ];

      await stores[0]?.deleteFeedback(single.id);
      await stores[1]?.deleteAllFeedbacks("site");

      expect((await stores[0]?.getFeedbacks({ projectName: "site" }))?.total).toBe(0);
      expect(await database.countAnnotations()).toBe(0);
    });

    it("verifies project ownership through a size-capped driver without reading inline screenshots", async () => {
      // The inline screenshot alone is larger than the driver accepts in a response.
      const inlineScreenshot = `${SCREENSHOT_DATA_URL}${"A".repeat(RESPONSE_SIZE_LIMIT_BYTES)}`;
      const created = await database
        .createStore({ logger })
        .createFeedback(feedbackInput({ screenshotDataUrl: inlineScreenshot }));
      const store = database.createStoreBehindResponseSizeLimit(RESPONSE_SIZE_LIMIT_BYTES, { logger });

      expect(await store.verifyProjectOwnership(created.id, "site")).toBe(true);
      expect(await store.verifyProjectOwnership(created.id, "other-site")).toBe(false);
      expect(await store.verifyProjectOwnership(crypto.randomUUID(), "site")).toBe(false);
    });

    it("matches LIKE wildcards in search literally", async () => {
      const store = database.createStore({ logger });
      await store.createFeedback(feedbackInput({ message: "Discount shows 100% off" }));
      await store.createFeedback(feedbackInput({ message: "Discount shows 1000 off" }));
      await store.createFeedback(feedbackInput({ message: "Field user_name is empty" }));
      await store.createFeedback(feedbackInput({ message: "Field username is empty" }));

      const percent = await store.getFeedbacks({ projectName: "site", search: "100%" });
      const underscore = await store.getFeedbacks({ projectName: "site", search: "user_name" });

      expect(percent.feedbacks.map((feedback) => feedback.message)).toEqual(["Discount shows 100% off"]);
      expect(underscore.feedbacks.map((feedback) => feedback.message)).toEqual(["Field user_name is empty"]);
    });

    it("matches backslashes in search literally", async () => {
      const store = database.createStore({ logger });
      await store.createFeedback(feedbackInput({ message: "Crash when saving to C:\\temp" }));
      await store.createFeedback(feedbackInput({ message: "Crash when saving to C:temp" }));
      await store.createFeedback(feedbackInput({ message: "Path ends with folder\\" }));
      await store.createFeedback(feedbackInput({ message: "Path ends with folder" }));

      const middle = await store.getFeedbacks({ projectName: "site", search: "C:\\temp" });
      const trailing = await store.getFeedbacks({ projectName: "site", search: "folder\\" });

      expect(middle.feedbacks.map((feedback) => feedback.message)).toEqual(["Crash when saving to C:\\temp"]);
      expect(trailing.feedbacks.map((feedback) => feedback.message)).toEqual(["Path ends with folder\\"]);
    });

    it("matches backslashes combined with LIKE wildcards in search literally", async () => {
      const store = database.createStore({ logger });
      await store.createFeedback(feedbackInput({ message: "Regex \\% breaks" }));
      await store.createFeedback(feedbackInput({ message: "Regex % breaks" }));
      await store.createFeedback(feedbackInput({ message: "Regex \\x breaks" }));
      await store.createFeedback(feedbackInput({ message: "Token a\\_b is wrong" }));
      await store.createFeedback(feedbackInput({ message: "Token a_b is wrong" }));
      await store.createFeedback(feedbackInput({ message: "Token a\\xb is wrong" }));

      const percent = await store.getFeedbacks({ projectName: "site", search: "\\%" });
      const underscore = await store.getFeedbacks({ projectName: "site", search: "a\\_b" });

      expect(percent.feedbacks.map((feedback) => feedback.message)).toEqual(["Regex \\% breaks"]);
      expect(underscore.feedbacks.map((feedback) => feedback.message)).toEqual(["Token a\\_b is wrong"]);
    });

    it("folds non-ASCII case in search like the standard store filter", async () => {
      const store = database.createStore({ logger });
      const messages = [
        "Échec du paiement",
        "échec de connexion",
        "Schlüssel ÄÖÜ fehlt",
        "Größe äöü falsch",
        "Façade Ç cassée",
        "Checkout button is broken",
      ];
      const created = [];
      for (const message of messages) created.push(await store.createFeedback(feedbackInput({ message })));
      const searches = ["échec", "ÉCHEC", "äöü", "ÄÖÜ", "ç", "Ç", "CHECKOUT"];

      for (const search of searches) {
        const found = await store.getFeedbacks({ projectName: "site", search });
        const expected = applyFeedbackFilters(created, { projectName: "site", search });
        expect(found.feedbacks.map((feedback) => feedback.message).sort(), search).toEqual(
          expected.feedbacks.map((feedback) => feedback.message).sort(),
        );
        expect(found.total, search).toBe(expected.total);
      }
      const accented = await store.getFeedbacks({ projectName: "site", search: "échec" });
      expect(accented.feedbacks.map((feedback) => feedback.message).sort()).toEqual([
        "Échec du paiement",
        "échec de connexion",
      ]);
    });

    it("folds non-ASCII case in search even when the database folds case only in ASCII", async () => {
      const restoreFolding = await database.foldMessageCaseAsciiOnly();
      try {
        const store = database.createStore({ logger });
        const created = [];
        for (const message of ["Échec du paiement", "Größe ÄÖÜ falsch", "Checkout button is broken"]) {
          created.push(await store.createFeedback(feedbackInput({ message })));
        }

        for (const search of ["échec", "äöü", "ÉCHEC", "checkout"]) {
          const found = await store.getFeedbacks({ projectName: "site", search });
          const expected = applyFeedbackFilters(created, { projectName: "site", search });
          expect(
            found.feedbacks.map((feedback) => feedback.message),
            search,
          ).toEqual(expected.feedbacks.map((feedback) => feedback.message));
          expect(found.total, search).toBe(1);
        }
      } finally {
        await restoreFolding();
      }
    });

    it("searches feedbacks the host application wrote without the store", async () => {
      await database.writeAsApplication();
      const store = database.createStore({ logger });

      const found = await store.getFeedbacks({ projectName: "site", search: "CHECKOUT BUTTON" });

      expect(found.total).toBe(1);
    });

    describe("with text holding NUL or an unpaired surrogate, which PostgreSQL cannot store", () => {
      // The widget's console capture cuts a long line after 499 code units: past an emoji
      // there, the line ends with a high surrogate whose low half was cut off.
      const cutInsideEmoji = `${"x".repeat(498)}\u{1F680} deployed`.slice(0, 499);

      it("stores feedbacks and comments with U+FFFD in their place, exactly as the store returns them", async () => {
        const store = database.createStore({ logger });
        const [template] = feedbackInput().annotations;
        if (!template) throw new Error("feedbackInput() must provide an annotation template");

        const created = await store.createFeedback(
          feedbackInput({
            message: "Total shows a\u0000b",
            authorName: "Zoe \uDE00",
            annotations: [{ ...template, textSnippet: "Pay\u0000" }],
            diagnostics: {
              console: [{ level: "warn", timestamp: "2026-01-01T00:00:00.000Z", message: cutInsideEmoji }],
              network: [
                { url: "https://api.example.com/\u0000", method: "GET", status: 0, durationMs: 1, timestamp: "t" },
              ],
            },
          }),
        );
        const comment = await store.addComment(created.id, commentInput({ body: "Seen \uD83D\u0000" }));

        expect(created.message).toBe("Total shows a�b");
        expect(created.authorName).toBe("Zoe �");
        expect(created.annotations[0]?.textSnippet).toBe("Pay�");
        expect(created.diagnostics?.console[0]?.message).toBe(`${"x".repeat(498)}�`);
        expect(created.diagnostics?.network[0]?.url).toBe("https://api.example.com/�");
        expect(comment.body).toBe("Seen ��");
        expect(await store.findByClientId(created.clientId)).toEqual({ ...created, comments: [comment] });
      });

      it("finds them by the same text in search and every filter, and nothing else", async () => {
        const store = database.createStore({ logger });
        const withNul = await store.createFeedback(
          feedbackInput({ projectName: "site\u0000", message: "Total a\u0000b", url: "https://example.com/\u0000" }),
        );
        await store.createFeedback(feedbackInput({ projectName: "site\u0000", url: "https://example.com/\u0000" }));

        const query = { projectName: "site\u0000", url: "https://example.com/\u0000" };

        for (const search of ["a\u0000b", "\u0000"]) {
          const found = await store.getFeedbacks({ ...query, search });
          expect(found.feedbacks.map((feedback) => feedback.id)).toEqual([withNul.id]);
        }
        expect((await store.getFeedbacks(query)).total).toBe(2);
        expect(await store.verifyProjectOwnership(withNul.id, "site\u0000")).toBe(true);
      });

      it("answers a lookup by an id or a project name holding one like any unknown one", async () => {
        const store = database.createStore({ logger });
        const stored = await store.createFeedback(feedbackInput());
        const comment = await store.addComment(stored.id, commentInput());
        const unknownId = `${stored.id}\u0000`;

        expect(await store.findByClientId(`${stored.clientId}\u0000`)).toBeNull();
        expect(await store.verifyProjectOwnership(unknownId, "site")).toBe(false);
        expect(await store.verifyProjectOwnership(stored.id, "site\u0000")).toBe(false);
        expect((await store.getFeedbacks({ projectName: "site\u0000" })).total).toBe(0);
        for (const lookup of [
          () => store.updateFeedback(unknownId, { status: "in_progress", resolvedAt: null }),
          () => store.deleteFeedback(unknownId),
          () => store.addComment(unknownId, commentInput()),
          () => store.deleteComment(unknownId, comment.id),
          () => store.deleteComment(stored.id, `${comment.id}\uDC00`),
        ]) {
          await expect(lookup()).rejects.toSatisfy(isStoreNotFound);
        }
        await store.deleteAllFeedbacks("site\u0000");
        expect(await store.findByClientId(stored.clientId)).toEqual({ ...stored, comments: [comment] });
      });
    });

    it("lets the host application write through the same database while the store writes", async () => {
      const store = database.createStore({ logger });
      const existing = await store.createFeedback(feedbackInput());

      // Interleaved at every await: a store write that held the database's
      // write lock across an await would make the application's writes fail
      // with SQLITE_BUSY (or block the event loop) on local libSQL.
      await Promise.all([
        store.createFeedback(feedbackInput({ annotations: orderedAnnotations(3) })),
        database.writeAsApplication(),
        store.createFeedbackIfAbsent(feedbackInput()),
        database.writeAsApplication(),
        store.deleteFeedback(existing.id),
        database.writeAsApplication(),
        store.createFeedback(feedbackInput()),
      ]);

      expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(6);
    });

    it("returns annotations in submission order even when the rows are stored in another order", async () => {
      const store = database.createStore({ logger });
      const annotations = orderedAnnotations(4);
      const created = await store.createFeedback(feedbackInput({ annotations }));

      await database.reverseAnnotationStorageOrder();
      const [reloaded] = (await store.getFeedbacks({ projectName: "site" })).feedbacks;

      const submittedSelectors = annotations.map((annotation) => annotation.cssSelector);
      expect(created.annotations.map((annotation) => annotation.cssSelector)).toEqual(submittedSelectors);
      expect(reloaded?.annotations.map((annotation) => annotation.cssSelector)).toEqual(submittedSelectors);
      expect(reloaded?.annotations[0]).not.toHaveProperty("position");
    });

    it("returns a thread in posting order, even posted within one millisecond and stored in another order", async () => {
      const store = database.createStore({ logger, now: () => new Date(FROZEN_TIME_MS) });
      const feedback = await store.createFeedback(feedbackInput());
      const posted = [];
      for (let index = 0; index < 4; index += 1) {
        posted.push(await store.addComment(feedback.id, commentInput({ body: `Reply ${index}` })));
      }

      await database.reverseCommentStorageOrder();
      const [reloaded] = (await store.getFeedbacks({ projectName: "site" })).feedbacks;

      expect(reloaded?.comments).toEqual(posted);
      expect(reloaded?.comments?.[0]).not.toHaveProperty("position");
      expect(posted[0]?.createdAt.getTime()).toBe(FROZEN_TIME_MS);
    });

    it("reports a failed comment write as a StorePersistenceError carrying the driver error", async () => {
      const writer = database.createStore({ logger });
      const feedback = await writer.createFeedback(feedbackInput());
      const kept = await writer.addComment(feedback.id, commentInput());
      const writeFailure = new Error("connection lost while writing the comment");
      const store = database.createStoreWithDriverInterceptor(
        (statementSql, run) => (isCommentWrite(statementSql) ? Promise.reject(writeFailure) : run()),
        { logger },
      );

      const failures = await Promise.all(
        [() => store.addComment(feedback.id, commentInput()), () => store.deleteComment(feedback.id, kept.id)].map(
          (mutation) =>
            mutation().then(
              () => null,
              (error: unknown) => error,
            ),
        ),
      );

      for (const failure of failures) {
        expect(isStorePersistence(failure)).toBe(true);
        expect(causeChain(failure)).toContain(writeFailure);
      }
      expect((await writer.findByClientId(feedback.clientId))?.comments).toEqual([kept]);
    });

    it("reports a comment racing the delete of its feedback as a missing feedback", async () => {
      const writer = database.createStore({ logger });
      const feedback = await writer.createFeedback(feedbackInput());
      // What PostgreSQL does when the delete commits between the insert's feedback check and its
      // foreign-key check: the insert fails on the foreign key.
      const foreignKeyViolation = Object.assign(
        new Error(
          `insert or update on table "${DEFAULT_SITEPING_TABLE_NAMES.comments}" violates foreign key constraint`,
        ),
        { code: "23503" },
      );
      const store = database.createStoreWithDriverInterceptor(
        async (statementSql, run) => {
          if (!isCommentWrite(statementSql)) return run();
          await writer.deleteFeedback(feedback.id);
          throw foreignKeyViolation;
        },
        { logger },
      );

      await expect(store.addComment(feedback.id, commentInput())).rejects.toSatisfy(isStoreNotFound);
    });

    it("stores one comment when separate store instances race on its clientId", async () => {
      const feedback = await database.createStore({ logger }).createFeedback(feedbackInput());
      const input = commentInput();

      const results = await Promise.all(
        Array.from({ length: 3 }, () => database.createStore({ logger }).addComment(feedback.id, input)),
      );

      for (const result of results) expect(result.id).toBe(results[0]?.id);
      expect(await database.countComments()).toBe(1);
    });

    it("stamps createdAt and updatedAt with the injected clock", async () => {
      let currentTime = FROZEN_TIME_MS;
      const store = database.createStore({ logger, now: () => new Date(currentTime) });

      const created = await store.createFeedback(feedbackInput());
      currentTime += 60_000;
      const updated = await store.updateFeedback(created.id, { status: "in_progress", resolvedAt: null });

      expect(created.createdAt.getTime()).toBe(FROZEN_TIME_MS);
      expect(updated.createdAt.getTime()).toBe(FROZEN_TIME_MS);
      expect(updated.updatedAt.getTime()).toBe(FROZEN_TIME_MS + 60_000);
    });

    describe("with a frozen clock", () => {
      const frozenClock = () => new Date(FROZEN_TIME_MS);

      it("stamps every create of a same-millisecond burst with the clock value itself", async () => {
        const store = database.createStore({ logger, now: frozenClock });

        const burst = [
          await store.createFeedback(feedbackInput()),
          await store.createFeedback(feedbackInput()),
          await store.createFeedback(feedbackInput()),
        ];

        expect(burst.map((feedback) => feedback.createdAt.getTime())).toEqual([
          FROZEN_TIME_MS,
          FROZEN_TIME_MS,
          FROZEN_TIME_MS,
        ]);
        const { feedbacks } = await store.getFeedbacks({ projectName: "site" });
        expect(feedbacks.map((feedback) => feedback.id)).toEqual(burst.map((feedback) => feedback.id).reverse());
      });

      it("lists a later insert from another instance first after a same-millisecond burst of one instance", async () => {
        const burstingStore = database.createStore({ logger, now: frozenClock });
        const laterStore = database.createStore({ logger, now: frozenClock });
        const burstIds: string[] = [];
        for (let create = 0; create < 3; create += 1) {
          burstIds.push((await burstingStore.createFeedback(feedbackInput())).id);
        }
        const later = await laterStore.createFeedback(feedbackInput());

        const { feedbacks } = await laterStore.getFeedbacks({ projectName: "site" });

        expect(feedbacks.map((feedback) => feedback.id)).toEqual([later.id, ...[...burstIds].reverse()]);
      });

      it("never stamps updatedAt before the createdAt of a row written by an instance whose clock runs ahead", async () => {
        const aheadStore = database.createStore({ logger, now: () => new Date(FROZEN_TIME_MS + 5_000) });
        const laggingStore = database.createStore({ logger, now: frozenClock });
        const created = await aheadStore.createFeedback(feedbackInput());

        const updated = await laggingStore.updateFeedback(created.id, { status: "in_progress", resolvedAt: null });

        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(updated.createdAt.getTime());
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
      });

      it("lists feedbacks created in the same millisecond by separate store instances newest first, across pages", async () => {
        // Each instance issues createdAt from the same frozen clock, so all of them stamp the same value —
        // as several serverless invocations writing within one millisecond would.
        const createdIds: string[] = [];
        for (let instance = 0; instance < 6; instance += 1) {
          const store = database.createStore({ logger, now: frozenClock });
          createdIds.push((await store.createFeedback(feedbackInput())).id);
        }
        const reader = database.createStore({ logger, now: frozenClock });

        const all = await reader.getFeedbacks({ projectName: "site" });
        const pages = await Promise.all(
          [1, 2, 3].map((page) => reader.getFeedbacks({ projectName: "site", page, limit: 2 })),
        );

        const newestFirst = [...createdIds].reverse();
        expect(all.feedbacks.map((feedback) => feedback.createdAt.getTime())).toEqual(
          createdIds.map(() => FROZEN_TIME_MS),
        );
        expect(all.feedbacks.map((feedback) => feedback.id)).toEqual(newestFirst);
        expect(pages.flatMap((page) => page.feedbacks.map((feedback) => feedback.id))).toEqual(newestFirst);
        expect(all.feedbacks[0]).not.toHaveProperty("creationSequence");
      });

      it("orders feedbacks the host application inserts directly in the same millisecond by insertion, among the store's", async () => {
        const store = database.createStore({ logger, now: frozenClock });
        const insertDirectly = async () => {
          const row = applicationFeedbackRow(frozenClock());
          await database.insertFeedbackAsApplication(row);
          return row.id;
        };
        const insertedIds = [
          (await store.createFeedback(feedbackInput())).id,
          await insertDirectly(),
          (await store.createFeedback(feedbackInput())).id,
          await insertDirectly(),
          await insertDirectly(),
        ];

        const all = await store.getFeedbacks({ projectName: "site" });
        const pages = await Promise.all(
          [1, 2, 3].map((page) => store.getFeedbacks({ projectName: "site", page, limit: 2 })),
        );

        const newestFirst = [...insertedIds].reverse();
        expect(all.feedbacks.map((feedback) => feedback.createdAt.getTime())).toEqual(
          insertedIds.map(() => FROZEN_TIME_MS),
        );
        expect(all.feedbacks.map((feedback) => feedback.id)).toEqual(newestFirst);
        expect(pages.flatMap((page) => page.feedbacks.map((feedback) => feedback.id))).toEqual(newestFirst);
      });
    });

    describe("when the database is unreachable", () => {
      const connectionFailure = new Error("connect ECONNREFUSED 127.0.0.1:5432");

      it("reports a StorePersistenceError from every mutation, whatever call fails first", async () => {
        const writer = database.createStore({ logger });
        const stored = await writer.createFeedback(feedbackInput());
        const comment = await writer.addComment(stored.id, commentInput());
        const failing = (options: DrizzleStoreOptions = {}) =>
          database.createStoreWithDriverInterceptor(() => Promise.reject(connectionFailure), { logger, ...options });
        const store = failing();
        const withDeleteHook = failing({ screenshotStorage: recordingStorage().storage });

        const failures = await Promise.all(
          [
            () => store.createFeedback(feedbackInput()),
            () => store.createFeedbackIfAbsent(feedbackInput()),
            () => store.updateFeedback(stored.id, { status: "in_progress", resolvedAt: null }),
            () => store.deleteFeedback(stored.id),
            () => store.deleteAllFeedbacks("site"),
            () => withDeleteHook.deleteAllFeedbacks("site"),
            () => store.addComment(stored.id, commentInput()),
            () => store.deleteComment(stored.id, comment.id),
          ].map((mutation) =>
            mutation().then(
              () => null,
              (error: unknown) => error,
            ),
          ),
        );

        for (const failure of failures) {
          expect(isStorePersistence(failure)).toBe(true);
          expect(causeChain(failure)).toContain(connectionFailure);
        }
      });

      it("keeps the statements' parameters — the submission itself — out of the errors it reports", async () => {
        const stored = await database.createStore({ logger }).createFeedback(feedbackInput());
        const email = "jeanne.private@example.com";
        const text = "private-message";
        const screenshotDataUrl = `${SCREENSHOT_DATA_URL}privatepixels`;
        // Drizzle wraps the driver's rejection in an error listing every bound parameter.
        const store = database.createStoreWithDriverInterceptor(
          (statementSql, run) =>
            isFeedbackInsert(statementSql) || isCommentWrite(statementSql) || / like /i.test(statementSql)
              ? Promise.reject(connectionFailure)
              : run(),
          { logger },
        );

        const failures = await Promise.all(
          [
            () =>
              store.createFeedback(
                feedbackInput({ authorEmail: email, message: text, screenshotDataUrl, annotations: [] }),
              ),
            () => store.addComment(stored.id, commentInput({ authorEmail: email, body: text })),
            () => store.getFeedbacks({ projectName: "site", search: text }),
          ].map((operation) =>
            operation().then(
              () => null,
              (error: unknown) => error,
            ),
          ),
        );

        for (const failure of failures) {
          expect(causeChain(failure)).toContain(connectionFailure);
          const logged = inspect(failure, { depth: null });
          for (const secret of [email, text, screenshotDataUrl]) expect(logged).not.toContain(secret);
        }
      });

      // A comment on an unknown feedback inserts nothing; telling why takes two more reads.
      it.each([
        ["the replay lookup", (statementSql: string) => !isCommentWrite(statementSql)],
        ["the feedback lookup", isFeedbackRead],
      ])("reports a StorePersistenceError when a comment inserts nothing and %s fails", async (_lookup, fails) => {
        const store = database.createStoreWithDriverInterceptor(
          (statementSql, run) => (fails(statementSql) ? Promise.reject(connectionFailure) : run()),
          { logger },
        );

        const failure = await store.addComment(crypto.randomUUID(), commentInput()).then(
          () => null,
          (error: unknown) => error,
        );

        expect(isStorePersistence(failure)).toBe(true);
        expect(causeChain(failure)).toContain(connectionFailure);
      });
    });

    describe("when the database rejects writes", () => {
      let restoreWrites: (() => Promise<void>) | undefined;
      afterEach(async () => {
        await restoreWrites?.();
        restoreWrites = undefined;
      });

      it("reports every failed mutation as a StorePersistenceError carrying the driver error", async () => {
        const { storage, deletions } = recordingStorage();
        const store = database.createStore({ screenshotStorage: storage, logger });
        const stored = await store.createFeedback(feedbackInput());
        const annotationsBefore = await database.countAnnotations();
        restoreWrites = await database.rejectFeedbackWrites();

        const failures = await Promise.all(
          [
            () => store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL })),
            () => store.updateFeedback(stored.id, { status: "in_progress", resolvedAt: null }),
            () => store.deleteFeedback(stored.id),
            () => store.deleteAllFeedbacks("site"),
          ].map((mutation) =>
            mutation().then(
              () => null,
              (error: unknown) => error,
            ),
          ),
        );

        for (const failure of failures) {
          expect(isStorePersistence(failure)).toBe(true);
          expect((failure as Error).cause).toBeInstanceOf(Error);
        }
        expect((failures[1] as Error).message).toContain(stored.id);
        // Nothing half-applied, and the screenshot uploaded for the lost insert is dropped.
        await restoreWrites();
        restoreWrites = undefined;
        expect(await database.countAnnotations()).toBe(annotationsBefore);
        expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(1);
        expect(deletions).toHaveLength(1);
      });

      it("keeps the screenshot of a failed insert when a contract-breaking storage shares its URL with another feedback", async () => {
        const { storage, deletions } = sharedUrlStorage();
        const store = database.createStore({ screenshotStorage: storage, logger });
        const stored = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL }));
        restoreWrites = await database.rejectFeedbackWrites();

        const failure = await store.createFeedback(feedbackInput({ screenshotDataUrl: SCREENSHOT_DATA_URL })).then(
          () => null,
          (error: unknown) => error,
        );

        expect(isStorePersistence(failure)).toBe(true);
        expect(stored.screenshotUrl).toBe(SHARED_SCREENSHOT_URL);
        expect(deletions).toEqual([]);
      });
    });
  });

  describe(`DrizzleStore — ${dialect.name} with custom table names`, () => {
    it("reads and writes through the renamed tables", async () => {
      const database = await dialect.open(CUSTOM_TABLE_NAMES);
      try {
        const store = database.createStore({ logger: { warn: () => {} } });
        const created = await store.createFeedback(feedbackInput());
        const comment = await store.addComment(created.id, commentInput());

        const page = await store.getFeedbacks({ projectName: "site" });

        expect(page.feedbacks.map((feedback) => feedback.id)).toEqual([created.id]);
        expect(page.feedbacks[0]?.annotations).toHaveLength(1);
        expect(page.feedbacks[0]?.comments).toEqual([comment]);
        expect(await database.countAnnotations()).toBe(1);
        expect(await database.countComments()).toBe(1);
      } finally {
        await database.close();
      }
    });
  });
}

// Each entry bundles its own copy of core, so `instanceof` only matches the
// classes exported by that entry: every error a store method throws must be one.
it.each([
  ["pg", () => import("../src/pg/index.js")],
  ["libsql", () => import("../src/libsql/index.js")],
])("the %s entry re-exports every store error its methods throw", async (_name, loadEntry) => {
  const { isStorePersistence, StoreDuplicateError, StoreLimitError, StoreNotFoundError, StorePersistenceError } =
    await import("@siteping/core");

  expect(await loadEntry()).toMatchObject({
    isStorePersistence,
    StoreDuplicateError,
    StoreLimitError,
    StoreNotFoundError,
    StorePersistenceError,
  });
});
