import { homedir } from "node:os";
import { join } from "node:path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { CliError } from "./util/logger.js";

/** A single named connection to an Appsmith instance. */
export interface Profile {
  /** Base URL of the instance, e.g. http://localhost:8080 */
  url: string;
  /** Session cookie captured at login (e.g. "SESSION=abcd"). */
  cookie?: string;
  /** Email of the logged-in user, kept for display in `whoami`. */
  email?: string;
}

export interface Config {
  currentProfile: string;
  profiles: Record<string, Profile>;
}

const CONFIG_DIR =
  process.env.APPSMITH_CLI_HOME ?? join(homedir(), ".appsmith");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: Config = {
  currentProfile: "default",
  profiles: {},
};

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return structuredClone(DEFAULT_CONFIG);
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      currentProfile: parsed.currentProfile ?? "default",
      profiles: parsed.profiles ?? {},
    };
  } catch (err) {
    throw new CliError(
      `Could not read config at ${CONFIG_PATH}: ${(err as Error).message}`,
    );
  }
}

export function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
  // The file can contain session cookies, so keep it private to the user.
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    /* best effort on platforms without POSIX permissions */
  }
}

/**
 * Resolves the active profile. The `--profile` flag and APPSMITH_PROFILE env
 * var override the persisted `currentProfile`. Environment overrides for URL
 * and cookie let the CLI run unauthenticated/scripted in CI.
 */
export function resolveProfile(
  config: Config,
  override?: string,
): { name: string; profile: Profile } {
  const name = override ?? process.env.APPSMITH_PROFILE ?? config.currentProfile;

  const envUrl = process.env.APPSMITH_URL;
  const envCookie = process.env.APPSMITH_COOKIE;

  const stored = config.profiles[name];
  const profile: Profile = {
    url: envUrl ?? stored?.url ?? "http://localhost:8080",
    cookie: envCookie ?? stored?.cookie,
    email: stored?.email,
  };

  return { name, profile };
}

export function requireAuth(profile: Profile): string {
  if (!profile.cookie) {
    throw new CliError(
      "Not logged in. Run `appsmith auth login --url <instance>` first " +
        "(or set APPSMITH_COOKIE).",
    );
  }
  return profile.cookie;
}
