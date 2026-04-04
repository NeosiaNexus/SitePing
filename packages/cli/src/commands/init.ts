import * as p from "@clack/prompts";
import { syncPrismaModels } from "../generators/prisma.js";
import { generateRoute } from "../generators/route.js";
import { findPrismaSchema } from "../utils/find-schema.js";

export async function initCommand(): Promise<void> {
  p.intro("siteping — Setup");

  const cwd = process.cwd();

  // Step 1: Prisma schema
  const schemaPath = findPrismaSchema(cwd);

  if (schemaPath) {
    p.log.info(`Prisma schema found: ${schemaPath}`);

    const shouldSync = await p.confirm({
      message: "Sync Siteping models to your Prisma schema?",
    });

    if (p.isCancel(shouldSync)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }

    if (shouldSync) {
      try {
        const { addedModels, changes } = syncPrismaModels(schemaPath);

        if (addedModels.length > 0) {
          p.log.success(`Models synced: ${addedModels.join(", ")}`);
        }

        for (const change of changes) {
          if (change.action === "added") {
            p.log.success(`${change.model}.${change.field} — added (${change.detail})`);
          } else {
            p.log.success(`${change.model}.${change.field} — updated (${change.detail})`);
          }
        }

        if (addedModels.length === 0 && changes.length === 0) {
          p.log.info("Schema is already up to date.");
        }
      } catch (error) {
        p.log.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        p.outro("Fix the errors above and re-run `siteping init`.");
        process.exit(1);
      }
    }
  } else {
    p.log.warn("No schema.prisma file found. You will need to add the models manually.");
    p.log.info("See the documentation: https://github.com/NeosiaNexus/SitePing#prisma-schema-1");
  }

  // Step 2: API route
  const shouldRoute = await p.confirm({
    message: "Generate the Next.js App Router API route?",
  });

  if (p.isCancel(shouldRoute)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  if (shouldRoute) {
    try {
      const { created, path } = generateRoute(cwd);
      if (created) {
        p.log.success(`Route created: ${path}`);
      } else {
        p.log.info(`Route already exists: ${path}`);
      }
    } catch (error) {
      p.log.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      p.outro("Fix the errors above and re-run `siteping init`.");
      process.exit(1);
    }
  }

  // Step 3: Next steps
  p.note(
    [
      "1. Run: npx prisma db push",
      "2. Add the widget to your layout:",
      "",
      '   import { initSiteping } from "@siteping/widget"',
      "",
      "   initSiteping({",
      '     endpoint: "/api/siteping",',
      '     projectName: "my-project",',
      "   })",
    ].join("\n"),
    "Next steps",
  );

  p.outro("Setup complete!");
}
