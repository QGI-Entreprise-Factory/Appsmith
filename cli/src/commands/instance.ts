import { Command } from "commander";
import { run } from "../util/exec.js";
import { color, log } from "../util/logger.js";

/**
 * Wraps the Docker-based self-hosted Appsmith deployment. These commands shell
 * out to `docker compose` and the in-container `appsmithctl` utility (the same
 * tooling documented for self-hosted backup/restore), so the host only needs
 * Docker installed.
 */
export function registerInstanceCommands(program: Command): void {
  const instance = program
    .command("instance")
    .description("Operate a self-hosted (Docker) Appsmith instance");

  // Shared options for locating the deployment.
  const withDocker = (c: Command): Command =>
    c
      .option(
        "-f, --file <path>",
        "docker compose file",
        "docker-compose.yml",
      )
      .option(
        "-c, --container <name>",
        "Appsmith container name",
        "appsmith",
      );

  const compose = (file: string, args: string[]) =>
    run("docker", ["compose", "-f", file, ...args]);

  withDocker(instance.command("start"))
    .description("Start the instance (docker compose up -d)")
    .action((opts) => compose(opts.file, ["up", "-d"]));

  withDocker(instance.command("stop"))
    .description("Stop the instance (docker compose stop)")
    .action((opts) => compose(opts.file, ["stop"]));

  withDocker(instance.command("restart"))
    .description("Restart the instance")
    .action((opts) => compose(opts.file, ["restart"]));

  withDocker(instance.command("down"))
    .description("Stop and remove containers (docker compose down)")
    .action((opts) => compose(opts.file, ["down"]));

  withDocker(instance.command("status"))
    .alias("ps")
    .description("Show container status")
    .action((opts) => compose(opts.file, ["ps"]));

  withDocker(instance.command("logs"))
    .description("Tail instance logs")
    .option("-n, --tail <lines>", "number of lines to show", "100")
    .option("--no-follow", "do not follow log output")
    .action((opts) => {
      const args = ["logs", "--tail", String(opts.tail)];
      if (opts.follow !== false) args.push("-f");
      return compose(opts.file, args);
    });

  withDocker(instance.command("upgrade"))
    .description("Pull the latest image and recreate the instance")
    .action(async (opts) => {
      await compose(opts.file, ["pull"]);
      await compose(opts.file, ["up", "-d"]);
      log.success("Instance upgraded to the latest pulled image.");
    });

  withDocker(instance.command("backup"))
    .description("Create a backup archive (appsmithctl backup)")
    .option("--encrypt", "encrypt the backup archive")
    .action((opts) => {
      const args = ["exec", opts.container, "appsmithctl", "backup"];
      if (opts.encrypt) args.push("--encrypt");
      return run("docker", args);
    });

  withDocker(instance.command("restore"))
    .description("Restore from a backup archive (appsmithctl restore)")
    .argument("[archive]", "path to a backup archive inside the container")
    .action((archive: string | undefined, opts) => {
      const args = ["exec", opts.container, "appsmithctl", "restore"];
      if (archive) args.push(archive);
      return run("docker", args);
    });

  withDocker(instance.command("shell"))
    .alias("exec")
    .description("Open an interactive shell inside the container")
    .action((opts) =>
      run("docker", ["exec", "-it", opts.container, "bash"]).catch(() => {
        log.warn("bash unavailable, falling back to sh");
        return run("docker", ["exec", "-it", opts.container, "sh"]);
      }),
    );

  instance.addHelpText(
    "after",
    `\nExamples:\n` +
      `  ${color.dim("# from a directory containing your docker-compose.yml")}\n` +
      `  appsmith instance start\n` +
      `  appsmith instance logs --tail 200\n` +
      `  appsmith instance backup --encrypt\n`,
  );
}
