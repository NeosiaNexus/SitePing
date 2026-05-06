// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initCommand } from "../../src/commands/init.js";
import { p } from "../../src/prompts.js";

// ---------------------------------------------------------------------------
// ExitError — thrown by mocked process.exit to halt execution cleanly
// ---------------------------------------------------------------------------

class ExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

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

function createPrismaSchema(dir: string, content = MINIMAL_SCHEMA): void {
  const prismaDir = join(dir, "prisma");
  mkdirSync(prismaDir, { recursive: true });
  writeFileSync(join(prismaDir, "schema.prisma"), content);
}

function createAppDir(dir: string): void {
  mkdirSync(join(dir, "app"), { recursive: true });
}

function createApiRoute(dir: string): void {
  const routeDir = join(dir, "app", "api", "siteping");
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(join(routeDir, "route.ts"), "export const GET = () => {};");
}

function allMessages(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call) => String(call[0]));
}

// ---------------------------------------------------------------------------
// Tests — integration style: real file system, spied clack output
// ---------------------------------------------------------------------------

describe("initCommand", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "siteping-init-test-"));
    originalCwd = process.cwd();
    process.chdir(tmpDir);

    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new ExitError(code ?? 0);
    }) as never);
    vi.spyOn(p, "intro").mockImplementation(() => {});
    vi.spyOn(p, "outro").mockImplementation(() => {});
    vi.spyOn(p, "cancel").mockImplementation(() => {});
    vi.spyOn(p, "confirm").mockResolvedValue(false);
    vi.spyOn(p, "note").mockImplementation(() => {});
    vi.spyOn(p, "isCancel").mockImplementation((v: unknown) => typeof v === "symbol");
    vi.spyOn(p.log, "error").mockImplementation(() => {});
    vi.spyOn(p.log, "success").mockImplementation(() => {});
    vi.spyOn(p.log, "warn").mockImplementation(() => {});
    vi.spyOn(p.log, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Schema found — sync paths
  // -------------------------------------------------------------------------

  describe("schema found + sync", () => {
    it("syncs new models when confirmed", async () => {
      createPrismaSchema(tmpDir);

      vi.mocked(p.confirm)
        .mockResolvedValueOnce(true) // sync schema
        .mockResolvedValueOnce(false); // skip route

      await initCommand();

      expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining("Prisma schema found"));
      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining("SitepingFeedback"));
      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining("SitepingAnnotation"));
    });

    it("logs field changes for partial schema (added + updated)", async () => {
      createPrismaSchema(
        tmpDir,
        `
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
`,
      );

      vi.mocked(p.confirm)
        .mockResolvedValueOnce(true) // sync schema
        .mockResolvedValueOnce(false); // skip route

      await initCommand();

      const successes = allMessages(vi.mocked(p.log.success));
      // SitepingAnnotation model should be added
      expect(successes.some((m) => m.includes("SitepingAnnotation"))).toBe(true);
      // Missing fields should be logged
      expect(successes.some((m) => m.includes("added"))).toBe(true);
    });

    it("reports schema already up to date when run twice", async () => {
      createPrismaSchema(tmpDir);

      // First run: sync models
      vi.mocked(p.confirm)
        .mockResolvedValueOnce(true) // sync schema
        .mockResolvedValueOnce(false); // skip route

      await initCommand();

      // Clear spies for second run
      vi.mocked(p.log.success).mockClear();
      vi.mocked(p.log.info).mockClear();

      // Second run: already up to date
      vi.mocked(p.confirm)
        .mockResolvedValueOnce(true) // sync schema
        .mockResolvedValueOnce(false); // skip route

      await initCommand();

      expect(p.log.info).toHaveBeenCalledWith("Schema is already up to date.");
    });

    it("exits(1) when schema file cannot be written (permission denied)", async () => {
      createPrismaSchema(tmpDir);
      const schemaPath = join(tmpDir, "prisma", "schema.prisma");
      // Make file read-only to trigger write error
      const { chmodSync } = await import("node:fs");
      chmodSync(schemaPath, 0o444);

      vi.mocked(p.confirm).mockResolvedValueOnce(true); // sync schema

      const err = await initCommand().catch((e) => e);

      // Restore write permission for cleanup
      chmodSync(schemaPath, 0o644);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("Error:"));
      expect(p.outro).toHaveBeenCalledWith(expect.stringContaining("Fix the errors"));
    });

    it("exits(0) when sync confirm is cancelled", async () => {
      createPrismaSchema(tmpDir);

      vi.mocked(p.confirm).mockResolvedValueOnce(Symbol("cancel") as any);

      const err = await initCommand().catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(0);
      expect(p.cancel).toHaveBeenCalledWith("Cancelled.");
    });

    it("does not sync when user declines", async () => {
      createPrismaSchema(tmpDir);

      vi.mocked(p.confirm)
        .mockResolvedValueOnce(false) // decline sync
        .mockResolvedValueOnce(false); // skip route

      await initCommand();

      // Schema should not have been modified (no SitepingFeedback model)
      const successes = allMessages(vi.mocked(p.log.success));
      expect(successes.some((m) => m.includes("Models synced"))).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Schema not found
  // -------------------------------------------------------------------------

  describe("schema not found", () => {
    it("shows warning and doc link when no schema exists", async () => {
      // No prisma schema in tmpDir

      vi.mocked(p.confirm).mockResolvedValueOnce(false); // skip route

      await initCommand();

      expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("No schema.prisma file found"));
      expect(p.log.info).toHaveBeenCalledWith(
        expect.stringContaining("https://github.com/NeosiaNexus/SitePing#prisma-schema-1"),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Route generation
  // -------------------------------------------------------------------------

  describe("route generation", () => {
    it("shows success when route is created", async () => {
      createAppDir(tmpDir);

      vi.mocked(p.confirm).mockResolvedValueOnce(true); // generate route

      await initCommand();

      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining("Route created:"));
      // Verify the file was actually created
      expect(existsSync(join(tmpDir, "app", "api", "siteping", "route.ts"))).toBe(true);
    });

    it("shows info when route already exists", async () => {
      createApiRoute(tmpDir);

      vi.mocked(p.confirm).mockResolvedValueOnce(true); // generate route

      await initCommand();

      expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining("Route already exists:"));
    });

    it("exits(1) when no app directory exists", async () => {
      // No app/ dir in tmpDir

      vi.mocked(p.confirm).mockResolvedValueOnce(true); // generate route (will throw)

      const err = await initCommand().catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("Error:"));
      expect(p.outro).toHaveBeenCalledWith(expect.stringContaining("Fix the errors"));
    });

    it("exits(0) when route confirm is cancelled", async () => {
      // No schema, so we go straight to route prompt
      vi.mocked(p.confirm).mockResolvedValueOnce(Symbol("cancel") as any);

      const err = await initCommand().catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(0);
      expect(p.cancel).toHaveBeenCalledWith("Cancelled.");
    });

    it("does not generate route when user declines", async () => {
      createAppDir(tmpDir);

      vi.mocked(p.confirm).mockResolvedValueOnce(false); // decline route

      await initCommand();

      expect(existsSync(join(tmpDir, "app", "api", "siteping", "route.ts"))).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Full happy path
  // -------------------------------------------------------------------------

  describe("full flow", () => {
    it("runs schema sync + route generation when both confirmed", async () => {
      createPrismaSchema(tmpDir);
      createAppDir(tmpDir);

      vi.mocked(p.confirm)
        .mockResolvedValueOnce(true) // sync schema
        .mockResolvedValueOnce(true); // generate route

      await initCommand();

      const successes = allMessages(vi.mocked(p.log.success));
      expect(successes.some((m) => m.includes("SitepingFeedback"))).toBe(true);
      expect(successes.some((m) => m.includes("Route created"))).toBe(true);
      expect(existsSync(join(tmpDir, "app", "api", "siteping", "route.ts"))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Intro / outro / next steps
  // -------------------------------------------------------------------------

  describe("UI framing", () => {
    it("calls intro and outro", async () => {
      vi.mocked(p.confirm).mockResolvedValueOnce(false);

      await initCommand();

      expect(p.intro).toHaveBeenCalledWith("siteping — Setup");
      expect(p.outro).toHaveBeenCalledWith("Setup complete!");
    });

    it("shows next steps note", async () => {
      vi.mocked(p.confirm).mockResolvedValueOnce(false);

      await initCommand();

      expect(p.note).toHaveBeenCalledWith(expect.stringContaining("prisma db push"), "Next steps");
    });
  });

  // -------------------------------------------------------------------------
  // Non-Error throwables — covers `String(error)` fallback in both catches
  // -------------------------------------------------------------------------

  describe("non-Error throwables", () => {
    it("formats sync failures via String() when a non-Error value is thrown", async () => {
      // Stub syncPrismaModels to throw a plain string. The init catch block
      // chooses `String(error)` because the value is not an Error instance,
      // covering the falsy branch of the conditional in the schema-sync path.
      createPrismaSchema(tmpDir);
      const prismaModule = await import("../../src/generators/prisma.js");
      const stub = vi.spyOn(prismaModule, "syncPrismaModels").mockImplementation(() => {
        throw "plain-string sync failure"; // not an Error
      });

      vi.mocked(p.confirm).mockResolvedValueOnce(true); // confirm sync

      const err = await initCommand().catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("plain-string sync failure"));
      expect(p.outro).toHaveBeenCalledWith(expect.stringContaining("Fix the errors"));

      stub.mockRestore();
    });

    it("formats route-generation failures via String() when a non-Error value is thrown", async () => {
      // Stub generateRoute to throw a plain string in the route-creation path.
      const routeModule = await import("../../src/generators/route.js");
      const stub = vi.spyOn(routeModule, "generateRoute").mockImplementation(() => {
        throw "plain-string route failure"; // not an Error
      });

      // No schema → flow goes straight to route prompt; confirm route generation.
      vi.mocked(p.confirm).mockResolvedValueOnce(true);

      const err = await initCommand().catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("plain-string route failure"));
      expect(p.outro).toHaveBeenCalledWith(expect.stringContaining("Fix the errors"));

      stub.mockRestore();
    });
  });
});
