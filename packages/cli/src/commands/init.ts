import { existsSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { syncPrismaModels } from "../generators/prisma.js";
import { generateRoute } from "../generators/route.js";

export async function initCommand(): Promise<void> {
  p.intro("siteping — Configuration");

  const cwd = process.cwd();

  // Step 1: Prisma schema
  const schemaPath = findPrismaSchema(cwd);

  if (schemaPath) {
    p.log.info(`Schema Prisma trouvé : ${schemaPath}`);

    const shouldSync = await p.confirm({
      message: "Synchroniser les modèles Siteping dans le schema Prisma ?",
    });

    if (p.isCancel(shouldSync)) {
      p.cancel("Annulé.");
      process.exit(0);
    }

    if (shouldSync) {
      try {
        const { addedModels, changes } = syncPrismaModels(schemaPath);

        if (addedModels.length > 0) {
          p.log.success(`Modèles créés : ${addedModels.join(", ")}`);
        }

        for (const change of changes) {
          if (change.action === "added") {
            p.log.success(`${change.model}.${change.field} — ajouté (${change.detail})`);
          } else {
            p.log.success(`${change.model}.${change.field} — mis à jour (${change.detail})`);
          }
        }

        if (addedModels.length === 0 && changes.length === 0) {
          p.log.info("Le schema est déjà à jour.");
        }
      } catch (error) {
        p.log.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    p.log.warn("Aucun fichier schema.prisma trouvé. Vous devrez ajouter les modèles manuellement.");
    p.log.info("Consultez la documentation : https://github.com/neosianexus/siteping#prisma-schema");
  }

  // Step 2: API route
  const shouldRoute = await p.confirm({
    message: "Générer la route API Next.js App Router ?",
  });

  if (p.isCancel(shouldRoute)) {
    p.cancel("Annulé.");
    process.exit(0);
  }

  if (shouldRoute) {
    try {
      const { created, path } = generateRoute(cwd);
      if (created) {
        p.log.success(`Route créée : ${path}`);
      } else {
        p.log.info(`La route existe déjà : ${path}`);
      }
    } catch (error) {
      p.log.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Step 3: Next steps
  p.note(
    [
      "1. Exécutez : npx prisma db push",
      "2. Ajoutez le widget dans votre layout :",
      "",
      '   import { initSiteping } from "@siteping/widget"',
      "",
      "   initSiteping({",
      '     endpoint: "/api/siteping",',
      '     projectName: "mon-projet",',
      "   })",
    ].join("\n"),
    "Prochaines étapes",
  );

  p.outro("Configuration terminée !");
}

function findPrismaSchema(cwd: string): string | null {
  const candidates = [
    join(cwd, "prisma", "schema.prisma"),
    join(cwd, "schema.prisma"),
    join(cwd, "prisma", "schema", "schema.prisma"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}
