# Appsmith CLI

A command line interface for [Appsmith](https://www.appsmith.com). It covers
four areas:

| Area | Commands | What it does |
| --- | --- | --- |
| **REST API** | `auth`, `workspace`, `app` | Authenticate to an instance and manage workspaces & applications (list / create / delete / export / import). |
| **Self-hosted ops** | `instance` | Wrap the Docker deployment: start/stop/status/logs/upgrade and `appsmithctl` backup/restore. |
| **Scaffolding** | `scaffold` | Generate import-ready application JSON locally (or push it straight into a workspace). |
| **Dev tooling** | `dev` | Run common monorepo tasks (client dev server, tests, lint, server). |

## Install

```bash
cd cli
npm install      # installs deps and builds dist/
npm link         # optional: exposes the `appsmith` command globally
```

Requires Node.js >= 18. During development you can run it without building via
`npm run dev -- <args>` (uses `tsx`).

## Quick start

```bash
# Point at an instance and log in (password is prompted if omitted)
appsmith auth login --url https://my.appsmith.example --email you@co.com

# Who am I, and is the instance healthy?
appsmith auth whoami
appsmith auth status

# Browse
appsmith workspace list
appsmith app list
appsmith app list --workspace <workspaceId> --json

# Move an app between instances / environments
appsmith app export <appId> -o crm.json
appsmith --profile prod app import crm.json --workspace <workspaceId>
```

## Profiles

Connections are stored as named **profiles** in `~/.appsmith/config.json`
(file permissions `0600`, since it holds the session cookie). Switch between
instances without re-authenticating each time:

```bash
appsmith profile use prod
appsmith auth login --url https://prod.example   # stored under "prod"
appsmith profile list
appsmith --profile staging app list              # one-off override
```

Environment overrides (handy for CI):

| Variable | Effect |
| --- | --- |
| `APPSMITH_URL` | Override the active profile's instance URL |
| `APPSMITH_COOKIE` | Provide a `SESSION=...` cookie instead of logging in |
| `APPSMITH_PROFILE` | Select the active profile |
| `APPSMITH_CLI_HOME` | Config directory (default `~/.appsmith`) |
| `NO_COLOR` | Disable coloured output |

## Command reference

### `auth`
- `login [--url] [--email] [--password]` — form-login and store a session.
- `logout` — clear the stored session.
- `whoami` — show the authenticated user.
- `status [--url]` — check reachability and login state.

### `workspace` (alias `ws`)
- `list` — list workspaces (`GET /api/v1/workspaces/home`).
- `create <name>` — create a workspace.

### `app`
- `list [--workspace <id>]` — list applications.
- `create <name> --workspace <id>` — create an application.
- `delete <id> --yes` — delete an application (confirmation required).
- `export <id> [-o <file>]` — export to JSON (`-o -` for stdout).
- `import <file> --workspace <id>` — import an exported JSON file.

### `instance` (Docker-based self-hosted)
Run from a directory containing your `docker-compose.yml` (use `-f` to point
elsewhere, `-c` to name the container — defaults to `appsmith`).
- `start` / `stop` / `restart` / `down` / `status` / `logs`
- `upgrade` — `docker compose pull` then `up -d`.
- `backup [--encrypt]` / `restore [archive]` — wrap `appsmithctl`.
- `shell` — open a shell inside the container.

### `scaffold`
- `scaffold app <name> [--pages a,b] [--with-sample] [-o <file>]` — write an
  import-ready application skeleton.
- add `--push --workspace <id>` to import it directly via the API.

### `dev` (run inside a repo checkout)
- `setup` — `yarn install` in `app/client`.
- `client` / `build` / `lint` / `prettier` / `typecheck` / `test`
- `server` — `mvn spring-boot:run` in `app/server/appsmith-server`.

## Output & scripting

Most read commands accept `--json` for machine-readable output, and every
command exits non-zero on failure, so the CLI composes well in scripts and CI:

```bash
appsmith app list --json | jq -r '.[].id'
```

## Development

```bash
npm run typecheck
npm test          # node:test unit tests
npm run build
```
