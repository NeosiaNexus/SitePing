import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROUTE_TEMPLATE = `import { createSitepingHandler } from "@siteping/adapter-prisma";
import { prisma } from "@/lib/prisma";

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
  prisma,
  // Required in production — the handler refuses to start without a key.
  // Status changes and deletes then need \`Authorization: Bearer <key>\`;
  // feedback submissions from the widget stay open.
  apiKey: process.env.SITEPING_API_KEY,
  // allowedOrigins: ["https://your-site.com"],
});
`;

/** Result of a route-generation attempt. */
export interface RouteGenerationResult {
  /** `true` when the file was just created, `false` when it already existed. */
  created: boolean;
  /** Absolute path of the target route file. */
  path: string;
}

/**
 * The App Router directory Next.js serves: `app/`, else `src/app/`. Next
 * resolves `./app` first and then ignores `src/app` entirely
 * (next/dist/lib/find-pages-dir.js), so a route under it would be dead.
 */
export function findAppDir(basePath: string): string | null {
  return [join(basePath, "app"), join(basePath, "src", "app")].find((dir) => existsSync(dir)) ?? null;
}

/** Next.js's default `pageExtensions` — a route handler in any of them counts. */
const ROUTE_EXTENSIONS = ["ts", "tsx", "js", "jsx"] as const;

/**
 * The existing `api/siteping/route.*` under `appDir`, if any. Writing a
 * `route.ts` beside a `route.js` makes Next.js fail ("Duplicate page detected").
 */
export function findRouteFile(appDir: string): string | null {
  const routeDir = join(appDir, "api", "siteping");
  return ROUTE_EXTENSIONS.map((ext) => join(routeDir, `route.${ext}`)).find((file) => existsSync(file)) ?? null;
}

/**
 * Generate the Next.js App Router API route file.
 *
 * Creates `app/api/siteping/route.ts` with the handler setup.
 * Skips if a route file (`route.ts`, `route.js`, …) already exists.
 */
export function generateRoute(basePath: string = process.cwd()): RouteGenerationResult {
  const appDir = findAppDir(basePath);

  if (!appDir) {
    throw new Error("Cannot find the app/ directory. Are you in a Next.js App Router project?");
  }

  const existing = findRouteFile(appDir);
  if (existing) {
    return { created: false, path: existing };
  }

  const routePath = join(appDir, "api", "siteping", "route.ts");

  try {
    mkdirSync(dirname(routePath), { recursive: true });
    writeFileSync(routePath, ROUTE_TEMPLATE, "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EPERM") {
      throw new Error(`Permission denied: cannot write to ${routePath}. Check file permissions.`);
    }
    throw error;
  }

  return { created: true, path: routePath };
}
