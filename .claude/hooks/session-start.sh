#!/bin/bash
# SessionStart hook: prepare the Appsmith CLI subproject (cli/) so its
# typecheck, build and tests run immediately in a web session.
set -euo pipefail

# Only run in Claude Code on the web; local environments manage their own setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

CLI_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}/cli"

if [ -f "$CLI_DIR/package.json" ]; then
  # npm install (not ci) so the cached container layer is reused across sessions.
  npm install --prefix "$CLI_DIR"
fi
