import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { buildContext } from "../context.js";
import { saveConfig } from "../config.js";
import { CliError, color, log } from "../util/logger.js";

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (!hidden) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }
  // Mask password input by muting the output stream while typing.
  const internal = rl as unknown as {
    output: NodeJS.WriteStream & { muted?: boolean };
    _writeToOutput: (s: string) => void;
  };
  const output = internal.output;
  const write = output.write.bind(output);
  internal._writeToOutput = (str: string) => {
    if (!output.muted) write(str);
  };
  process.stdout.write(question);
  output.muted = true;
  const answer = await rl.question("");
  output.muted = false;
  rl.close();
  process.stdout.write("\n");
  return answer.trim();
}

export function registerAuthCommands(program: Command): void {
  const auth = program
    .command("auth")
    .description("Authenticate against an Appsmith instance");

  auth
    .command("login")
    .description("Log in and store a session for the active profile")
    .option("-u, --url <url>", "instance base URL, e.g. http://localhost:8080")
    .option("-e, --email <email>", "account email")
    .option("-p, --password <password>", "account password (prompted if omitted)")
    .action(async (opts, cmd: Command) => {
      const ctx = buildContext(cmd);

      const url = opts.url ?? ctx.profile.url;
      const email = opts.email ?? (await prompt("Email: "));
      const password = opts.password ?? (await prompt("Password: ", true));
      if (!email || !password) {
        throw new CliError("Email and password are required.");
      }

      // Re-bind the client to the chosen URL before authenticating.
      const profile = { ...ctx.profile, url };
      const { ApiClient } = await import("../api/client.js");
      const api = new ApiClient(profile);

      log.step(`Logging in to ${url} as ${email} ...`);
      const cookie = await api.login(email, password);

      ctx.config.profiles[ctx.profileName] = { url, cookie, email };
      ctx.config.currentProfile = ctx.profileName;
      saveConfig(ctx.config);
      log.success(
        `Logged in as ${color.bold(email)} (profile ${color.cyan(ctx.profileName)}).`,
      );
    });

  auth
    .command("logout")
    .description("Clear the stored session for the active profile")
    .action(async (_opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      if (ctx.profile.cookie) await ctx.api.logout();
      const stored = ctx.config.profiles[ctx.profileName];
      if (stored) {
        delete stored.cookie;
        delete stored.email;
        saveConfig(ctx.config);
      }
      log.success(`Logged out of profile ${color.cyan(ctx.profileName)}.`);
    });

  auth
    .command("whoami")
    .description("Show the currently authenticated user")
    .action(async (_opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      const me = await ctx.api.me();
      if (ctx.json) return log.json(me);
      if (!me.email || me.email === "anonymousUser") {
        throw new CliError("Not authenticated on this instance.");
      }
      log.info(`${color.bold("User:")}      ${me.name ?? me.email}`);
      log.info(`${color.bold("Email:")}     ${me.email}`);
      log.info(`${color.bold("Instance:")}  ${ctx.profile.url}`);
      log.info(`${color.bold("Profile:")}   ${ctx.profileName}`);
    });

  auth
    .command("status")
    .description("Check instance reachability and login state")
    .option("-u, --url <url>", "probe a specific instance URL")
    .action(async (opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      // Allow probing an arbitrary instance before a profile is configured.
      if (opts.url) ctx.profile.url = opts.url;
      const { ApiClient } = await import("../api/client.js");
      const api = new ApiClient(ctx.profile);
      const result: Record<string, unknown> = {
        profile: ctx.profileName,
        url: ctx.profile.url,
      };
      try {
        await api.health();
        result.reachable = true;
      } catch {
        result.reachable = false;
      }
      result.loggedIn = Boolean(ctx.profile.cookie);
      result.email = ctx.profile.email ?? null;

      if (ctx.json) return log.json(result);
      log.info(`${color.bold("Profile:")}   ${result.profile}`);
      log.info(`${color.bold("Instance:")}  ${result.url}`);
      log.info(
        `${color.bold("Reachable:")} ${
          result.reachable ? color.green("yes") : color.red("no")
        }`,
      );
      log.info(
        `${color.bold("Logged in:")} ${
          result.loggedIn ? color.green("yes") : color.yellow("no")
        }${result.email ? color.dim(` (${result.email})`) : ""}`,
      );
    });
}
