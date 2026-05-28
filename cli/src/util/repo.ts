import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { CliError } from "./logger.js";

/**
 * Walks up from a starting directory to find the Appsmith monorepo root,
 * identified by the presence of `app/client` and `app/server`. Used by the
 * `dev` commands so they work no matter where in the tree they are invoked.
 */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = start;
  for (let depth = 0; depth < 40; depth++) {
    if (
      existsSync(join(dir, "app", "client", "package.json")) &&
      existsSync(join(dir, "app", "server"))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new CliError(
    "Not inside an Appsmith repository (could not find app/client and app/server). " +
      "Run `dev` commands from within a checkout of the repo.",
  );
}

export function clientDir(): string {
  return join(findRepoRoot(), "app", "client");
}

export function serverDir(): string {
  return join(findRepoRoot(), "app", "server", "appsmith-server");
}
