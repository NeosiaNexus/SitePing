import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import { syncPrismaModels } from "../generators/prisma.js";
import { findPrismaSchema } from "../utils/find-schema.js";

export function syncCommand(options: { schema?: string }): void {
  const cwd = process.cwd();
  const schemaPath = options.schema ?? findPrismaSchema(cwd);

  if (!schemaPath) {
    p.log.error("No schema.prisma file found.");
    p.log.info("Specify the path with --schema <path>");
    process.exit(1);
  }

  if (!existsSync(schemaPath)) {
    p.log.error(`File not found: ${schemaPath}`);
    process.exit(1);
  }

  try {
    const { addedModels, changes } = syncPrismaModels(schemaPath);

    if (addedModels.length === 0 && changes.length === 0) {
      p.log.info("Schema is already up to date.");
      return;
    }

    if (addedModels.length > 0) {
      p.log.success(`Models synced: ${addedModels.join(", ")}`);
    }

    for (const change of changes) {
      const icon = change.action === "added" ? "+" : "~";
      p.log.success(
        `${icon} ${change.model}.${change.field} — ${change.action === "added" ? "added" : "updated"} (${change.detail})`,
      );
    }

    p.log.info("Don't forget to run: npx prisma db push");
  } catch (error) {
    p.log.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
