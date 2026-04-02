import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROUTE_TEMPLATE = `import { createSitepingHandler } from "@neosianexus/siteping/adapter-prisma";
import { prisma } from "@/lib/prisma";

export const { GET, POST, PATCH } = createSitepingHandler({ prisma });
`;

/**
 * Generate the Next.js App Router API route file.
 *
 * Creates `app/api/siteping/route.ts` with the handler setup.
 * Skips if the file already exists.
 */
export function generateRoute(
  basePath: string = process.cwd(),
): { created: boolean; path: string } {
  // Detect app directory
  const appDir = existsSync(join(basePath, "src", "app"))
    ? join(basePath, "src", "app")
    : join(basePath, "app");

  if (!existsSync(appDir)) {
    throw new Error(
      `Could not find app/ directory. Are you in a Next.js App Router project?`,
    );
  }

  const routePath = join(appDir, "api", "siteping", "route.ts");

  if (existsSync(routePath)) {
    return { created: false, path: routePath };
  }

  mkdirSync(dirname(routePath), { recursive: true });
  writeFileSync(routePath, ROUTE_TEMPLATE, "utf-8");

  return { created: true, path: routePath };
}
