// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateRoute } from "../../src/generators/route.js";

describe("generateRoute", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "siteping-route-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Directory detection
  // -------------------------------------------------------------------------

  it("creates route in app/api/siteping/route.ts when app/ exists", () => {
    mkdirSync(join(tmpDir, "app"), { recursive: true });

    const result = generateRoute(tmpDir);

    expect(result.created).toBe(true);
    expect(result.path).toBe(join(tmpDir, "app", "api", "siteping", "route.ts"));
    expect(existsSync(result.path)).toBe(true);
  });

  it("creates route in src/app/api/siteping/route.ts when src/app/ exists", () => {
    mkdirSync(join(tmpDir, "src", "app"), { recursive: true });

    const result = generateRoute(tmpDir);

    expect(result.created).toBe(true);
    expect(result.path).toBe(join(tmpDir, "src", "app", "api", "siteping", "route.ts"));
    expect(existsSync(result.path)).toBe(true);
  });

  it("prefers src/app/ over app/ when both exist", () => {
    mkdirSync(join(tmpDir, "src", "app"), { recursive: true });
    mkdirSync(join(tmpDir, "app"), { recursive: true });

    const result = generateRoute(tmpDir);

    expect(result.path).toBe(join(tmpDir, "src", "app", "api", "siteping", "route.ts"));
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it("throws when no app/ directory exists", () => {
    expect(() => generateRoute(tmpDir)).toThrow(
      "Cannot find the app/ directory. Are you in a Next.js App Router project?",
    );
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  it("returns { created: false } when file already exists", () => {
    mkdirSync(join(tmpDir, "app"), { recursive: true });

    const first = generateRoute(tmpDir);
    expect(first.created).toBe(true);

    const second = generateRoute(tmpDir);
    expect(second.created).toBe(false);
    expect(second.path).toBe(first.path);
  });

  // -------------------------------------------------------------------------
  // Generated content
  // -------------------------------------------------------------------------

  it("generates valid TypeScript with correct imports and exports", () => {
    mkdirSync(join(tmpDir, "app"), { recursive: true });

    const result = generateRoute(tmpDir);
    const content = readFileSync(result.path, "utf-8");

    expect(content).toContain('import { createSitepingHandler } from "@siteping/adapter-prisma"');
    expect(content).toContain('import { prisma } from "@/lib/prisma"');
    expect(content).toContain("export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({");
    expect(content).toContain("prisma,");
    expect(content).toContain("// apiKey: process.env.SITEPING_API_KEY,");
    expect(content).toContain('// allowedOrigins: ["https://your-site.com"],');
  });
});
