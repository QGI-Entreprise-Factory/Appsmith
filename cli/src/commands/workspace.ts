import { Command } from "commander";
import { buildContext } from "../context.js";
import { requireAuth } from "../config.js";
import { log } from "../util/logger.js";
import { printTable } from "../util/table.js";

export function registerWorkspaceCommands(program: Command): void {
  const ws = program
    .command("workspace")
    .alias("ws")
    .description("Manage Appsmith workspaces");

  ws
    .command("list")
    .alias("ls")
    .description("List workspaces you have access to")
    .action(async (_opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      requireAuth(ctx.profile);
      const workspaces = await ctx.api.listWorkspaces();
      if (ctx.json) return log.json(workspaces);
      printTable(workspaces, [
        { header: "ID", value: (w) => w.id },
        { header: "NAME", value: (w) => w.name },
      ]);
    });

  ws
    .command("create <name>")
    .description("Create a new workspace")
    .action(async (name: string, _opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      requireAuth(ctx.profile);
      const created = await ctx.api.createWorkspace(name);
      if (ctx.json) return log.json(created);
      log.success(`Created workspace "${created.name}" (${created.id}).`);
    });
}
