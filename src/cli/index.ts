import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";

const program = new Command()
  .name("siteping")
  .description("CLI pour configurer @neosianexus/siteping")
  .version("0.4.0"); // x-release-please-version

program.command("init").description("Configure le schema Prisma et la route API dans votre projet").action(initCommand);

program
  .command("sync")
  .description("Synchronise le schema Prisma (non-interactif, CI-friendly)")
  .option("--schema <path>", "Chemin vers le fichier schema.prisma")
  .action(syncCommand);

program
  .command("status")
  .description("Diagnostic complet de l'intégration Siteping")
  .option("--schema <path>", "Chemin vers le fichier schema.prisma")
  .action(statusCommand);

program
  .command("doctor")
  .description("Test de connexion à l'API Siteping")
  .option("--url <url>", "URL du serveur (défaut: http://localhost:3000)")
  .option("--endpoint <path>", "Chemin de l'endpoint (défaut: /api/siteping)")
  .action(doctorCommand);

program.parse();
