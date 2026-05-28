#!/usr/bin/env node
import { Command } from "commander";
import { CliError, log, setColorEnabled } from "./util/logger.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerProfileCommands } from "./commands/profile.js";
import { registerWorkspaceCommands } from "./commands/workspace.js";
import { registerAppCommands } from "./commands/app.js";
import { registerInstanceCommands } from "./commands/instance.js";
import { registerDevCommands } from "./commands/dev.js";
import { registerScaffoldCommands } from "./commands/scaffold.js";

const program = new Command();

program
  .name("appsmith")
  .description(
    "Command line interface for Appsmith.\n\n" +
      "Manage applications & workspaces over the REST API, operate a\n" +
      "self-hosted Docker instance, scaffold apps, and run monorepo dev tasks.",
  )
  .version("0.1.0", "-V, --version")
  .option("--profile <name>", "use a specific config profile")
  .option("--json", "output machine-readable JSON where supported")
  .option("--no-color", "disable coloured output")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts<{ color?: boolean }>();
    if (opts.color === false) setColorEnabled(false);
  });

registerAuthCommands(program);
registerProfileCommands(program);
registerWorkspaceCommands(program);
registerAppCommands(program);
registerInstanceCommands(program);
registerDevCommands(program);
registerScaffoldCommands(program);

program.addHelpText(
  "after",
  `\nEnvironment variables:\n` +
    `  APPSMITH_URL       override the active profile's instance URL\n` +
    `  APPSMITH_COOKIE    provide a session cookie (e.g. for CI)\n` +
    `  APPSMITH_PROFILE   select the active profile\n` +
    `  APPSMITH_CLI_HOME  config directory (default: ~/.appsmith)\n` +
    `  NO_COLOR           disable coloured output\n` +
    `\nGetting started:\n` +
    `  appsmith auth login --url https://my.appsmith.example\n` +
    `  appsmith workspace list\n` +
    `  appsmith app list\n`,
);

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof CliError) {
      log.error(err.message);
      process.exit(err.exitCode);
    }
    log.error((err as Error).message ?? String(err));
    process.exit(1);
  }
}

void main();
