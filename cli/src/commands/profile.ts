import { Command } from "commander";
import { buildContext } from "../context.js";
import { getConfigPath, saveConfig } from "../config.js";
import { color, log } from "../util/logger.js";
import { printTable } from "../util/table.js";

export function registerProfileCommands(program: Command): void {
  const profile = program
    .command("profile")
    .description("Manage named connections to Appsmith instances");

  profile
    .command("list")
    .alias("ls")
    .description("List configured profiles")
    .action((_opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      const rows = Object.entries(ctx.config.profiles).map(([name, p]) => ({
        name,
        url: p.url,
        email: p.email ?? "",
        active: name === ctx.config.currentProfile,
      }));
      if (ctx.json) return log.json(rows);
      printTable(rows, [
        { header: "", value: (r) => (r.active ? color.green("*") : " ") },
        { header: "NAME", value: (r) => r.name },
        { header: "URL", value: (r) => r.url },
        { header: "EMAIL", value: (r) => r.email },
      ]);
      log.info(color.dim(`\nConfig: ${getConfigPath()}`));
    });

  profile
    .command("use <name>")
    .description("Set the active profile")
    .action((name: string, _opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      if (!ctx.config.profiles[name]) {
        // Create a placeholder so `auth login` can populate it.
        ctx.config.profiles[name] = { url: "http://localhost:8080" };
        log.warn(`Profile ${color.cyan(name)} did not exist; created it.`);
      }
      ctx.config.currentProfile = name;
      saveConfig(ctx.config);
      log.success(`Active profile is now ${color.cyan(name)}.`);
    });

  profile
    .command("remove <name>")
    .alias("rm")
    .description("Delete a profile")
    .action((name: string, _opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      if (!ctx.config.profiles[name]) {
        log.warn(`No such profile: ${name}`);
        return;
      }
      delete ctx.config.profiles[name];
      if (ctx.config.currentProfile === name) {
        ctx.config.currentProfile = "default";
      }
      saveConfig(ctx.config);
      log.success(`Removed profile ${color.cyan(name)}.`);
    });
}
