#!/bin/zsh
set -euo pipefail

REPO_ROOT="/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet"
EDITOR_DIR="$REPO_ROOT/packages/editor"
PORT="${HOMEBREW_FORGE_PORT:-5177}"
URL="http://127.0.0.1:${PORT}/"
PROJECT_URL="${URL}api/project?set=DEMO"
APP_SUPPORT="$HOME/Library/Application Support/Homebrew Forge"
LOG_DIR="$HOME/Library/Logs/Homebrew Forge"
PID_FILE="$APP_SUPPORT/editor-server.pid"
LOG_FILE="$LOG_DIR/editor-launcher.log"

mkdir -p "$APP_SUPPORT" "$LOG_DIR"
touch "$LOG_FILE"

timestamp() {
  /bin/date "+%Y-%m-%d %H:%M:%S"
}

log() {
  print -r -- "[$(timestamp)] $*" >> "$LOG_FILE"
}

alert() {
  local message="$1"
  /usr/bin/osascript -e "display dialog \"$message\" buttons {\"OK\"} default button \"OK\" with title \"Homebrew Forge\"" >/dev/null 2>&1 || true
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

server_ready() {
  /usr/bin/curl -fsS --max-time 3 "$PROJECT_URL" 2>/dev/null | /usr/bin/grep -q '"setCode":"DEMO"'
}

port_owner() {
  /usr/sbin/lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | /usr/bin/awk 'NR == 2 {print $1 " " $2 " " substr($0, index($0,$9))}'
}

wait_for_server() {
  local attempt
  for attempt in {1..45}; do
    if server_ready; then
      return 0
    fi
    /bin/sleep 1
  done
  return 1
}

start_server() {
  local node_bin="$1"

  if [[ ! -d "$EDITOR_DIR" ]]; then
    log "Missing editor directory: $EDITOR_DIR"
    alert "Homebrew Forge could not find the editor folder. See the launcher log:\n$LOG_FILE"
    exit 1
  fi

  if [[ ! -f "$EDITOR_DIR/node_modules/vite/bin/vite.js" ]]; then
    log "Missing Vite dependency under $EDITOR_DIR/node_modules"
    alert "Homebrew Forge dependencies are missing. Run the repo install once, then relaunch. Log:\n$LOG_FILE"
    exit 1
  fi

  if [[ -f "$PID_FILE" ]]; then
    local old_pid
    old_pid="$(<"$PID_FILE")"
    if [[ -n "$old_pid" ]] && /bin/kill -0 "$old_pid" 2>/dev/null; then
      log "PID file points to running process $old_pid; waiting for readiness"
      if wait_for_server; then
        return 0
      fi
      log "Existing process $old_pid did not become ready"
    fi
  fi

  if [[ -n "$(port_owner)" ]] && ! server_ready; then
    log "Port $PORT is occupied by: $(port_owner)"
    alert "Homebrew Forge could not start because port $PORT is already in use. See:\n$LOG_FILE"
    exit 1
  fi

  log "Starting Homebrew Forge editor on $URL with $node_bin"
  (
    cd "$EDITOR_DIR"
    exec /usr/bin/nohup "$node_bin" "node_modules/vite/bin/vite.js" --host 127.0.0.1 --port "$PORT" --strictPort
  ) >> "$LOG_FILE" 2>&1 &
  print -r -- "$!" > "$PID_FILE"

  if ! wait_for_server; then
    log "Editor did not become ready at $PROJECT_URL"
    alert "Homebrew Forge started but did not become ready. See:\n$LOG_FILE"
    exit 1
  fi
}

open_chrome_app_window() {
  if [[ "${HOMEBREW_FORGE_OPEN_CHROME:-1}" == "0" ]]; then
    log "Chrome launch skipped by HOMEBREW_FORGE_OPEN_CHROME=0"
    return 0
  fi

  local chrome_bin=""
  if [[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
    chrome_bin="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  elif [[ -x "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
    chrome_bin="$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  fi

  if [[ -n "$chrome_bin" ]]; then
    log "Opening Chrome app window at $URL"
    "$chrome_bin" --app="$URL" >/dev/null 2>&1 &
    return 0
  fi

  log "Google Chrome not found; opening default browser at $URL"
  /usr/bin/open "$URL"
}

main() {
  local node_bin
  if ! node_bin="$(find_node)"; then
    log "No usable Node.js executable found"
    alert "Homebrew Forge could not find Node.js. See:\n$LOG_FILE"
    exit 1
  fi

  if ! server_ready; then
    start_server "$node_bin"
  else
    log "Homebrew Forge editor already ready at $URL"
  fi

  open_chrome_app_window
}

main "$@"
