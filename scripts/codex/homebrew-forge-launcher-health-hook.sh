#!/bin/zsh
set -euo pipefail

SCRIPT_PATH="${0:A}"
SCRIPT_DIR="${SCRIPT_PATH:h}"
REPO_ROOT="${SCRIPT_DIR:h:h}"
APP_PATH="/Applications/Homebrew Forge.app"
APP_SUPPORT="$HOME/Library/Application Support/Homebrew Forge"
LOG_DIR="$HOME/Library/Logs/Homebrew Forge"
LOG_FILE="$LOG_DIR/codex-stop-hook.log"
SUPPORT_LAUNCHER="$APP_SUPPORT/launch-homebrew-forge-app.sh"
REPO_LAUNCHER="$REPO_ROOT/scripts/launch-homebrew-forge-app.sh"
INSTALLER="$REPO_ROOT/scripts/install-homebrew-forge-app-shortcut.sh"
PORT="${HOMEBREW_FORGE_PORT:-5177}"
URL="http://127.0.0.1:${PORT}/"
HEALTH_URL="${URL}api/health"
HEALTH_HELPER="$REPO_ROOT/packages/editor/src/server/runtimeHealth.mjs"
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_PROFILE="$APP_SUPPORT/chrome-app-profile"

mkdir -p "$LOG_DIR" "$APP_SUPPORT"
touch "$LOG_FILE"

log() {
  print -r -- "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

needs_reinstall() {
  [[ ! -d "$APP_PATH" ]] && return 0
  [[ ! -x "$APP_PATH/Contents/MacOS/HomebrewForgeLauncher" ]] && return 0
  [[ ! -x "$SUPPORT_LAUNCHER" ]] && return 0
  ! /usr/bin/cmp -s "$REPO_LAUNCHER" "$SUPPORT_LAUNCHER"
}

find_node() {
  local candidate
  for candidate in \
    "${HOMEBREW_FORGE_NODE:-}" \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node" \
    "/Applications/Codex.app/Contents/Resources/node" \
    "/usr/bin/node"
  do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      print -r -- "$candidate"
      return 0
    fi
  done
  return 1
}

server_status() {
  local node_bin="$1"
  "$node_bin" "$HEALTH_HELPER" check-server "$HEALTH_URL" "$REPO_ROOT" "$PORT" 2>/dev/null || true
}

chrome_app_main_pids() {
  if [[ ! -x "$CHROME_BIN" ]]; then
    return 0
  fi
  /bin/ps -axo pid=,comm=,args= | /usr/bin/awk -v chrome="$CHROME_BIN" -v profile="--user-data-dir=$CHROME_PROFILE" -v app="--app=$URL" '
    $2 == "awk" || $2 == "/usr/bin/awk" || $2 == "ps" || $2 == "/bin/ps" || $2 == "zsh" || $2 == "/bin/zsh" || $2 == "sh" || $2 == "/bin/sh" { next }
    index($0, chrome) > 0 && index($0, profile) > 0 && index($0, app) > 0 { print $1 }
  '
}

chrome_app_main_count() {
  chrome_app_main_pids | /usr/bin/wc -l | /usr/bin/tr -d ' '
}

log "Codex Stop hook invoked for Homebrew Forge"

if needs_reinstall; then
  log "Shortcut/support launcher is missing or stale; reinstalling"
  /bin/zsh "$INSTALLER" >> "$LOG_FILE" 2>&1
fi

if node_bin="$(find_node)"; then
  current_status="$(server_status "$node_bin")"
  current_chrome_count="$(chrome_app_main_count)"
  if [[ "$current_status" == "fresh" && "$current_chrome_count" == "1" ]]; then
    log "Fast-path pass: server fresh and one Chrome app process is running"
    log "Codex Stop hook completed"
    exit 0
  fi
  log "Fast-path miss: health=${current_status:-unreachable}, chrome_main_processes=${current_chrome_count:-0}"
else
  log "Fast-path skipped: Node.js not found"
fi

log "Running launcher health check/open path"
HOMEBREW_FORGE_LAUNCH_CONTEXT="codex-stop-hook" /bin/zsh "$SUPPORT_LAUNCHER" >> "$LOG_FILE" 2>&1
log "Codex Stop hook completed"
