import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { buildContext } from "../context.js";
import { requireAuth } from "../config.js";
import { buildApplicationJson } from "../scaffold/template.js";
import { CliError, color, log } from "../util/logger.js";

export function registerScaffoldCommands(program: Command): void {
  const scaffold = program
    .command("scaffold")
    .description("Generate Appsmith application JSON locally");

  scaffold
    .command("app <name>")
    .description("Create an import-ready application JSON skeleton")
    .option(
      "-p, --pages <names>",
      "comma-separated page names (default: Page1)",
    )
    .option("--with-sample", "add a heading widget to the first page")
    .option(
      "-o, --output <file>",
      "output file (default: <name>.json, '-' for stdout)",
    )
    .option(
      "--push",
      "import the generated app directly into a workspace via the API",
    )
    .option("-w, --workspace <id>", "workspace id (required with --push)")
    .action(async (name: string, opts, cmd: Command) => {
      const pages = opts.pages
        ? String(opts.pages)
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean)
        : undefined;

      const appJson = buildApplicationJson({
        name,
        pages,
        withSample: Boolean(opts.withSample),
      });
      const serialized = JSON.stringify(appJson, null, 2);

      if (opts.push) {
        const ctx = buildContext(cmd);
        requireAuth(ctx.profile);
        if (!opts.workspace) {
          throw new CliError("--push requires --workspace <id>.");
        }
        const fileName = `${name.replace(/[^\w.-]+/g, "_")}.json`;
        const imported = await ctx.api.importApplication(
          opts.workspace,
          fileName,
          Buffer.from(serialized, "utf8"),
        );
        if (ctx.json) return log.json(imported);
        log.success(
          `Scaffolded and imported "${imported.name ?? name}" ` +
            `(${imported.id ?? "?"}) into workspace ${opts.workspace}.`,
        );
        return;
      }

      if (opts.output === "-") {
        process.stdout.write(serialized + "\n");
        return;
      }
      const out = opts.output ?? `${name.replace(/[^\w.-]+/g, "_")}.json`;
      await writeFile(out, serialized, "utf8");
      log.success(`Wrote application skeleton to ${color.bold(out)}.`);
      log.info(
        color.dim(
          `Import it with: appsmith app import ${basename(out)} --workspace <id>`,
        ),
      );
    });
}
