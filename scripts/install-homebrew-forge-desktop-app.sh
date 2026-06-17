#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
app_path="${HOMEBREW_FORGE_DESKTOP_APP_PATH:-/Applications/Homebrew Forge.app}"
backup_dir="$HOME/Library/Application Support/Homebrew Forge/App Backups"
log_dir="$HOME/Library/Logs/Homebrew Forge"
timestamp="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$backup_dir" "$log_dir"

cd "$repo_root"
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/forge build >/dev/null
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor-core build >/dev/null
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/runtime-service build >/dev/null
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop build >/dev/null

electron_binary="$(node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop exec node -e "console.log(require('electron'))" | tail -n 1)"
electron_app="$(dirname "$(dirname "$(dirname "$electron_binary")")")"
icon_path="$repo_root/assets/app-icons/HomebrewForge.icns"
icon_png_path="$repo_root/assets/app-icons/homebrew-forge-icon-1024.png"
icon_source_path="$repo_root/assets/app-icons/homebrew-forge-icon-source.png"

if [[ ! -d "$electron_app" ]]; then
  echo "Electron.app not found at $electron_app" >&2
  exit 1
fi

if [[ ! -f "$icon_path" || ! -f "$icon_png_path" || ( -f "$icon_source_path" && ( "$icon_source_path" -nt "$icon_png_path" || "$icon_source_path" -nt "$icon_path" ) ) ]]; then
  node "$repo_root/scripts/macos/generate-homebrew-forge-icon.mjs" "$repo_root/assets/app-icons/homebrew-forge-icon-1024.png" >/dev/null
  rm -rf "$repo_root/assets/app-icons/HomebrewForge.iconset"
  mkdir -p "$repo_root/assets/app-icons/HomebrewForge.iconset"
  for icon_size in 16 32 64 128 256 512; do
    sips -z "$icon_size" "$icon_size" "$repo_root/assets/app-icons/homebrew-forge-icon-1024.png" --out "$repo_root/assets/app-icons/HomebrewForge.iconset/icon_${icon_size}x${icon_size}.png" >/dev/null
    retina_size=$((icon_size * 2))
    sips -z "$retina_size" "$retina_size" "$repo_root/assets/app-icons/homebrew-forge-icon-1024.png" --out "$repo_root/assets/app-icons/HomebrewForge.iconset/icon_${icon_size}x${icon_size}@2x.png" >/dev/null
  done
  iconutil -c icns "$repo_root/assets/app-icons/HomebrewForge.iconset" -o "$icon_path"
  rm -rf "$repo_root/assets/app-icons/HomebrewForge.iconset"
fi

if [[ -d "$app_path" ]]; then
  backup_path="$backup_dir/Homebrew Forge.app.pre-desktop-cutover-$timestamp"
  ditto "$app_path" "$backup_path"
  echo "Archived existing app to $backup_path"
fi

rm -rf "$app_path"
ditto "$electron_app" "$app_path"
cp "$icon_path" "$app_path/Contents/Resources/HomebrewForge.icns"
cp "$icon_path" "$app_path/Contents/Resources/electron.icns"
cp "$icon_png_path" "$app_path/Contents/Resources/HomebrewForge.png"
rm -rf "$app_path/Contents/Resources/app"
mkdir -p "$app_path/Contents/Resources/app"
printf '%s\n' "$repo_root" > "$app_path/Contents/Resources/homebrew-forge-repo-root.txt"
cat > "$app_path/Contents/Resources/app/package.json" <<'BOOTSTRAP_PACKAGE'
{
  "name": "homebrew-forge-desktop-bootstrap",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./main.mjs"
}
BOOTSTRAP_PACKAGE
cat > "$app_path/Contents/Resources/app/main.mjs" <<'BOOTSTRAP_MAIN'
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const resourcesDir = dirname(appDir);
const repoRoot = readFileSync(join(resourcesDir, 'homebrew-forge-repo-root.txt'), 'utf8').trim();

process.env.HOMEBREW_FORGE_REPO_ROOT ||= repoRoot;
process.env.HOMEBREW_FORGE_DESKTOP_BACKEND ||= 'vite';
process.env.HOMEBREW_FORGE_DESKTOP_PORT ||= '5187';

const desktopMain = join(repoRoot, 'packages/desktop/dist/main.js');
if (!existsSync(desktopMain)) {
  throw new Error(`Homebrew Forge desktop entry is missing at ${desktopMain}. Run scripts/install-homebrew-forge-desktop-app.sh from the repo.`);
}

await import(pathToFileURL(desktopMain).href);
BOOTSTRAP_MAIN

launcher_source="$repo_root/scripts/macos/HomebrewForgeLauncher.swift"
launcher_path="$app_path/Contents/MacOS/HomebrewForgeLauncher"
swiftc_bin="$(xcrun --find swiftc 2>/dev/null || command -v swiftc || true)"
if [[ -z "$swiftc_bin" ]]; then
  echo "swiftc is required to build the Homebrew Forge launcher app." >&2
  exit 1
fi
host_arch="$(uname -m)"
case "$host_arch" in
  arm64) swift_target="arm64-apple-macos13.0" ;;
  *) swift_target="x86_64-apple-macos13.0" ;;
esac
if xcrun --find swiftc >/dev/null 2>&1; then
  xcrun swiftc -target "$swift_target" "$launcher_source" -o "$launcher_path"
else
  "$swiftc_bin" -target "$swift_target" "$launcher_source" -o "$launcher_path"
fi
chmod 755 "$launcher_path"

/usr/libexec/PlistBuddy -c "Set :CFBundleName Homebrew Forge" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Homebrew Forge" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.homebrewforge.app" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable HomebrewForgeLauncher" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleIconFile HomebrewForge" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || \
  /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string HomebrewForge" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleIconName HomebrewForge" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || \
  /usr/libexec/PlistBuddy -c "Add :CFBundleIconName string HomebrewForge" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Delete :LSUIElement" "$app_path/Contents/Info.plist" >/dev/null 2>&1 || true

xattr -cr "$app_path" || true
codesign --force --deep --sign - "$app_path" >/dev/null 2>&1 || true
/usr/bin/touch "$app_path" || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$app_path" >/dev/null 2>&1 || true

echo "Installed Homebrew Forge desktop app at $app_path"
