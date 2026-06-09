#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
app_path="/Applications/Homebrew Forge Desktop Dev.app"
log_dir="$HOME/Library/Logs/Homebrew Forge"

mkdir -p "$log_dir"

if curl -fsS "http://127.0.0.1:5187/api/health" >/dev/null 2>&1; then
  open "$app_path" >/dev/null 2>&1 || true
  exit 0
fi

"$repo_root/scripts/install-homebrew-forge-desktop-dev-app.sh" >/dev/null
open -n "$app_path"

for _ in {1..120}; do
  if curl -fsS "http://127.0.0.1:5187/api/health" >/dev/null 2>&1; then
    exit 0
  fi
  sleep 0.25
done

echo "Homebrew Forge Desktop Dev did not become ready. See $log_dir/desktop-dev.log if present." >&2
exit 1
