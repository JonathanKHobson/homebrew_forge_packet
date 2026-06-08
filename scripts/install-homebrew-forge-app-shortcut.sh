#!/bin/zsh
set -euo pipefail

SCRIPT_PATH="${0:A}"
SCRIPT_DIR="${SCRIPT_PATH:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
APP_PATH="/Applications/Homebrew Forge.app"
APP_SUPPORT="$HOME/Library/Application Support/Homebrew Forge"
BACKUP_DIR="$APP_SUPPORT/App Backups"
LOG_DIR="$HOME/Library/Logs/Homebrew Forge"
APP_LAUNCHER_LABEL="local.homebrew-forge.app-launcher"
APP_LAUNCHER_PLIST="$HOME/Library/LaunchAgents/${APP_LAUNCHER_LABEL}.plist"
SUPPORT_LAUNCHER="$APP_SUPPORT/launch-homebrew-forge-app.sh"
TMP_APP="${TMPDIR:-/tmp}/Homebrew Forge.app.$$"
EXEC_NAME="HomebrewForgeLauncher"
EXEC_PATH="$TMP_APP/Contents/MacOS/$EXEC_NAME"
PLIST_PATH="$TMP_APP/Contents/Info.plist"

mkdir -p "$BACKUP_DIR" "$LOG_DIR" "$HOME/Library/LaunchAgents"
rm -rf "$TMP_APP"
mkdir -p "$TMP_APP/Contents/MacOS" "$TMP_APP/Contents/Resources"

if [[ -d "$APP_PATH" ]]; then
  BACKUP_PATH="$BACKUP_DIR/Homebrew Forge.app.backup-$(/bin/date +%Y%m%d-%H%M%S)"
  /usr/bin/ditto "$APP_PATH" "$BACKUP_PATH"
  print -r -- "Backed up existing shortcut to $BACKUP_PATH"
  if [[ -f "$APP_PATH/Contents/Resources/applet.icns" ]]; then
    /usr/bin/ditto "$APP_PATH/Contents/Resources/applet.icns" "$TMP_APP/Contents/Resources/applet.icns"
  fi
fi

/usr/bin/ditto "$REPO_ROOT/scripts/launch-homebrew-forge-app.sh" "$SUPPORT_LAUNCHER"
/bin/chmod 755 "$SUPPORT_LAUNCHER"

/bin/cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>Homebrew Forge</string>
  <key>CFBundleExecutable</key>
  <string>$EXEC_NAME</string>
  <key>CFBundleIconFile</key>
  <string>applet</string>
  <key>CFBundleIdentifier</key>
  <string>local.homebrew-forge.launcher</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Homebrew Forge</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>LSUIElement</key>
  <true/>
</dict>
</plist>
PLIST

/bin/cat > "$EXEC_PATH" <<LAUNCHER
#!/bin/zsh
set -euo pipefail
LOG_FILE="$LOG_DIR/app-shortcut.log"
LOG_DIR="$LOG_DIR"
SUPPORT_LAUNCHER="$SUPPORT_LAUNCHER"

/bin/mkdir -p "\$LOG_DIR"
print -r -- "[\$(/bin/date '+%Y-%m-%d %H:%M:%S')] App shortcut invoked pid=\$\$" >> "\$LOG_FILE"

if [[ ! -x "\$SUPPORT_LAUNCHER" ]]; then
  print -r -- "[\$(/bin/date '+%Y-%m-%d %H:%M:%S')] Missing support launcher: \$SUPPORT_LAUNCHER" >> "\$LOG_FILE"
  /usr/bin/osascript -e "display dialog \"Homebrew Forge could not find its support launcher. Reinstall the shortcut from the repo.\" buttons {\"OK\"} default button \"OK\" with title \"Homebrew Forge\"" >/dev/null 2>&1 || true
  exit 1
fi

HOMEBREW_FORGE_LAUNCH_CONTEXT="app-shortcut" /bin/zsh "\$SUPPORT_LAUNCHER" >> "\$LOG_FILE" 2>&1
LAUNCHER

/bin/chmod 755 "$EXEC_PATH"

/bin/launchctl bootout "gui/$(/usr/bin/id -u)/${APP_LAUNCHER_LABEL}" >/dev/null 2>&1 || true
/bin/rm -f "$APP_LAUNCHER_PLIST"

rm -rf "$APP_PATH"
/usr/bin/ditto "$TMP_APP" "$APP_PATH"
/usr/bin/xattr -cr "$APP_PATH" || true
/usr/bin/codesign --force --deep --sign - "$APP_PATH" >/dev/null 2>&1 || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_PATH" >/dev/null 2>&1 || true
rm -rf "$TMP_APP"

print -r -- "Installed Homebrew Forge shortcut at $APP_PATH"
