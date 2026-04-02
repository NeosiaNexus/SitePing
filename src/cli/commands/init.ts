import * as p from "@clack/prompts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { injectPrismaModels } from "../generators/prisma.js";
import { generateRoute } from "../generators/route.js";

export async function initCommand(): Promise<void> {
  p.intro("siteping — Configuration");

  const cwd = process.cwd();

  // Step 1: Prisma schema
  const schemaPath = findPrismaSchema(cwd);

  if (schemaPath) {
    p.log.info(`Schema Prisma trouvé : ${schemaPath}`);

    const shouldInject = await p.confirm({
      message: "Ajouter les modèles Siteping au schema Prisma ?",
    });

    if (p.isCancel(shouldInject)) {
      p.cancel("Annulé.");
      process.exit(0);
    }

    if (shouldInject) {
      try {
        const { added } = injectPrismaModels(schemaPath);
        if (added.length > 0) {
          p.log.success(`Modèles ajoutés : ${added.join(", ")}`);
        } else {
          p.log.info("Les modèles Siteping existent déjà dans le schema.");
        }
      } catch (error) {
        p.log.error(
          `Erreur lors de l'injection : ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } else {
    p.log.warn(
      "Aucun fichier schema.prisma trouvé. Vous devrez ajouter les modèles manuellement.",
    );
    p.log.info(
      "Consultez la documentation : https://github.com/neosianexus/siteping#prisma-schema",
    );
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
      p.log.error(
        `Erreur : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Step 3: Next steps
  p.note(
    [
      "1. Exécutez : npx prisma db push",
      "2. Ajoutez le widget dans votre layout :",
      "",
      '   import { initSiteping } from "@neosianexus/siteping"',
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
