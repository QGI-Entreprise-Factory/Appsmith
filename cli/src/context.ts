import { Command } from "commander";
import { ApiClient } from "./api/client.js";
import { loadConfig, resolveProfile, type Config, type Profile } from "./config.js";

export interface GlobalOptions {
  profile?: string;
  json?: boolean;
  color?: boolean;
}

export interface Context {
  config: Config;
  profileName: string;
  profile: Profile;
  api: ApiClient;
  json: boolean;
}

/** Builds the runtime context from the persisted config + global flags. */
export function buildContext(cmd: Command): Context {
  // Global options live on the root program regardless of nesting depth.
  const opts = cmd.optsWithGlobals() as GlobalOptions;
  const config = loadConfig();
  const { name, profile } = resolveProfile(config, opts.profile);
  return {
    config,
    profileName: name,
    profile,
    api: new ApiClient(profile),
    json: opts.json === true,
  };
}
