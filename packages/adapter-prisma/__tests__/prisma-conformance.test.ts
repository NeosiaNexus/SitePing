/**
 * The published conformance suite against PrismaStore over a REAL database
 * (#249). The other PrismaStore tests run on an in-memory double, and the
 * store casts every delegate result `as FeedbackRecord`: only a real
 * database shows what the casts can hide — a column read back as a string
 * where the record holds a `Date`, a field the schema lacks, filter,
 * ordering or cascade semantics drifting from the in-memory pipeline.
 *
 * The schema is not hand-written: the CLI's `sync` writes the Siteping
 * models from `SITEPING_MODELS` into a bare schema, exactly as it does for
 * a user, then `prisma generate` and `prisma db push` build the client and
 * the database (about 2 s).
 *
 * It follows the Prisma installed, so CI can back the whole
 * `@prisma/client` peer range (#512):
 * - Prisma 7 (the workspace's): SQLite through libSQL's driver adapter,
 *   the datasource URL in `prisma.config.ts`, the `prisma-client` generator.
 * - Prisma 5 and 6 (the `prisma-compat` CI job installs them): the
 *   `prisma-client-js` generator and the URL in the schema, on SQLite, or
 *   on PostgreSQL when `SITEPING_CONFORMANCE_DATABASE_URL` is set. SQLite
 *   has no Json column before Prisma 6.2, which the job keeps to PostgreSQL.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { testSitepingStore } from "@siteping/core/testing";
import { afterAll, describe } from "vitest";
import { syncPrismaModels } from "../../cli/src/generators/prisma.js";
import { type PrismaModelDelegate, PrismaStore, type SitepingPrismaClient } from "../src/index.js";

/** The generated client, as far as this test drives it. */
type TestClient = SitepingPrismaClient & {
  sitepingComment: PrismaModelDelegate;
  sitepingAnnotation: PrismaModelDelegate;
  $disconnect(): Promise<void>;
};

const packageDir = fileURLToPath(new URL("..", import.meta.url));
const prismaMajor = Number(
  (
    JSON.parse(readFileSync(join(packageDir, "node_modules", "prisma", "package.json"), "utf8")) as { version: string }
  ).version.split(".")[0],
);
const postgresUrl = process.env.SITEPING_CONFORMANCE_DATABASE_URL;
if (postgresUrl && prismaMajor >= 7) {
  throw new Error("SITEPING_CONFORMANCE_DATABASE_URL is read on Prisma 5 and 6 only: Prisma 7 runs on SQLite here");
}
const provider = postgresUrl ? "postgresql" : "sqlite";

// The generated client imports `@prisma/client`, so it must live inside the
// package to resolve it; `.generated/` is git- and Biome-ignored.
const generatedRoot = join(packageDir, "__tests__", ".generated");
mkdirSync(generatedRoot, { recursive: true });
const clientDir = mkdtempSync(join(generatedRoot, `${provider}-`));
const workDir = mkdtempSync(join(tmpdir(), `siteping-${provider}-`));
const databaseUrl = postgresUrl ?? `file:${join(workDir, "test.db")}`;
const schemaPath = join(workDir, "schema.prisma");

const generator =
  prismaMajor >= 7
    ? `generator client {\n  provider = "prisma-client"\n  output   = ${JSON.stringify(clientDir)}\n}`
    : `generator client {\n  provider = "prisma-client-js"\n  output   = ${JSON.stringify(clientDir)}\n}`;
const datasource =
  prismaMajor >= 7
    ? `datasource db {\n  provider = "${provider}"\n}`
    : `datasource db {\n  provider = "${provider}"\n  url      = ${JSON.stringify(databaseUrl)}\n}`;
writeFileSync(schemaPath, `${generator}\n\n${datasource}\n`);
syncPrismaModels(schemaPath);

const prismaCli = join(packageDir, "node_modules", ".bin", "prisma");
const location =
  prismaMajor >= 7
    ? (() => {
        const config = join(workDir, "prisma.config.ts");
        writeFileSync(
          config,
          `export default { schema: "schema.prisma", datasource: { url: ${JSON.stringify(databaseUrl)} } };\n`,
        );
        return ["--config", config];
      })()
    : ["--schema", schemaPath];
// A shared PostgreSQL may hold the tables of an earlier run: start from empty ones.
const push = prismaMajor >= 7 ? ["db", "push"] : ["db", "push", "--skip-generate", "--force-reset"];
for (const command of [["generate"], push]) {
  execFileSync(prismaCli, [...command, ...location], {
    cwd: workDir,
    env: { ...process.env, CHECKPOINT_DISABLE: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    stdio: "pipe",
  });
}

type ClientConstructor = new (options?: { adapter: PrismaLibSql }) => TestClient;
const prisma =
  prismaMajor >= 7
    ? new (
        (await import(pathToFileURL(join(clientDir, "client.ts")).href)) as { PrismaClient: ClientConstructor }
      ).PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl }) })
    : // `prisma-client-js` writes a CommonJS module.
      new (
        (await import(pathToFileURL(join(clientDir, "index.js")).href)) as { PrismaClient: ClientConstructor }
      ).PrismaClient();

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

// `mode: "insensitive"` exists on PostgreSQL only. On SQLite, `contains` is
// its `LIKE`, which folds ASCII only, so the suite asserts same-case matching.
const caseInsensitiveSearch = provider === "postgresql";

describe(`PrismaStore on ${provider}, Prisma ${prismaMajor}`, () => {
  testSitepingStore(
    async () => {
      // A fresh, empty store per test. Children first, so the reset never
      // leans on the cascade the suite itself checks.
      await prisma.sitepingComment.deleteMany({ where: {} });
      await prisma.sitepingAnnotation.deleteMany({ where: {} });
      await prisma.sitepingFeedback.deleteMany({ where: {} });
      return new PrismaStore(prisma, { caseInsensitiveSearch });
    },
    { caseInsensitiveSearch },
  );
});
