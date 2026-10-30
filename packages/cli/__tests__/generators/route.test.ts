// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { generateRoute } from "../../src/generators/route.js";

// Pass-through, so every write is real. The EACCES test below makes one
// write fail with EACCES instead of chmod-ing a file: root writes through
// read-only modes, so chmod can't stage the error when the suite runs as root
// (dev containers, some CI images).
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, writeFileSync: vi.fn(actual.writeFileSync) };
});

describe("generateRoute", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "siteping-route-test-"));
  });

  afterEach(() => {
    // Drop an error a test staged but the code never consumed, so it can't
    // fire at the next test's own setup write; the pass-through comes back.
    vi.mocked(writeFileSync).mockReset();
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

  it("prefers app/ over src/app/ when both exist, as Next.js does", () => {
    // Next.js resolves ./app first and ignores src/app entirely
    // (next/dist/lib/find-pages-dir.js) — a route there would be dead.
    mkdirSync(join(tmpDir, "src", "app"), { recursive: true });
    mkdirSync(join(tmpDir, "app"), { recursive: true });

    const result = generateRoute(tmpDir);

    expect(result.path).toBe(join(tmpDir, "app", "api", "siteping", "route.ts"));
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

  it.each(["js", "jsx", "tsx"])("treats an existing route.%s as the route", (ext) => {
    // A route.ts beside it would make Next.js fail with "Duplicate page detected".
    const routeDir = join(tmpDir, "app", "api", "siteping");
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(join(routeDir, `route.${ext}`), "export const GET = () => {};");

    const result = generateRoute(tmpDir);

    expect(result).toEqual({ created: false, path: join(routeDir, `route.${ext}`) });
    expect(existsSync(join(routeDir, "route.ts"))).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Generated content
  // -------------------------------------------------------------------------

  it("generates valid TypeScript with correct imports and exports", () => {
    mkdirSync(join(tmpDir, "app"), { recursive: true });

    const result = generateRoute(tmpDir);
    const content = readFileSync(result.path, "utf-8");

    expect(content).toContain('import { createSitepingHandler, type SitepingHandler } from "@siteping/adapter-prisma"');
    expect(content).toContain('import { prisma } from "@/lib/prisma"');
    for (const method of ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]) {
      expect(content).toContain(
        `export const ${method}: SitepingHandler["${method}"] = (request) => getHandler().${method}(request);`,
      );
    }
    expect(content).toContain("prisma,");
    // The key is wired, not commented out: the handler refuses to start in
    // production without one, so the generated route must not hide it.
    expect(content).toContain("apiKey: process.env.SITEPING_API_KEY,");
    expect(content).not.toContain("// apiKey");
    expect(content).toContain('// allowedOrigins: ["https://your-site.com"],');
  });

  // -------------------------------------------------------------------------
  // Generated handler at runtime
  // -------------------------------------------------------------------------

  describe("generated handler", () => {
    const METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] as const;
    type Method = (typeof METHODS)[number];
    type Route = Record<Method, (request: Request) => Response | Promise<Response>>;

    const PRISMA = { client: "prisma" };
    const request = new Request("https://site.test/api/siteping");

    /** A handler whose every method answers a `Response` naming that method. */
    function fakeHandler(): Record<Method, Mock<(request: Request) => Response>> {
      const handler = {} as Record<Method, Mock<(request: Request) => Response>>;
      for (const method of METHODS) handler[method] = vi.fn(() => new Response(method));
      return handler;
    }

    /**
     * Generate the route and import it with its two imports pointed at local
     * stubs, mocked so `createSitepingHandler` is `create`. Vitest can't mock a
     * bare specifier that resolves nowhere, hence the rewrite.
     */
    async function importRoute(create: (options: unknown) => unknown): Promise<Route> {
      mkdirSync(join(tmpDir, "app"), { recursive: true });
      const source = readFileSync(generateRoute(tmpDir).path, "utf-8");
      const adapter = join(tmpDir, "adapter-prisma.ts");
      const prisma = join(tmpDir, "prisma.ts");
      writeFileSync(adapter, "export {};\n");
      writeFileSync(prisma, "export {};\n");
      const rewritten = source
        .replace('from "@siteping/adapter-prisma"', `from ${JSON.stringify(adapter)}`)
        .replace('from "@/lib/prisma"', `from ${JSON.stringify(prisma)}`);
      expect(rewritten).not.toContain('"@siteping/adapter-prisma"');
      expect(rewritten).not.toContain('"@/lib/prisma"');
      const route = join(tmpDir, "route.ts");
      writeFileSync(route, rewritten);
      vi.doMock(adapter, () => ({ createSitepingHandler: create }));
      vi.doMock(prisma, () => ({ prisma: PRISMA }));
      return import(route);
    }

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("builds the handler on the first request, not at import, and reuses it", async () => {
      vi.stubEnv("SITEPING_API_KEY", "sk_test");
      const handler = fakeHandler();
      const create = vi.fn(() => handler);

      const route = await importRoute(create);

      // `next build` imports the module: nothing may be built yet.
      expect(create).not.toHaveBeenCalled();
      for (const method of METHODS) {
        expect(await (await route[method](request)).text()).toBe(method);
        expect(handler[method]).toHaveBeenCalledWith(request);
      }
      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({ prisma: PRISMA, apiKey: "sk_test" });
    });

    it("raises a construction error on the request, then retries on the next one", async () => {
      const handler = fakeHandler();
      const create = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error("[siteping] createSitepingHandler: apiKey is required in production.");
        })
        .mockImplementation(() => handler);

      // A build without the runtime secret: the import itself must not throw.
      const route = await importRoute(create);

      expect(() => route.POST(request)).toThrow("apiKey is required in production");
      // A failed build caches nothing, so the next request tries again.
      expect(await (await route.POST(request)).text()).toBe("POST");
      expect(create).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Permission error
  // -------------------------------------------------------------------------

  // Both codes a refused write can carry: EACCES for a mode bit, EPERM for an
  // immutable file on Linux or any access denied on Windows (libuv's mapping).
  it.each([
    ["EACCES", "permission denied"],
    ["EPERM", "operation not permitted"],
  ])("throws descriptive error message on %s permission error", (code, description) => {
    mkdirSync(join(tmpDir, "app"), { recursive: true });
    // The OS refusing the route write (see the node:fs mock above)
    vi.mocked(writeFileSync).mockImplementationOnce((path) => {
      throw Object.assign(new Error(`${code}: ${description}, open '${String(path)}'`), { code });
    });

    expect(() => generateRoute(tmpDir)).toThrow(/^Permission denied: cannot write to .*route\.ts\./);
  });

  it("rethrows non-permission errors (e.g. ENOTDIR) verbatim", () => {
    // Create app/ as a directory, then create a regular file at app/api so
    // mkdirSync recursive cannot create app/api/siteping (ENOTDIR).
    mkdirSync(join(tmpDir, "app"), { recursive: true });
    writeFileSync(join(tmpDir, "app", "api"), "blocker");

    // The generator should throw, but NOT with a "Permission denied" message
    expect(() => generateRoute(tmpDir)).toThrow();
    try {
      generateRoute(tmpDir);
    } catch (e) {
      const msg = (e as Error).message;
      // Should be the original Node error, not the wrapped "Permission denied" one
      expect(msg).not.toMatch(/Permission denied/);
      expect((e as NodeJS.ErrnoException).code).toBe("ENOTDIR");
    }
  });

  // -------------------------------------------------------------------------
  // Default basePath
  // -------------------------------------------------------------------------

  it("uses process.cwd() as default basePath when not provided", () => {
    // generateRoute() without arguments should use process.cwd()
    // Since cwd likely lacks an app/ directory, it should throw the expected error
    const cwd = process.cwd();
    const hasAppDir = existsSync(join(cwd, "src", "app")) || existsSync(join(cwd, "app"));

    if (!hasAppDir) {
      expect(() => generateRoute()).toThrow("Cannot find the app/ directory. Are you in a Next.js App Router project?");
    } else {
      // If cwd happens to have an app dir (unlikely in test), just verify it returns
      const result = generateRoute();
      expect(result.path).toContain("route.ts");
    }
  });
});
