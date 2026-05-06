import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";

const program = new Command()
  .name("siteping")
  .description("CLI to configure @siteping/* in your project")
  .version("0.4.4"); // x-release-please-version

program
  .command("init")
  .description("Set up the Prisma schema and API route in your project")
  .action(initCommand)
  .addHelpText("after", "\n  Examples:\n    $ siteping init");

program
  .command("sync")
  .description("Sync the Prisma schema (non-interactive, CI-friendly)")
  .option("--schema <path>", "Path to the schema.prisma file")
  .action(syncCommand)
  .addHelpText("after", "\n  Examples:\n    $ siteping sync\n    $ siteping sync --schema prisma/schema.prisma");

program
  .command("status")
  .description("Full diagnostic of the Siteping integration")
  .option("--schema <path>", "Path to the schema.prisma file")
  .action(statusCommand)
  .addHelpText("after", "\n  Examples:\n    $ siteping status\n    $ siteping status --schema prisma/schema.prisma");

program
  .command("doctor")
  .description("Test the connection to the Siteping API")
  .option("--url <url>", "Server URL (default: http://localhost:3000)")
  .option("--endpoint <path>", "Endpoint path (default: /api/siteping)")
  .action(doctorCommand)
  .addHelpText(
    "after",
    "\n  Examples:\n    $ siteping doctor\n    $ siteping doctor --url https://staging.example.com --endpoint /api/feedback",
  );

program.parse();
