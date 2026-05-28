import { Command } from "commander";
import { run } from "../util/exec.js";
import { clientDir, serverDir } from "../util/repo.js";
import { color } from "../util/logger.js";

/**
 * Convenience wrappers for common monorepo tasks. The client commands proxy to
 * the yarn scripts defined in app/client/package.json; the server command runs
 * the Spring Boot app via Maven. All commands forward any trailing arguments.
 */
export function registerDevCommands(program: Command): void {
  const dev = program
    .command("dev")
    .description("Developer tasks for working in the Appsmith monorepo");

  const yarn = (script: string, extra: string[]) =>
    run("yarn", [script, ...extra], { cwd: clientDir() });

  dev
    .command("setup")
    .description("Install client dependencies (yarn install)")
    .action(() => run("yarn", ["install"], { cwd: clientDir() }));

  dev
    .command("client")
    .description("Start the client dev server (yarn start)")
    .action(() => yarn("start", []));

  dev
    .command("build")
    .description("Build the client (yarn build)")
    .action(() => yarn("build", []));

  dev
    .command("test")
    .description("Run client unit tests (yarn test)")
    .allowUnknownOption()
    .argument("[args...]", "extra args forwarded to the test runner")
    .action((args: string[]) => yarn("test", args));

  dev
    .command("lint")
    .description("Lint the client (yarn lint)")
    .action(() => yarn("lint", []));

  dev
    .command("prettier")
    .description("Check formatting (yarn prettier)")
    .action(() => yarn("prettier", []));

  dev
    .command("typecheck")
    .description("Type-check the client (yarn check-types)")
    .action(() => yarn("check-types", []));

  dev
    .command("server")
    .description("Run the server via Maven (mvn spring-boot:run)")
    .allowUnknownOption()
    .argument("[args...]", "extra args forwarded to Maven")
    .action((args: string[]) =>
      run("mvn", ["spring-boot:run", ...args], { cwd: serverDir() }),
    );

  dev.addHelpText(
    "after",
    `\nExamples:\n` +
      `  appsmith dev setup\n` +
      `  appsmith dev client\n` +
      `  appsmith dev test ${color.dim("--watch")}\n`,
  );
}
