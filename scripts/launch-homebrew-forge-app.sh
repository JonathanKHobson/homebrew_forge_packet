#!/bin/zsh
set -euo pipefail

REPO_ROOT="/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet"
EDITOR_DIR="$REPO_ROOT/packages/editor"
PORT="${HOMEBREW_FORGE_PORT:-5177}"
URL="http://127.0.0.1:${PORT}/"
HEALTH_URL="${URL}api/health"
APP_SUPPORT="$HOME/Library/Application Support/Homebrew Forge"
LOG_DIR="$HOME/Library/Logs/Homebrew Forge"
LOG_FILE="$LOG_DIR/editor-launcher.log"
LOCK_DIR="$APP_SUPPORT/launcher.lock"
CHROME_PROFILE="$APP_SUPPORT/chrome-app-profile"
LOCK_STALE_SECONDS=120
HEALTH_HELPER="$REPO_ROOT/packages/editor/src/server/runtimeHealth.mjs"
PNPM_CLI="$REPO_ROOT/.tools/pnpm/bin/pnpm.cjs"
AGENT_LABEL="local.homebrew-forge.editor"
AGENT_PLIST="$HOME/Library/LaunchAgents/${AGENT_LABEL}.plist"
LAUNCHCTL_TARGET="gui/$(/usr/bin/id -u)"

mkdir -p "$APP_SUPPORT" "$LOG_DIR"
touch "$LOG_FILE"

timestamp() {
  /bin/date "+%Y-%m-%d %H:%M:%S"
}

log() {
  print -r -- "[$(timestamp)] $*" >> "$LOG_FILE"
}

lock_age_seconds() {
  local modified now
  modified="$(/usr/bin/stat -f %m "$LOCK_DIR" 2>/dev/null || print -r -- "0")"
  now="$(/bin/date +%s)"
  print -r -- "$((now - modified))"
}

lock_owner_pid() {
  /bin/cat "$LOCK_DIR/pid" 2>/dev/null || true
}

lock_owner_alive() {
  local pid="$1"
  [[ "$pid" =~ '^[0-9]+$' ]] && /bin/kill -0 "$pid" 2>/dev/null
}

clear_stale_launcher_lock() {
  local owner="$1"
  local age="$2"
  if lock_owner_alive "$owner"; then
    log "Terminating stale launcher lock owner pid=$owner age=${age}s"
    /bin/kill -TERM "$owner" 2>/dev/null || true
    /bin/sleep 2
    if /bin/kill -0 "$owner" 2>/dev/null; then
      /bin/kill -KILL "$owner" 2>/dev/null || true
    fi
  else
    log "Removing stale launcher lock with dead owner pid=${owner:-unknown} age=${age}s"
  fi
  /bin/rm -rf "$LOCK_DIR"
}

release_launcher_lock() {
  if [[ -f "$LOCK_DIR/pid" && "$(/bin/cat "$LOCK_DIR/pid" 2>/dev/null || true)" == "$$" ]]; then
    /bin/rm -rf "$LOCK_DIR"
    log "Released launcher lock"
  fi
}

acquire_launcher_lock() {
  local attempt age owner
  for attempt in {1..45}; do
    if /bin/mkdir "$LOCK_DIR" 2>/dev/null; then
      print -r -- "$$" > "$LOCK_DIR/pid"
      log "Acquired launcher lock pid=$$ context=${HOMEBREW_FORGE_LAUNCH_CONTEXT:-manual}"
      return 0
    fi

    age="$(lock_age_seconds)"
    owner="$(lock_owner_pid)"
    if (( age > LOCK_STALE_SECONDS )); then
      clear_stale_launcher_lock "$owner" "$age"
      continue
    fi

    /bin/sleep 1
  done

  owner="$(lock_owner_pid)"
  log "Launcher lock is held by pid=${owner:-unknown}; exiting to avoid concurrent restart"
  exit 0
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
  [[ "$(server_status "$1")" == "fresh" ]]
}

port_open() {
  /usr/bin/nc -G 1 -z 127.0.0.1 "$PORT" >/dev/null 2>&1
}

port_owner() {
  if port_open; then
    print -r -- "tcp listener on 127.0.0.1:${PORT}"
  fi
}

port_owner_pid() {
  return 1
}

port_owner_command() {
  return 1
}

legacy_homebrew_server() {
  return 1
}

server_status() {
  local node_bin="$1"
  if [[ ! -f "$HEALTH_HELPER" ]]; then
    print -r -- "foreign"
    return 0
  fi
  "$node_bin" "$HEALTH_HELPER" check-server "$HEALTH_URL" "$REPO_ROOT" "$PORT" 2>/dev/null || true
}

server_pid_from_health() {
  local node_bin="$1"
  "$node_bin" "$HEALTH_HELPER" server-pid "$HEALTH_URL" "$REPO_ROOT" "$PORT" 2>/dev/null || true
}

