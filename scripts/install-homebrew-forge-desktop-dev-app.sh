#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
app_path="/Applications/Homebrew Forge Desktop Dev.app"

cd "$repo_root"
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop build >/dev/null

electron_binary="$(node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop exec node -e "console.log(require('electron'))")"
electron_app="$(dirname "$(dirname "$(dirname "$electron_binary")")")"

if [[ ! -d "$electron_app" ]]; then
  echo "Electron.app not found at $electron_app" >&2
  exit 1
fi

rm -rf "$app_path"
ditto "$electron_app" "$app_path"
rm -rf "$app_path/Contents/Resources/app"
ln -s "$repo_root/packages/desktop" "$app_path/Contents/Resources/app"

/usr/libexec/PlistBuddy -c "Set :CFBundleName Homebrew Forge Desktop Dev" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Homebrew Forge Desktop Dev" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.homebrewforge.desktopdev" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true

echo "Installed $app_path"
