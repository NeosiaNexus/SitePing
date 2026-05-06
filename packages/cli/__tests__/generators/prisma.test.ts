import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    expect(addedFieldNames).toContain("annotations");

    // Verify the output contains the new fields
    const output = readFileSync(schemaPath, "utf-8");
    expect(output).toContain("clientId");
    expect(output).toContain("@unique");
    expect(output).toContain("authorEmail");
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
