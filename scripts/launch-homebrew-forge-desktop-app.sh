#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
app_path="${HOMEBREW_FORGE_DESKTOP_APP_PATH:-/Applications/Homebrew Forge.app}"
port="${HOMEBREW_FORGE_DESKTOP_PORT:-5187}"
health_url="http://127.0.0.1:${port}/api/health"
log_dir="$HOME/Library/Logs/Homebrew Forge"
log_file="$log_dir/desktop-app-launcher.log"

mkdir -p "$log_dir"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$log_file"
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
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

app_pids() {
  /bin/ps -axo pid=,args= | /usr/bin/awk -v app_electron="$app_path/Contents/MacOS/Electron" '
    index($0, app_electron) > 0 { print $1 }
  '
}

open_default_app() {
  if [[ ! -d "$app_path" ]]; then
    echo "Homebrew Forge.app not found at $app_path" >&2
    exit 1
  fi
  log "Opening default desktop app through LaunchServices at $app_path"
  /usr/bin/open -n "$app_path" >> "$log_file" 2>&1
}

health_field() {
  local field="$1"
  local node_bin="$2"
  "$node_bin" -e '
const [url, field] = process.argv.slice(1);
const timeout = AbortSignal.timeout(1500);
fetch(url, { signal: timeout })
  .then((response) => response.ok ? response.json() : null)
  .then((json) => {
    const value = json?.[field];
    if (value !== undefined && value !== null) console.log(String(value));
  })
  .catch(() => {});
' "$health_url" "$field"
}

stop_health_runtime() {
  local node_bin="$1"
  local pid parent
  pid="$(health_field processId "$node_bin")"
  parent="$(health_field parentProcessId "$node_bin")"
  for candidate in "$pid" "$parent"; do
    if [[ "$candidate" =~ ^[0-9]+$ ]] && /bin/kill -0 "$candidate" 2>/dev/null; then
      log "Stopping existing Homebrew Forge runtime pid=$candidate on port $port"
      /bin/kill -TERM "$candidate" 2>/dev/null || true
    fi
  done
  sleep 1
  for candidate in "$pid" "$parent"; do
    if [[ "$candidate" =~ ^[0-9]+$ ]] && /bin/kill -0 "$candidate" 2>/dev/null; then
      log "Runtime pid=$candidate survived TERM; sending KILL"
      /bin/kill -KILL "$candidate" 2>/dev/null || true
    fi
  done
  for _ in {1..40}; do
    if ! curl -fsS "$health_url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
}

stop_dev_app_if_conflicting() {
  if [[ -d "/Applications/Homebrew Forge Desktop Dev.app" ]]; then
    /bin/ps -axo pid=,args= | /usr/bin/awk '
      index($0, "/Applications/Homebrew Forge Desktop Dev.app/Contents/MacOS/Electron") > 0 { print $1 }
    ' | while read -r pid; do
      if [[ "$pid" =~ ^[0-9]+$ ]] && /bin/kill -0 "$pid" 2>/dev/null; then
        log "Stopping Desktop Dev app pid=$pid during default app launch"
        /bin/kill -TERM "$pid" 2>/dev/null || true
      fi
    done
  fi
}

stop_default_app_if_unhealthy() {
  local pids="$1"
  while read -r pid; do
    if [[ "$pid" =~ ^[0-9]+$ ]] && /bin/kill -0 "$pid" 2>/dev/null; then
      log "Stopping unhealthy default desktop app pid=$pid before relaunch"
      /bin/kill -TERM "$pid" 2>/dev/null || true
    fi
  done <<< "$pids"
  sleep 1
  while read -r pid; do
    if [[ "$pid" =~ ^[0-9]+$ ]] && /bin/kill -0 "$pid" 2>/dev/null; then
      log "Default desktop app pid=$pid survived TERM; sending KILL"
      /bin/kill -KILL "$pid" 2>/dev/null || true
    fi
  done <<< "$pids"
}

wait_for_health() {
  local node_bin="$1"
  local attempt repo stale
  for attempt in {1..120}; do
    repo="$(health_field repoRoot "$node_bin")"
    stale="$(health_field stale "$node_bin")"
    if [[ "$repo" == "$repo_root" && "$stale" == "false" ]]; then
      return 0
    fi
    sleep 0.25
  done
  return 1
}

node_bin="$(find_node)"
if [[ -z "$node_bin" ]]; then
  echo "Homebrew Forge could not find Node.js." >&2
  exit 1
fi

if [[ ! -d "$app_path" || ! -f "$app_path/Contents/Resources/app/main.mjs" ]]; then
  log "Default desktop app missing or stale; installing"
  "$repo_root/scripts/install-homebrew-forge-desktop-app.sh" >> "$log_file" 2>&1
fi

if [[ ! -x "$app_path/Contents/MacOS/Electron" || ! -x "$app_path/Contents/MacOS/HomebrewForgeLauncher" || "$(cat "$app_path/Contents/Resources/homebrew-forge-repo-root.txt" 2>/dev/null || true)" != "$repo_root" ]]; then
  log "Default desktop app executable or repo marker missing/stale; reinstalling"
  "$repo_root/scripts/install-homebrew-forge-desktop-app.sh" >> "$log_file" 2>&1
fi

existing_repo="$(health_field repoRoot "$node_bin")"
existing_stale="$(health_field stale "$node_bin")"
existing_app_pids="$(app_pids)"

if [[ -n "$existing_app_pids" && "$existing_repo" == "$repo_root" && "$existing_stale" == "false" ]]; then
  log "Default desktop app already running with fresh primary repo health; focusing"
  /usr/bin/open "$app_path" >> "$log_file" 2>&1 || true
  exit 0
fi

if [[ -n "$existing_app_pids" ]]; then
  stop_default_app_if_unhealthy "$existing_app_pids"
fi

if [[ -n "$existing_repo" ]]; then
  log "Port $port already has Homebrew Forge health for repo=$existing_repo stale=${existing_stale:-unknown}; restarting under default app"
  stop_dev_app_if_conflicting
  stop_health_runtime "$node_bin"
fi

open_default_app

if ! wait_for_health "$node_bin"; then
  echo "Homebrew Forge desktop app did not become ready. See $log_file" >&2
  exit 1
fi
