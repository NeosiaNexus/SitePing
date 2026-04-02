import { Command } from "commander";
import { initCommand } from "./commands/init.js";

const program = new Command()
  .name("siteping")
  .description("CLI pour configurer @neosianexus/siteping")
  .version("0.1.0");

program
  .command("init")
  .description("Configure le schema Prisma et la route API dans votre projet")
  .action(initCommand);

program.parse();
