import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Conditional mock for node:fs to test writeFileSync error paths
// ---------------------------------------------------------------------------

interface WriteFileMock {
  fn: ((...args: unknown[]) => void) | null;
}

const writeFileMock: WriteFileMock = { fn: null };

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    writeFileSync: (...args: unknown[]) => {
      if (writeFileMock.fn) {
        writeFileMock.fn(...args);
        return;
      }
      return actual.writeFileSync(...(args as Parameters<typeof actual.writeFileSync>));
    },
  };
});

import { syncPrismaModels } from "../../src/generators/prisma.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MINIMAL_SCHEMA = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`;

/** A schema that already has the SitepingFeedback model (but incomplete). */
const SCHEMA_WITH_PARTIAL_MODEL = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String
  type        String
  message     String
  createdAt   DateTime @default(now())
}
`;

/** A schema that has an existing User model. */
const SCHEMA_WITH_USER_MODEL = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    String @id @default(cuid())
  email String @unique
  name  String
}
`;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("syncPrismaModels", () => {
  let tmpDir: string;
  let schemaPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "siteping-test-"));
    schemaPath = join(tmpDir, "schema.prisma");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  /** A freshly synced (up-to-date) schema — the baseline drift tests edit. */
  function syncedSchema(): string {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);
    syncPrismaModels(schemaPath);
    return readFileSync(schemaPath, "utf-8");
  }

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  it("throws when schema file does not exist", () => {
    expect(() => syncPrismaModels(join(tmpDir, "nonexistent.prisma"))).toThrow("Schema file not found");
  });

  // -----------------------------------------------------------------------
  // Adding models to an empty schema
  // -----------------------------------------------------------------------

  it("adds both SitepingFeedback and SitepingAnnotation to an empty schema", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    const result = syncPrismaModels(schemaPath);

    expect(result.addedModels).toContain("SitepingFeedback");
    expect(result.addedModels).toContain("SitepingAnnotation");
    expect(result.changes).toHaveLength(0); // No field-level changes, models were created fresh

    // Verify the output file contains the models
    const output = readFileSync(schemaPath, "utf-8");
    expect(output).toContain("model SitepingFeedback");
    expect(output).toContain("model SitepingAnnotation");
    expect(output).toContain("projectName");
    expect(output).toContain("cssSelector");
  });

  it("preserves existing datasource and generator blocks", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    syncPrismaModels(schemaPath);

    const output = readFileSync(schemaPath, "utf-8");
    expect(output).toContain("datasource db");
    expect(output).toContain('provider = "postgresql"');
    expect(output).toContain("generator client");
  });

  it("does not prepend a blank line to the schema", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    syncPrismaModels(schemaPath);

    const output = readFileSync(schemaPath, "utf-8");
    expect(output).toMatch(/^datasource db/);
  });

  // -----------------------------------------------------------------------
  // Valid schemas prisma-ast's grammar trips on
  // -----------------------------------------------------------------------

  it.each([
    ["a trailing space after {", "{ \n"],
    ["a trailing tab after {", "{\t\n"],
    ["a trailing space after { with CRLF line endings", "{ \r\n"],
    ["a comment after {", "{ // note\n"],
    ["a comment right after {", "{// note\n"],
  ])("parses block headers with %s", (_label, opening) => {
    const schema = `${MINIMAL_SCHEMA}\nmodel User {\n  id String @id\n}\n\nenum Role {\n  ADMIN\n}\n`.replace(
      /\{\n/g,
      opening,
    );
    writeFileSync(schemaPath, schema);

    const result = syncPrismaModels(schemaPath);

    expect(result.addedModels).toEqual(["SitepingFeedback", "SitepingAnnotation"]);
    const output = readFileSync(schemaPath, "utf-8");
    expect(output).toContain("model User {");
    expect(output).toContain("enum Role {");
    if (opening.includes("note")) expect(output).toMatch(/model User \{\r?\n\s*\/\/ note\r?\n/);
  });

  it("keeps a /// comment after { from becoming the first field's documentation", () => {
    // In place it documents nothing; on its own line it would document `id`.
    writeFileSync(schemaPath, `${MINIMAL_SCHEMA}\nmodel User { /// note\n  id String @id\n}\n`);

    syncPrismaModels(schemaPath);

    expect(readFileSync(schemaPath, "utf-8")).toMatch(/model User \{\n\s*\/\/ note\n\s*id\s/);
  });

  // -----------------------------------------------------------------------
  // Adding models alongside existing models
  // -----------------------------------------------------------------------

  it("adds Siteping models alongside an existing User model", () => {
    writeFileSync(schemaPath, SCHEMA_WITH_USER_MODEL);

    const result = syncPrismaModels(schemaPath);

    expect(result.addedModels).toContain("SitepingFeedback");
    expect(result.addedModels).toContain("SitepingAnnotation");

    const output = readFileSync(schemaPath, "utf-8");
    // User model should still be there
    expect(output).toContain("model User");
    expect(output).toContain("model SitepingFeedback");
    expect(output).toContain("model SitepingAnnotation");
  });

  // -----------------------------------------------------------------------
  // Updating fields when schema is outdated
  // -----------------------------------------------------------------------

  it("adds missing fields to an existing partial model", () => {
    writeFileSync(schemaPath, SCHEMA_WITH_PARTIAL_MODEL);

    const result = syncPrismaModels(schemaPath);

    // SitepingFeedback already existed, so it shouldn't be in addedModels
    expect(result.addedModels).not.toContain("SitepingFeedback");
    // But SitepingAnnotation is new
    expect(result.addedModels).toContain("SitepingAnnotation");

    // Should have field-level changes for the missing fields
    expect(result.changes.length).toBeGreaterThan(0);
    const addedFieldNames = result.changes
      .filter((c) => c.action === "added" && c.model === "SitepingFeedback")
      .map((c) => c.field);

    // These fields exist in SITEPING_MODELS but not in the partial schema
    expect(addedFieldNames).toContain("status");
    expect(addedFieldNames).toContain("url");
    expect(addedFieldNames).toContain("viewport");
    expect(addedFieldNames).toContain("userAgent");
    expect(addedFieldNames).toContain("authorName");
    expect(addedFieldNames).toContain("authorEmail");
    expect(addedFieldNames).toContain("clientId");
    expect(addedFieldNames).toContain("screenshotRegion");
    expect(addedFieldNames).toContain("annotations");

    // Verify the output contains the new fields
    const output = readFileSync(schemaPath, "utf-8");
    expect(output).toContain("clientId");
    expect(output).toContain("@unique");
    expect(output).toContain("authorEmail");
  });

  it("adds only screenshotRegion to a schema from the previous release", () => {
    // A schema generated before screenshotRegion existed — `siteping sync` is
    // how existing users pick the new column up, so it must be the single
    // change reported.
    writeFileSync(schemaPath, MINIMAL_SCHEMA);
    syncPrismaModels(schemaPath);
    // Strip the screenshotRegion line to simulate the pre-region schema.
    const upToDate = readFileSync(schemaPath, "utf-8");
    writeFileSync(schemaPath, upToDate.replace(/^\s*screenshotRegion\s+Json\?\s*\n/m, ""));

    const result = syncPrismaModels(schemaPath);

    expect(result.addedModels).toHaveLength(0);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({ model: "SitepingFeedback", field: "screenshotRegion", action: "added" });
    expect(readFileSync(schemaPath, "utf-8")).toMatch(/screenshotRegion\s+Json\?/);
  });

  // -----------------------------------------------------------------------
  // Idempotency
  // -----------------------------------------------------------------------

  it("running sync twice produces the same result (idempotent)", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    // First sync
    syncPrismaModels(schemaPath);
    const firstOutput = readFileSync(schemaPath, "utf-8");

    // Second sync — should produce no changes
    const result2 = syncPrismaModels(schemaPath);
    const secondOutput = readFileSync(schemaPath, "utf-8");

    expect(result2.addedModels).toHaveLength(0);
    expect(result2.changes).toHaveLength(0);
    expect(secondOutput).toBe(firstOutput);
  });

  it("running sync twice on a partial schema is idempotent after first sync", () => {
    writeFileSync(schemaPath, SCHEMA_WITH_PARTIAL_MODEL);

    // First sync — adds missing fields
    const result1 = syncPrismaModels(schemaPath);
    expect(result1.changes.length).toBeGreaterThan(0);
    const firstOutput = readFileSync(schemaPath, "utf-8");

    // Second sync — no changes
    const result2 = syncPrismaModels(schemaPath);
    const secondOutput = readFileSync(schemaPath, "utf-8");

    expect(result2.addedModels).toHaveLength(0);
    expect(result2.changes).toHaveLength(0);
    expect(secondOutput).toBe(firstOutput);
  });

  // -----------------------------------------------------------------------
  // Schema integrity checks
  // -----------------------------------------------------------------------

  it("generates correct field attributes (id, default, unique)", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    syncPrismaModels(schemaPath);

    const output = readFileSync(schemaPath, "utf-8");

    // ID field with @id and @default(cuid())
    expect(output).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
    // clientId with @unique
    expect(output).toMatch(/clientId\s+String\s+@unique/);
    // Optional field: resolvedAt DateTime?
    expect(output).toMatch(/resolvedAt\s+DateTime\?/);
    // Optional Json fields: screenshotRegion + diagnostics
    expect(output).toMatch(/screenshotRegion\s+Json\?/);
    expect(output).toMatch(/diagnostics\s+Json\?/);
    // createdAt with @default(now())
    expect(output).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
  });

  // -----------------------------------------------------------------------
  // Native type attributes (@db.Text)
  // -----------------------------------------------------------------------

  it("adds @db.Text to fields with nativeType: 'Text' on fresh schema", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    syncPrismaModels(schemaPath);

    const output = readFileSync(schemaPath, "utf-8");

    // SitepingFeedback.message should have @db.Text
    expect(output).toMatch(/message\s+String\s+@db\.Text/);
    // SitepingAnnotation fields with nativeType: "Text"
    expect(output).toMatch(/cssSelector\s+String\s+@db\.Text/);
    expect(output).toMatch(/xpath\s+String\s+@db\.Text/);
    expect(output).toMatch(/textSnippet\s+String\s+@db\.Text/);
    expect(output).toMatch(/textPrefix\s+String\s+@db\.Text/);
    expect(output).toMatch(/textSuffix\s+String\s+@db\.Text/);
    expect(output).toMatch(/neighborText\s+String\s+@db\.Text/);
    // Fields without nativeType should NOT have @db.Text
    expect(output).not.toMatch(/projectName\s+String\s+@db\.Text/);
    expect(output).not.toMatch(/elementTag\s+String\s+@db\.Text/);
  });

  it("adds @db.Text when updating an existing field missing the attribute", () => {
    writeFileSync(schemaPath, SCHEMA_WITH_PARTIAL_MODEL);

    const result = syncPrismaModels(schemaPath);

    const output = readFileSync(schemaPath, "utf-8");

    // message existed but without @db.Text — should be updated
    const messageChange = result.changes.find((c) => c.model === "SitepingFeedback" && c.field === "message");
    expect(messageChange).toBeDefined();
    expect(messageChange!.action).toBe("updated");
    expect(messageChange!.detail).toContain("+@db.Text");

    // After sync, the field should have @db.Text
    expect(output).toMatch(/message\s+String\s+@db\.Text/);
  });

  describe("native types per datasource provider", () => {
    const schemaFor = (provider: string) => MINIMAL_SCHEMA.replace('"postgresql"', `"${provider}"`);

    it.each(["sqlite", "cockroachdb"])("emits no @db.Text on %s, whose connector rejects it", (provider) => {
      writeFileSync(schemaPath, schemaFor(provider));

      syncPrismaModels(schemaPath);

      const output = readFileSync(schemaPath, "utf-8");
      expect(output).not.toContain("@db.");
      expect(output).toMatch(/^\s*message\s+String$/m);
      // …and doesn't then report the fields as outdated forever.
      expect(syncPrismaModels(schemaPath).changes).toEqual([]);
    });

    it.each(["postgresql", "mysql", "sqlserver"])("emits @db.Text on %s", (provider) => {
      writeFileSync(schemaPath, schemaFor(provider));

      syncPrismaModels(schemaPath);

      expect(readFileSync(schemaPath, "utf-8")).toMatch(/^\s*message\s+String\s+@db\.Text$/m);
    });

    it("removes a @db.Text an earlier sync wrote on SQLite", () => {
      writeFileSync(
        schemaPath,
        SCHEMA_WITH_PARTIAL_MODEL.replace('"postgresql"', '"sqlite"').replace(
          /message\s+String/,
          "message String @db.Text",
        ),
      );

      const result = syncPrismaModels(schemaPath);

      expect(result.changes).toContainEqual({
        model: "SitepingFeedback",
        field: "message",
        action: "updated",
        detail: "-@db.Text",
      });
      expect(readFileSync(schemaPath, "utf-8")).not.toContain("@db.");
    });

    it("keeps emitting @db.Text when the file declares no datasource", () => {
      writeFileSync(schemaPath, 'generator client {\n  provider = "prisma-client-js"\n}\n');

      syncPrismaModels(schemaPath);

      expect(readFileSync(schemaPath, "utf-8")).toMatch(/^\s*message\s+String\s+@db\.Text$/m);
    });
  });

  it("generates correct relation fields", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    syncPrismaModels(schemaPath);

    const output = readFileSync(schemaPath, "utf-8");

    // SitepingFeedback has a 1-to-many relation to annotations
    expect(output).toMatch(/annotations\s+SitepingAnnotation\[\]/);

    // SitepingAnnotation has feedback relation with references
    expect(output).toContain("@relation");
    expect(output).toContain("onDelete: Cascade");
  });

  it("returns the schemaPath in the result", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    const result = syncPrismaModels(schemaPath);
    expect(result.schemaPath).toBe(schemaPath);
  });

  it("does not modify schema file when no changes needed", () => {
    writeFileSync(schemaPath, MINIMAL_SCHEMA);

    // First sync writes the models
    syncPrismaModels(schemaPath);

    // Get mtime before second sync
    const { mtimeMs: mtimeBefore } = require("node:fs").statSync(schemaPath);

    // Second sync should not write (no changes)
    syncPrismaModels(schemaPath);
    const { mtimeMs: mtimeAfter } = require("node:fs").statSync(schemaPath);

    // File should not have been written to
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  // -----------------------------------------------------------------------
  // Field updates: type changes, optional changes, attribute removal
  // -----------------------------------------------------------------------

  it("updates a field whose fieldType differs from expected", () => {
    // Schema with status field as Int instead of String
    const schemaWithWrongType = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String
  type        String
  message     String   @db.Text
  status      Int      @default(0)
  url         String
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  annotations SitepingAnnotation[]
}
`;
    writeFileSync(schemaPath, schemaWithWrongType);

    const result = syncPrismaModels(schemaPath);

    const statusChange = result.changes.find((c) => c.model === "SitepingFeedback" && c.field === "status");
    expect(statusChange).toBeDefined();
    expect(statusChange!.action).toBe("updated");
    // Detail should contain the type change arrow
    expect(statusChange!.detail).toContain("Int");
    expect(statusChange!.detail).toContain("String");
  });

  it("updates a field whose optional state differs (required to optional)", () => {
    // resolvedAt is optional in SITEPING_MODELS — make it required in schema
    const schemaWithReqResolvedAt = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String
  type        String
  message     String   @db.Text
  status      String   @default("open")
  url         String
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  annotations SitepingAnnotation[]
}
`;
    writeFileSync(schemaPath, schemaWithReqResolvedAt);

    const result = syncPrismaModels(schemaPath);

    const resolvedChange = result.changes.find((c) => c.model === "SitepingFeedback" && c.field === "resolvedAt");
    expect(resolvedChange).toBeDefined();
    expect(resolvedChange!.action).toBe("updated");
    // The change detail mentions optional/required transition
    expect(resolvedChange!.detail).toMatch(/optional|required/);
  });

  it("updates a field whose optional state differs (optional to required)", () => {
    // projectName is required in SITEPING_MODELS — make it optional in schema
    const schemaWithOptProjectName = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String?
  type        String
  message     String   @db.Text
  status      String   @default("open")
  url         String
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  annotations SitepingAnnotation[]
}
`;
    writeFileSync(schemaPath, schemaWithOptProjectName);

    const result = syncPrismaModels(schemaPath);

    const projectChange = result.changes.find((c) => c.model === "SitepingFeedback" && c.field === "projectName");
    expect(projectChange).toBeDefined();
    expect(projectChange!.action).toBe("updated");
    expect(projectChange!.detail).toMatch(/optional|required/);
  });

  it("updates a field that has an extra attribute not in the expected definition", () => {
    // projectName has @unique attribute that shouldn't be there
    const schemaWithExtraAttr = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String   @unique
  type        String
  message     String   @db.Text
  status      String   @default("open")
  url         String
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  annotations SitepingAnnotation[]
}
`;
    writeFileSync(schemaPath, schemaWithExtraAttr);

    const result = syncPrismaModels(schemaPath);

    const projectChange = result.changes.find((c) => c.model === "SitepingFeedback" && c.field === "projectName");
    expect(projectChange).toBeDefined();
    expect(projectChange!.action).toBe("updated");
    // Attribute should be removed: detail contains -@unique
    expect(projectChange!.detail).toContain("-@unique");
  });

  it("updates a field whose array state differs", () => {
    // annotations should be SitepingAnnotation[] but defined as SitepingAnnotation
    const schemaWithWrongArray = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String
  type        String
  message     String   @db.Text
  status      String   @default("open")
  url         String
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  annotations SitepingAnnotation
}
`;
    writeFileSync(schemaPath, schemaWithWrongArray);

    const result = syncPrismaModels(schemaPath);

    const annotChange = result.changes.find((c) => c.model === "SitepingFeedback" && c.field === "annotations");
    expect(annotChange).toBeDefined();
    expect(annotChange!.action).toBe("updated");
  });

  // -----------------------------------------------------------------------
  // User-owned parts of a Siteping field (@map, @ignore, relation name, comment)
  // -----------------------------------------------------------------------

  describe("user-owned field parts", () => {
    it("does not count a @map column name as drift", () => {
      const schema = syncedSchema().replace(/^(\s*projectName\s+String)$/m, '$1 @map("project_name")');
      writeFileSync(schemaPath, schema);

      const result = syncPrismaModels(schemaPath);

      expect(result.changes).toEqual([]);
      expect(readFileSync(schemaPath, "utf-8")).toBe(schema);
    });

    it("keeps @map, @ignore and the trailing comment when rewriting a drifted field", () => {
      // message lost its @db.Text — the rewrite restores it and nothing else.
      const schema = syncedSchema().replace(
        /^(\s*)message\s+String\s+@db\.Text$/m,
        '$1message String @map("body") @ignore // client text',
      );
      writeFileSync(schemaPath, schema);

      const result = syncPrismaModels(schemaPath);

      expect(result.changes).toEqual([
        { model: "SitepingFeedback", field: "message", action: "updated", detail: "+@db.Text" },
      ]);
      expect(readFileSync(schemaPath, "utf-8")).toMatch(
        /^\s*message\s+String\s+@db\.Text @map\("body"\) @ignore \/\/ client text$/m,
      );
    });

    it("keeps a named relation on both sides", () => {
      // Stripping the name from one side only leaves Prisma with "missing an
      // opposite relation field" — the schema must come back untouched.
      const schema = syncedSchema()
        .replace(/^(\s*annotations\s+SitepingAnnotation\[\])$/m, '$1 @relation("FbAnn")')
        .replace("@relation(fields:", '@relation("FbAnn", fields:');
      writeFileSync(schemaPath, schema);

      const result = syncPrismaModels(schemaPath);

      expect(result.changes).toEqual([]);
      expect(readFileSync(schemaPath, "utf-8")).toBe(schema);
    });

    it("keeps the relation name when rewriting a drifted relation field", () => {
      const schema = syncedSchema()
        .replace(/^(\s*)annotations\s+SitepingAnnotation\[\]$/m, '$1annotations SitepingAnnotation @relation("FbAnn")')
        .replace(
          /feedback(\s+)SitepingFeedback @relation\(fields:/,
          'feedback$1SitepingFeedback? @relation(name: "FbAnn", fields:',
        );
      writeFileSync(schemaPath, schema);

      const result = syncPrismaModels(schemaPath);

      expect(result.changes.map((c) => `${c.model}.${c.field}`)).toEqual([
        "SitepingFeedback.annotations",
        "SitepingAnnotation.feedback",
      ]);
      const output = readFileSync(schemaPath, "utf-8");
      expect(output).toMatch(/^\s*annotations\s+SitepingAnnotation\[\]\s+@relation\("FbAnn"\)$/m);
      expect(output).toMatch(
        /^\s*feedback\s+SitepingFeedback\s+@relation\(name: "FbAnn", fields: \[feedbackId\], references: \[id\], onDelete: Cascade\)$/m,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Attribute arguments (onDelete, @default value, …)
  // -----------------------------------------------------------------------

  describe("attribute arguments", () => {
    it("restores a removed onDelete: Cascade", () => {
      // Without the cascade, deleting a feedback that has annotations fails
      // with a foreign-key error in the Prisma adapter.
      writeFileSync(schemaPath, syncedSchema().replace(", onDelete: Cascade", ""));

      const result = syncPrismaModels(schemaPath);

      expect(result.changes).toEqual([
        {
          model: "SitepingAnnotation",
          field: "feedback",
          action: "updated",
          detail:
            "@relation(fields: [feedbackId], references: [id]) → @relation(fields: [feedbackId], onDelete: Cascade, references: [id])",
        },
      ]);
      expect(readFileSync(schemaPath, "utf-8")).toContain(
        "@relation(fields: [feedbackId], references: [id], onDelete: Cascade)",
      );
    });

    it("restores a changed @default value", () => {
      writeFileSync(schemaPath, syncedSchema().replace("@default(cuid())", "@default(uuid())"));

      const result = syncPrismaModels(schemaPath);

      expect(result.changes).toEqual([
        {
          model: "SitepingFeedback",
          field: "id",
          action: "updated",
          detail: "@default(uuid()) → @default(cuid())",
        },
      ]);
      expect(readFileSync(schemaPath, "utf-8")).not.toContain("uuid()");
    });

    it("treats equivalent spellings and constraint names as up to date", () => {
      // Reordered keyed args, `1.0` for `1`, and `map:` constraint names (the
      // user's database naming, like `@map`) are not drift.
      const schema = syncedSchema()
        .replace(
          "@relation(fields: [feedbackId], references: [id], onDelete: Cascade)",
          '@relation(onDelete: Cascade, references: [id], fields: [feedbackId], map: "fk_annotation_feedback")',
        )
        .replace("@default(1)", "@default(1.0)")
        .replace("@id @default(cuid())", '@id(map: "pk_feedback") @default(cuid())');
      writeFileSync(schemaPath, schema);

      const result = syncPrismaModels(schemaPath);

      expect(result.changes).toEqual([]);
      expect(readFileSync(schemaPath, "utf-8")).toBe(schema);
    });

    it("keeps a map: constraint name when rewriting the attribute", () => {
      writeFileSync(
        schemaPath,
        syncedSchema().replace(
          "@relation(fields: [feedbackId], references: [id], onDelete: Cascade)",
          '@relation(fields: [feedbackId], references: [id], map: "fk_annotation_feedback")',
        ),
      );

      syncPrismaModels(schemaPath);

      expect(readFileSync(schemaPath, "utf-8")).toContain(
        '@relation(fields: [feedbackId], references: [id], onDelete: Cascade, map: "fk_annotation_feedback")',
      );
    });
  });

  // -----------------------------------------------------------------------
  // `///` doc comments (Prisma documentation — must stay directly above)
  // -----------------------------------------------------------------------

  describe("/// doc comments", () => {
    it("keeps a /// doc directly above its model or enum", () => {
      // A blank line in between detaches the doc (DMMF loses it), so the
      // attached docs must stay attached — and a detached one detached.
      writeFileSync(
        schemaPath,
        SCHEMA_WITH_PARTIAL_MODEL.replace("model SitepingFeedback {", "/// Feedback inbox\nmodel SitepingFeedback {") +
          "\n/// Roles\nenum Role {\n  ADMIN\n}\n\n/// Not attached\n\nmodel Other {\n  id String @id\n}\n",
      );

      syncPrismaModels(schemaPath);

      const output = readFileSync(schemaPath, "utf-8");
      expect(output).toContain("/// Feedback inbox\nmodel SitepingFeedback {");
      expect(output).toContain("/// Roles\nenum Role {");
      expect(output).toContain("/// Not attached\n\nmodel Other {");
    });

    it("inserts new fields above the comments documenting createdAt", () => {
      writeFileSync(
        schemaPath,
        SCHEMA_WITH_PARTIAL_MODEL.replace(
          /^(\s*)createdAt/m,
          "$1// Set by the database\n$1/// When the feedback was filed\n$1createdAt",
        ),
      );

      syncPrismaModels(schemaPath);

      const output = readFileSync(schemaPath, "utf-8");
      expect(output).toMatch(/\/\/ Set by the database\n\s*\/\/\/ When the feedback was filed\n\s*createdAt\s/);
      // The new fields land above the comment run, not between it and createdAt.
      expect(output.indexOf("clientId")).toBeLessThan(output.indexOf("// Set by the database"));
    });
  });

  // -----------------------------------------------------------------------
  // Edge case: model exists but has no createdAt field
  // -----------------------------------------------------------------------

  it("appends new fields when existing model lacks createdAt", () => {
    // SitepingFeedback exists but has no createdAt — fields should be appended at end
    const schemaWithoutCreatedAt = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String
  type        String
}
`;
    writeFileSync(schemaPath, schemaWithoutCreatedAt);

    const result = syncPrismaModels(schemaPath);

    // Many fields should be added
    expect(result.changes.length).toBeGreaterThan(0);
    const addedFields = result.changes.filter((c) => c.action === "added" && c.model === "SitepingFeedback");
    expect(addedFields.length).toBeGreaterThan(0);

    // Output should still be valid and contain all the missing fields
    const output = readFileSync(schemaPath, "utf-8");
    expect(output).toContain("model SitepingFeedback");
    expect(output).toContain("createdAt");
    expect(output).toContain("clientId");
  });

  // -----------------------------------------------------------------------
  // Edge case: existing @@index block in non-array form
  // -----------------------------------------------------------------------

  it("treats @@index with non-array argument as missing and adds correct index", () => {
    // SitepingFeedback exists with an unusual @@index(projectName) (non-array form)
    // hasBlockIndex should return false for this, and a new array-form index should be added
    const schemaWithNonArrayIndex = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String
  type        String
  message     String   @db.Text
  status      String   @default("open")
  url         String
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  annotations SitepingAnnotation[]

  @@index(projectName)
}
`;
    writeFileSync(schemaPath, schemaWithNonArrayIndex);

    const result = syncPrismaModels(schemaPath);

    // Sync should succeed without throwing — the non-array @@index is not recognized,
    // so the array-form index is added.
    const indexChanges = result.changes.filter((c) => c.field.startsWith("@@index"));
    expect(indexChanges.length).toBeGreaterThan(0);
  });

  it("treats empty @@index() block as missing (no firstArg)", () => {
    // SitepingFeedback exists with @@index() (no arguments) — hasBlockIndex's firstArg is undefined.
    // The array-form indexes should be added.
    const schemaWithEmptyIndex = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model SitepingFeedback {
  id          String   @id @default(cuid())
  projectName String
  type        String
  message     String   @db.Text
  status      String   @default("open")
  url         String
  viewport    String
  userAgent   String
  authorName  String
  authorEmail String
  clientId    String   @unique
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  annotations SitepingAnnotation[]

  @@index()
}
`;
    writeFileSync(schemaPath, schemaWithEmptyIndex);

    const result = syncPrismaModels(schemaPath);

    // The @@index() with no args is unrecognized, so the proper indexes should be added.
    const indexChanges = result.changes.filter((c) => c.field.startsWith("@@index"));
    expect(indexChanges.length).toBeGreaterThan(0);
  });

  it.each([
    ["the fields: keyword form", "@@index([feedbackId])", "@@index(fields: [feedbackId])"],
    [
      "a sort order on a column",
      "@@index([projectName, status, createdAt])",
      "@@index([projectName, status, createdAt(sort: Desc)])",
    ],
  ])("recognizes an existing @@index written with %s", (_label, generated, equivalent) => {
    // A second @@index on the same columns is a Prisma error (P1012: the
    // default constraint name "has to be unique"), so none may be appended.
    const schema = syncedSchema().replace(generated, equivalent);
    writeFileSync(schemaPath, schema);

    const result = syncPrismaModels(schemaPath);

    expect(result.changes).toEqual([]);
    expect(readFileSync(schemaPath, "utf-8")).toBe(schema);
  });

  // -----------------------------------------------------------------------
  // Multi-file schema folder (prisma/schema/*.prisma)
  // -----------------------------------------------------------------------

  describe("multi-file schema folder", () => {
    let folder: string;
    let mainPath: string;
    let sitepingPath: string;

    beforeEach(() => {
      folder = join(tmpDir, "prisma", "schema");
      mkdirSync(folder, { recursive: true });
      mainPath = join(folder, "schema.prisma");
      sitepingPath = join(folder, "siteping.prisma");
    });

    /** The two Siteping models as `sync` writes them, without the datasource/generator. */
    function sitepingModels(): string {
      const synced = syncedSchema();
      return synced.slice(synced.indexOf("model SitepingFeedback"));
    }

    it("finds the Siteping models in a sibling file instead of adding them again", () => {
      const models = sitepingModels();
      writeFileSync(mainPath, MINIMAL_SCHEMA);
      writeFileSync(sitepingPath, models);

      const result = syncPrismaModels(mainPath);

      expect(result.addedModels).toEqual([]);
      expect(result.changes).toEqual([]);
      expect(readFileSync(mainPath, "utf-8")).toBe(MINIMAL_SCHEMA);
      expect(readFileSync(sitepingPath, "utf-8")).toBe(models);
    });

    it("updates a drifted model in the file that holds it", () => {
      writeFileSync(mainPath, MINIMAL_SCHEMA);
      writeFileSync(sitepingPath, sitepingModels().replace(/^\s*screenshotRegion\s+Json\?\s*\n/m, ""));

      const result = syncPrismaModels(mainPath);

      expect(result.changes).toEqual([
        { model: "SitepingFeedback", field: "screenshotRegion", action: "added", detail: "Json?" },
      ]);
      expect(readFileSync(mainPath, "utf-8")).toBe(MINIMAL_SCHEMA);
      expect(readFileSync(sitepingPath, "utf-8")).toMatch(/screenshotRegion\s+Json\?/);
      expect(readFileSync(sitepingPath, "utf-8").match(/model SitepingFeedback/g)).toHaveLength(1);
    });

    it("reads the datasource provider from a sibling file", () => {
      writeFileSync(mainPath, 'generator client {\n  provider = "prisma-client-js"\n}\n');
      mkdirSync(join(folder, "db"));
      writeFileSync(join(folder, "db", "datasource.prisma"), 'datasource db {\n  provider = "sqlite"\n}\n');

      const result = syncPrismaModels(mainPath);

      expect(result.addedModels).toEqual(["SitepingFeedback", "SitepingAnnotation"]);
      expect(readFileSync(mainPath, "utf-8")).not.toContain("@db.");
    });

    it("leaves sibling .prisma files alone outside a schema folder", () => {
      // prisma/schema.prisma is a single-file schema — Prisma ignores its neighbours.
      const single = join(tmpDir, "prisma", "schema.prisma");
      writeFileSync(single, MINIMAL_SCHEMA);
      writeFileSync(join(tmpDir, "prisma", "old.prisma"), sitepingModels());

      expect(syncPrismaModels(single).addedModels).toEqual(["SitepingFeedback", "SitepingAnnotation"]);
    });

    it("treats a project root named schema as a single-file schema", () => {
      // A package root is not a schema folder: another app's schema or a
      // generated client's copy under it must be neither read nor written.
      const project = join(tmpDir, "schema");
      const rootSchema = join(project, "schema.prisma");
      const others = [join(project, "apps", "admin", "siteping.prisma"), join(project, "node_modules", "x.prisma")];
      const models = sitepingModels().replace(/^\s*screenshotRegion\s+Json\?\s*\n/m, "");
      mkdirSync(join(project, "apps", "admin"), { recursive: true });
      mkdirSync(join(project, "node_modules"));
      writeFileSync(join(project, "package.json"), "{}");
      writeFileSync(rootSchema, MINIMAL_SCHEMA);
      for (const other of others) writeFileSync(other, models);

      const result = syncPrismaModels(rootSchema);

      expect(result.addedModels).toEqual(["SitepingFeedback", "SitepingAnnotation"]);
      expect(readFileSync(rootSchema, "utf-8")).toContain("model SitepingFeedback {");
      for (const other of others) expect(readFileSync(other, "utf-8")).toBe(models);
    });

    it.each([
      ["node_modules", "client"],
      [".generated", "client"],
    ])("ignores .prisma files under %s in a schema folder", (...segments) => {
      const copy = join(folder, ...segments, "schema.prisma");
      const models = sitepingModels().replace(/^\s*screenshotRegion\s+Json\?\s*\n/m, "");
      mkdirSync(dirname(copy), { recursive: true });
      writeFileSync(mainPath, MINIMAL_SCHEMA);
      writeFileSync(copy, models);

      const result = syncPrismaModels(mainPath);

      expect(result.addedModels).toEqual(["SitepingFeedback", "SitepingAnnotation"]);
      expect(readFileSync(copy, "utf-8")).toBe(models);
    });
  });

  // -----------------------------------------------------------------------
  // Default schema path argument
  // -----------------------------------------------------------------------

  it("uses default schema path when called with no argument", () => {
    // Calling syncPrismaModels() with no args should use prisma/schema.prisma as default.
    // Since that path likely doesn't exist in the test environment, it should throw.
    expect(() => syncPrismaModels()).toThrow("Schema file not found");
  });

  // -----------------------------------------------------------------------
  // writeFileSync error handling — using mocked fs writeFileSync
  // -----------------------------------------------------------------------

  describe("write error handling", () => {
    afterEach(() => {
      writeFileMock.fn = null;
    });

    it("wraps EACCES errors with a helpful message", () => {
      writeFileSync(schemaPath, MINIMAL_SCHEMA);

      writeFileMock.fn = () => {
        const e = new Error("permission denied") as NodeJS.ErrnoException;
        e.code = "EACCES";
        throw e;
      };

      expect(() => syncPrismaModels(schemaPath)).toThrow(/Permission denied.*Check file permissions/);
    });

    it("wraps EPERM errors with a helpful message", () => {
      writeFileSync(schemaPath, MINIMAL_SCHEMA);

      writeFileMock.fn = () => {
        const e = new Error("operation not permitted") as NodeJS.ErrnoException;
        e.code = "EPERM";
        throw e;
      };

      expect(() => syncPrismaModels(schemaPath)).toThrow(/Permission denied.*Check file permissions/);
    });

    it("rethrows non-permission errors verbatim", () => {
      writeFileSync(schemaPath, MINIMAL_SCHEMA);

      writeFileMock.fn = () => {
        const e = new Error("disk full") as NodeJS.ErrnoException;
        e.code = "ENOSPC";
        throw e;
      };

      expect(() => syncPrismaModels(schemaPath)).toThrow("disk full");
    });
  });
});