wait_for_port_clear() {
  local attempt
  for attempt in {1..30}; do
    if ! port_open; then
      return 0
    fi
    /bin/sleep 1
  done
  return 1
}

stop_homebrew_server() {
  local node_bin="$1"
  local pid
  pid="$(server_pid_from_health "$node_bin")"
  if [[ -z "$pid" ]] && legacy_homebrew_server; then
    pid="$(port_owner_pid)"
  fi

  log "Stopping Homebrew Forge server pid ${pid:-unknown} on $URL"
  /bin/launchctl bootout "${LAUNCHCTL_TARGET}/${AGENT_LABEL}" >/dev/null 2>&1 || true
  if [[ -n "$pid" ]] && /bin/kill -0 "$pid" 2>/dev/null; then
    /bin/kill -TERM "$pid" 2>/dev/null || true
  fi
  if ! wait_for_port_clear && [[ -n "$pid" ]] && /bin/kill -0 "$pid" 2>/dev/null; then
    log "Port $PORT stayed occupied after TERM; sending KILL to Homebrew Forge server pid $pid"
    /bin/kill -KILL "$pid" 2>/dev/null || true
  fi
  if ! wait_for_port_clear; then
    log "Port $PORT stayed occupied after stopping Homebrew Forge server"
    alert "Homebrew Forge could not restart because port $PORT stayed in use. See:\n$LOG_FILE"
    exit 1
  fi
}

ensure_forge_dist_fresh() {
  local node_bin="$1"
  local dist_state
  set +e
  "$node_bin" "$HEALTH_HELPER" dist-stale "$REPO_ROOT" >/dev/null 2>&1
  dist_state=$?
  set -e
  if [[ "$dist_state" == "0" ]]; then
    return 0
  fi
  if [[ ! -f "$PNPM_CLI" ]]; then
    log "Cannot rebuild forge dist; missing $PNPM_CLI"
    alert "Homebrew Forge could not find its package runner. See:\n$LOG_FILE"
    exit 1
  fi
  log "Rebuilding @homebrew-forge/forge because runtime health reported stale or missing dist"
  "$node_bin" "$PNPM_CLI" --filter @homebrew-forge/forge build >> "$LOG_FILE" 2>&1
}

