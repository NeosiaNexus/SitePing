import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
});
