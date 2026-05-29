import { spawn } from "node:child_process";
import { CliError, color, log } from "./logger.js";

export interface RunOptions {
  cwd?: string;
  /** When false, suppresses the "› running ..." echo. Defaults to true. */
  echo?: boolean;
  /** Extra environment variables. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Runs a command, streaming its stdio to the terminal, and resolves when it
 * exits. Rejects with a CliError carrying the child's exit code so the CLI can
 * propagate it. Used for wrapping docker / yarn / mvn invocations.
 */
export function run(
  command: string,
  args: string[],
  opts: RunOptions = {},
): Promise<void> {
  if (opts.echo !== false) {
    log.step(color.dim(`${command} ${args.join(" ")}`));
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      stdio: "inherit",
      env: { ...process.env, ...opts.env },
    });
    child.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new CliError(`Command not found: ${command}`));
      } else {
        reject(new CliError(`${command} failed: ${err.message}`));
      }
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new CliError(`${command} exited with code ${code}`, code ?? 1));
    });
  });
}