write_launch_agent_plist() {
  local node_dir
  node_dir="$(/usr/bin/dirname "$1")"
  mkdir -p "$HOME/Library/LaunchAgents"
  /bin/cat > "$AGENT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${1}</string>
    <string>${REPO_ROOT}/scripts/run-homebrew-forge-editor.mjs</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${REPO_ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>CI</key>
    <string>true</string>
    <key>HOMEBREW_FORGE_PORT</key>
    <string>${PORT}</string>
    <key>PATH</key>
    <string>${node_dir}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <false/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>
</dict>
</plist>
PLIST
}

bootstrap_launch_agent() {
  local node_bin="$1"
  write_launch_agent_plist "$node_bin"
  /bin/launchctl bootout "${LAUNCHCTL_TARGET}/${AGENT_LABEL}" >/dev/null 2>&1 || true
  /bin/launchctl bootstrap "$LAUNCHCTL_TARGET" "$AGENT_PLIST" >> "$LOG_FILE" 2>&1
}

start_direct_editor_server() {
  local node_bin="$1"
  log "Starting Homebrew Forge editor directly because LaunchAgent did not start"
  /usr/bin/nohup /usr/bin/env HOMEBREW_FORGE_PORT="$PORT" "$node_bin" "$REPO_ROOT/scripts/run-homebrew-forge-editor.mjs" >> "$LOG_FILE" 2>&1 &
  local pid="$!"
  print -r -- "$pid" > "$APP_SUPPORT/editor-server.pid"
  log "Started direct Homebrew Forge editor pid=$pid on $URL"
  disown "$pid" 2>/dev/null || true
}

kickstart_launch_agent() {
  local node_bin="$1"
  if ! /bin/launchctl print "${LAUNCHCTL_TARGET}/${AGENT_LABEL}" >/dev/null 2>&1; then
    if ! bootstrap_launch_agent "$node_bin"; then
      log "LaunchAgent bootstrap failed; falling back to direct editor process"
      start_direct_editor_server "$node_bin"
      return 0
    fi
  fi

  if ! /bin/launchctl kickstart -k "${LAUNCHCTL_TARGET}/${AGENT_LABEL}" >> "$LOG_FILE" 2>&1; then
    log "LaunchAgent kickstart failed; re-bootstrapping ${AGENT_LABEL}"
    if bootstrap_launch_agent "$node_bin" && /bin/launchctl kickstart -k "${LAUNCHCTL_TARGET}/${AGENT_LABEL}" >> "$LOG_FILE" 2>&1; then
      return 0
    fi
    log "LaunchAgent kickstart still failed after bootstrap; falling back to direct editor process"
    start_direct_editor_server "$node_bin"
  fi
}

wait_for_server() {
  local node_bin="$1"
  local attempt
  for attempt in {1..45}; do
    if server_ready "$node_bin"; then
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

  if [[ ! -f "$REPO_ROOT/scripts/run-homebrew-forge-editor.mjs" ]]; then
    log "Missing editor runner script under $REPO_ROOT/scripts"
    alert "Homebrew Forge could not find its editor runner. See:\n$LOG_FILE"
    exit 1
  fi

  if [[ ! -f "$EDITOR_DIR/node_modules/vite/bin/vite.js" ]]; then
    log "Missing Vite dependency under $EDITOR_DIR/node_modules"
    alert "Homebrew Forge dependencies are missing. Run the repo install once, then relaunch. Log:\n$LOG_FILE"
    exit 1
  fi

  ensure_forge_dist_fresh "$node_bin"

  if [[ -n "$(port_owner)" ]] && ! server_ready "$node_bin"; then
    log "Port $PORT is occupied by: $(port_owner)"
    alert "Homebrew Forge could not start because port $PORT is already in use. See:\n$LOG_FILE"
    exit 1
  fi

  log "Starting Homebrew Forge LaunchAgent ${AGENT_LABEL} on $URL with $node_bin"
  kickstart_launch_agent "$node_bin"

  if ! wait_for_server "$node_bin"; then
    log "Editor did not become ready at $HEALTH_URL"
    alert "Homebrew Forge started but did not become ready. See:\n$LOG_FILE"
    exit 1
  fi
}

open_chrome_app_window() {
  if [[ "${HOMEBREW_FORGE_OPEN_CHROME:-1}" == "0" ]]; then
    log "Chrome launch skipped by HOMEBREW_FORGE_OPEN_CHROME=0"
    return 0
  fi

  /bin/mkdir -p "$CHROME_PROFILE"

  local chrome_bin=""
  if [[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
    chrome_bin="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  elif [[ -x "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
    chrome_bin="$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  fi

  if [[ -n "$chrome_bin" ]] && /bin/ps -axo args= | /usr/bin/awk -v chrome="$chrome_bin" -v profile="--user-data-dir=$CHROME_PROFILE" -v app="--app=$URL" 'index($0, chrome) == 1 && index($0, profile) > 0 && index($0, app) > 0 { found = 1 } END { exit found ? 0 : 1 }'; then
    log "Dedicated Chrome app profile already running for $URL; activating Chrome"
    /usr/bin/open -a "Google Chrome" >/dev/null 2>&1 || true
    return 0
  fi

  if [[ -n "$chrome_bin" ]]; then
    log "Opening dedicated Chrome app window at $URL"
    "$chrome_bin" \
      --user-data-dir="$CHROME_PROFILE" \
      --app="$URL" \
      --no-first-run \
      --no-default-browser-check \
      >/dev/null 2>&1 &
    return 0
  fi

  log "Google Chrome not found; opening default browser at $URL"
  /usr/bin/open "$URL"
}

main() {
  local node_bin
  log "Launcher invoked pid=$$ context=${HOMEBREW_FORGE_LAUNCH_CONTEXT:-manual}"
  acquire_launcher_lock
  trap release_launcher_lock EXIT INT TERM

  if ! node_bin="$(find_node)"; then
    log "No usable Node.js executable found"
    alert "Homebrew Forge could not find Node.js. See:\n$LOG_FILE"
    exit 1
  fi
  export PATH="$(/usr/bin/dirname "$node_bin"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

  local server_state
  server_state="$(server_status "$node_bin")"

  if [[ "${HOMEBREW_FORGE_FORCE_RESTART:-0}" == "1" ]]; then
    if [[ "$server_state" == "fresh" || "$server_state" == "stale" ]] || legacy_homebrew_server; then
      stop_homebrew_server "$node_bin"
    elif [[ -n "$(port_owner)" ]]; then
      log "Forced restart blocked by non-Homebrew Forge port owner: $(port_owner)"
      alert "Homebrew Forge could not restart because port $PORT is used by another process. See:\n$LOG_FILE"
      exit 1
    fi
    start_server "$node_bin"
  elif [[ "$server_state" == "fresh" ]]; then
    log "Homebrew Forge editor already fresh at $URL"
  elif [[ "$server_state" == "stale" ]]; then
    log "Homebrew Forge editor is stale; restarting before opening"
    stop_homebrew_server "$node_bin"
    start_server "$node_bin"
  elif legacy_homebrew_server; then
    log "Legacy Homebrew Forge editor has no health endpoint; restarting before opening"
    stop_homebrew_server "$node_bin"
    start_server "$node_bin"
  elif [[ -n "$(port_owner)" ]]; then
    log "Port $PORT is occupied by non-Homebrew Forge process: $(port_owner)"
    alert "Homebrew Forge could not start because port $PORT is already in use by another process. See:\n$LOG_FILE"
    exit 1
  else
    start_server "$node_bin"
  fi

  open_chrome_app_window
}

main "$@"
