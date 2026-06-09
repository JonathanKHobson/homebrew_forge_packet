#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/../.." && pwd -P)"
app_path="${HOMEBREW_FORGE_DESKTOP_APP_PATH:-/Applications/Homebrew Forge.app}"
port="${HOMEBREW_FORGE_DESKTOP_PORT:-5187}"
health_url="http://127.0.0.1:${port}/api/health"
log_dir="$HOME/Library/Logs/Homebrew Forge"
log_file="$log_dir/codex-stop-hook.log"
installer="$repo_root/scripts/install-homebrew-forge-desktop-app.sh"
launcher="$repo_root/scripts/launch-homebrew-forge-desktop-app.sh"
mode="${HOMEBREW_FORGE_STOP_HOOK_MODE:-check}"

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

health_field() {
  local field="$1"
  local node_bin="$2"
  "$node_bin" -e '
const [url, field] = process.argv.slice(1);
fetch(url, { signal: AbortSignal.timeout(1500) })
  .then((response) => response.ok ? response.json() : null)
  .then((json) => {
    const value = json?.[field];
    if (value !== undefined && value !== null) console.log(String(value));
  })
  .catch(() => {});
' "$health_url" "$field"
}

app_pids() {
  /bin/ps -axo pid=,args= | /usr/bin/awk -v app_electron="$app_path/Contents/MacOS/Electron" '
    index($0, app_electron) > 0 && index($0, "awk -v app_electron") == 0 { print $1 }
  '
}

needs_reinstall() {
  [[ ! -d "$app_path" ]] && return 0
  [[ ! -x "$app_path/Contents/MacOS/Electron" ]] && return 0
  [[ ! -x "$app_path/Contents/MacOS/HomebrewForgeLauncher" ]] && return 0
  [[ ! -f "$app_path/Contents/Resources/app/main.mjs" ]] && return 0
  [[ "$(cat "$app_path/Contents/Resources/homebrew-forge-repo-root.txt" 2>/dev/null || true)" != "$repo_root" ]] && return 0
  return 1
}

log "Codex Stop hook invoked for Homebrew Forge desktop app mode=$mode"

case "$mode" in
  off)
    log "Hook disabled by HOMEBREW_FORGE_STOP_HOOK_MODE=off"
    exit 0
    ;;
  check|repair)
    ;;
  *)
    log "Unknown HOMEBREW_FORGE_STOP_HOOK_MODE=$mode; falling back to passive check"
    mode="check"
    ;;
esac

if needs_reinstall; then
  if [[ "$mode" == "repair" ]]; then
    log "Default desktop app missing or stale; installing"
    "$installer" >> "$log_file" 2>&1
  else
    log "Passive check miss: default desktop app missing or stale; skipping install. Run HOMEBREW_FORGE_STOP_HOOK_MODE=repair $0 to repair."
    exit 0
  fi
fi

node_bin="$(find_node || true)"
if [[ -n "$node_bin" ]]; then
  repo="$(health_field repoRoot "$node_bin")"
  stale="$(health_field stale "$node_bin")"
  app_count="$(app_pids | /usr/bin/wc -l | /usr/bin/tr -d ' ')"
  if [[ "$repo" == "$repo_root" && "$stale" == "false" && "$app_count" == "1" ]]; then
    log "Fast-path pass: default app running, repo fresh, one app process"
    exit 0
  fi
  log "Fast-path miss: repo=${repo:-unreachable}, stale=${stale:-unknown}, app_processes=${app_count:-0}"
else
  log "Fast-path skipped: Node.js not found"
fi

if [[ "$mode" == "repair" ]]; then
  log "Running desktop launcher health/open path"
  "$launcher" >> "$log_file" 2>&1
  log "Codex Stop hook completed"
else
  log "Passive check completed without repair/open. Run scripts/launch-homebrew-forge-desktop-app.sh to open, or HOMEBREW_FORGE_STOP_HOOK_MODE=repair $0 to repair."
fi
