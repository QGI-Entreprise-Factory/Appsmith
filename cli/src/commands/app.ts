import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { buildContext } from "../context.js";
import { requireAuth } from "../config.js";
import { CliError, color, log } from "../util/logger.js";
import { printTable } from "../util/table.js";

export function registerAppCommands(program: Command): void {
  const app = program
    .command("app")
    .description("Manage Appsmith applications");

  app
    .command("list")
    .alias("ls")
    .description("List applications, optionally filtered by workspace")
    .option("-w, --workspace <id>", "filter by workspace id")
    .action(async (opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      requireAuth(ctx.profile);
      const apps = await ctx.api.listApplications(opts.workspace);
      if (ctx.json) return log.json(apps);
      printTable(apps, [
        { header: "ID", value: (a) => a.id },
        { header: "NAME", value: (a) => a.name },
        { header: "WORKSPACE", value: (a) => a.workspaceId },
        { header: "MODIFIED", value: (a) => a.modifiedAt ?? "" },
      ]);
    });

  app
    .command("create <name>")
    .description("Create a new application in a workspace")
    .requiredOption("-w, --workspace <id>", "target workspace id")
    .action(async (name: string, opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      requireAuth(ctx.profile);
      const created = await ctx.api.createApplication(name, opts.workspace);
      if (ctx.json) return log.json(created);
      log.success(`Created application "${created.name}" (${created.id}).`);
    });

  app
    .command("delete <id>")
    .alias("rm")
    .description("Delete an application by id")
    .option("-y, --yes", "skip confirmation")
    .action(async (id: string, opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      requireAuth(ctx.profile);
      if (!opts.yes) {
        throw new CliError(
          `Refusing to delete ${id} without confirmation. Re-run with --yes.`,
        );
      }
      await ctx.api.deleteApplication(id);
      log.success(`Deleted application ${id}.`);
    });

  app
    .command("export <id>")
    .description("Export an application to a JSON file")
    .option(
      "-o, --output <file>",
      "output file (default: <appName>.json, '-' for stdout)",
    )
    .action(async (id: string, opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      requireAuth(ctx.profile);
      const exported = (await ctx.api.exportApplication(id)) as Record<
        string,
        unknown
      >;
      const serialized = JSON.stringify(exported, null, 2);

      if (opts.output === "-") {
        process.stdout.write(serialized + "\n");
        return;
      }
      const appName =
        (exported?.exportedApplication as { name?: string })?.name ?? id;
      const out =
        opts.output ?? `${String(appName).replace(/[^\w.-]+/g, "_")}.json`;
      await writeFile(out, serialized, "utf8");
      log.success(`Exported application ${id} to ${color.bold(out)}.`);
    });

  app
    .command("import <file>")
    .description("Import an application JSON file into a workspace")
    .requiredOption("-w, --workspace <id>", "target workspace id")
    .action(async (file: string, opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      requireAuth(ctx.profile);
      let contents: Buffer;
      try {
        contents = await readFile(file);
      } catch {
        throw new CliError(`Cannot read file: ${file}`);
      }
      const imported = await ctx.api.importApplication(
        opts.workspace,
        basename(file),
        contents,
      );
      if (ctx.json) return log.json(imported);
      log.success(
        `Imported "${imported.name ?? "application"}" (${imported.id ?? "?"}) ` +
          `into workspace ${opts.workspace}.`,
      );
    });
}
