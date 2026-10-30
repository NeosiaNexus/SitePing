/**
 * The published conformance suite against PrismaStore over a REAL SQLite
 * database (#249). The other PrismaStore tests run on an in-memory double,
 * and the store casts every delegate result `as FeedbackRecord`: only a
 * real database shows what the casts can hide — a column read back as a
 * string where the record holds a `Date`, a field the schema lacks, filter,
 * ordering or cascade semantics drifting from the in-memory pipeline.
 *
 * The schema is not hand-written: the CLI's `sync` writes the Siteping
 * models from `SITEPING_MODELS` into a bare SQLite schema, exactly as it
 * does for a user, then `prisma generate` and `prisma db push` build the
 * client and the database (about 2 s). Prisma 7 reaches SQLite through a
 * driver adapter, here libSQL's.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { testSitepingStore } from "@siteping/core/testing";
import { afterAll, describe } from "vitest";
import { syncPrismaModels } from "../../cli/src/generators/prisma.js";
import { type PrismaModelDelegate, PrismaStore, type SitepingPrismaClient } from "../src/index.js";

/** The generated client, as far as this test drives it. */
type SqliteClient = SitepingPrismaClient & {
  sitepingComment: PrismaModelDelegate;
  sitepingAnnotation: PrismaModelDelegate;
  $disconnect(): Promise<void>;
};

const packageDir = fileURLToPath(new URL("..", import.meta.url));
// The generated client imports `@prisma/client`, so it must live inside the
// package to resolve it; `.generated/` is git- and Biome-ignored.
const generatedRoot = join(packageDir, "__tests__", ".generated");
mkdirSync(generatedRoot, { recursive: true });
const clientDir = mkdtempSync(join(generatedRoot, "sqlite-"));
const workDir = mkdtempSync(join(tmpdir(), "siteping-sqlite-"));
const databaseUrl = `file:${join(workDir, "test.db")}`;

writeFileSync(
  join(workDir, "schema.prisma"),
  `generator client {\n  provider = "prisma-client"\n  output   = ${JSON.stringify(clientDir)}\n}\n\ndatasource db {\n  provider = "sqlite"\n}\n`,
);
writeFileSync(
  join(workDir, "prisma.config.ts"),
  `export default { schema: "schema.prisma", datasource: { url: ${JSON.stringify(databaseUrl)} } };\n`,
);
syncPrismaModels(join(workDir, "schema.prisma"));

const prismaCli = join(packageDir, "node_modules", ".bin", "prisma");
for (const command of [["generate"], ["db", "push"]]) {
  execFileSync(prismaCli, [...command, "--config", join(workDir, "prisma.config.ts")], {
    cwd: workDir,
    env: { ...process.env, CHECKPOINT_DISABLE: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    stdio: "pipe",
  });
}

const { PrismaClient } = (await import(pathToFileURL(join(clientDir, "client.ts")).href)) as {
  PrismaClient: new (options: { adapter: PrismaLibSql }) => SqliteClient;
};
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl }) });

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(clientDir, { recursive: true, force: true });
  rmSync(workDir, { recursive: true, force: true });
  try {
    rmdirSync(generatedRoot); // only when no other run still uses it
  } catch {
    // not empty
  }
});

describe("PrismaStore on SQLite", () => {
  testSitepingStore(
    async () => {
      // A fresh, empty store per test. Children first, so the reset never
      // leans on the cascade the suite itself checks.
      await prisma.sitepingComment.deleteMany({ where: {} });
      await prisma.sitepingAnnotation.deleteMany({ where: {} });
      await prisma.sitepingFeedback.deleteMany({ where: {} });
      return new PrismaStore(prisma, { caseInsensitiveSearch: false });
    },
    {
      // A repeated clientId hits the unique index: P2002, mapped to StoreDuplicateError.
      duplicateBehavior: "throw",
      // No `mode: "insensitive"` on SQLite: `contains` is its `LIKE`, which
      // folds ASCII only, so the suite asserts same-case matching.
      caseInsensitiveSearch: false,
    },
  );
});
