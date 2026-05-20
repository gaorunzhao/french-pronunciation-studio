#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="French Pronunciation Studio"
PRODUCT_NAME="FrenchPronunciationStudio"
BUNDLE_ID="com.yotta.french-pronunciation-studio"
MIN_SYSTEM_VERSION="15.0"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"
APP_CONTENTS="$APP_BUNDLE/Contents"
APP_MACOS="$APP_CONTENTS/MacOS"
APP_RESOURCES="$APP_CONTENTS/Resources"
WEBAPP_RESOURCES="$APP_RESOURCES/WebApp"
APP_BINARY="$APP_MACOS/$PRODUCT_NAME"
INFO_PLIST="$APP_CONTENTS/Info.plist"
APP_ICON="$APP_RESOURCES/AppIcon.icns"
SAVED_STATE_DIR="$HOME/Library/Saved Application State/$BUNDLE_ID.savedState"

if [[ -f "$HOME/.cargo/env" ]]; then
  # Keep the old Tauri toolchain usable for reference builds without requiring a new shell.
  . "$HOME/.cargo/env"
fi

pkill -x "$PRODUCT_NAME" >/dev/null 2>&1 || true
pkill -x "$APP_NAME" >/dev/null 2>&1 || true
rm -rf "$SAVED_STATE_DIR"

build_bundle() {
  npm --prefix "$ROOT_DIR" run build
  swift build -c release --product "$PRODUCT_NAME"
  local build_binary
  build_binary="$(swift build -c release --show-bin-path)/$PRODUCT_NAME"
  local webapp_build_dir
  webapp_build_dir="$(mktemp -d)"
  inline_web_app "$webapp_build_dir"

  rm -rf "$APP_BUNDLE"
  mkdir -p "$APP_MACOS" "$APP_RESOURCES"
  cp "$build_binary" "$APP_BINARY"
  mkdir -p "$WEBAPP_RESOURCES"
  cp -R "$webapp_build_dir/." "$WEBAPP_RESOURCES"
  rm -rf "$webapp_build_dir"
  build_app_icon
  chmod +x "$APP_BINARY"

  cat >"$INFO_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>$PRODUCT_NAME</string>
  <key>CFBundleIdentifier</key>
  <string>$BUNDLE_ID</string>
  <key>CFBundleName</key>
  <string>$APP_NAME</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>$MIN_SYSTEM_VERSION</string>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>French Pronunciation Studio records your practice attempts so you can compare pronunciation timing.</string>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
  </dict>
  <key>NSQuitAlwaysKeepsWindows</key>
  <false/>
</dict>
</plist>
PLIST

  /usr/bin/codesign --force --deep --sign - "$APP_BUNDLE" >/dev/null
}

inline_web_app() {
  local output_dir="$1"
  node - "$ROOT_DIR/dist" "$output_dir" <<'NODE'
const fs = require("fs");
const path = require("path");

const distDir = process.argv[2];
const outputDir = process.argv[3];
fs.mkdirSync(outputDir, { recursive: true });

const indexPath = path.join(distDir, "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const scriptMatch = html.match(/<script[^>]+src="\.\/([^"]+\.js)"[^>]*><\/script>/);
if (!scriptMatch) {
  throw new Error("Could not find built JavaScript asset in dist/index.html");
}
const script = fs
  .readFileSync(path.join(distDir, scriptMatch[1]), "utf8")
  .replace(/<\/script/gi, "<\\/script");
html = html.replace(scriptMatch[0], () => `<script type="module">\n${script}\n</script>`);

const styleMatch = html.match(/<link[^>]+href="\.\/([^"]+\.css)"[^>]*>/);
if (!styleMatch) {
  throw new Error("Could not find built CSS asset in dist/index.html");
}
const css = fs.readFileSync(path.join(distDir, styleMatch[1]), "utf8");
html = html.replace(styleMatch[0], () => `<style>\n${css}\n</style>`);

fs.writeFileSync(path.join(outputDir, "index.html"), html);
fs.copyFileSync(path.join(distDir, "app-icon.png"), path.join(outputDir, "app-icon.png"));
NODE
}

build_app_icon() {
  local icon_source="$ROOT_DIR/public/app-icon.png"
  local temp_dir
  local iconset_dir

  temp_dir="$(mktemp -d)"
  iconset_dir="$temp_dir/AppIcon.iconset"
  mkdir -p "$iconset_dir"

  sips -z 16 16 "$icon_source" --out "$iconset_dir/icon_16x16.png" >/dev/null
  sips -z 32 32 "$icon_source" --out "$iconset_dir/icon_16x16@2x.png" >/dev/null
  sips -z 32 32 "$icon_source" --out "$iconset_dir/icon_32x32.png" >/dev/null
  sips -z 64 64 "$icon_source" --out "$iconset_dir/icon_32x32@2x.png" >/dev/null
  sips -z 128 128 "$icon_source" --out "$iconset_dir/icon_128x128.png" >/dev/null
  sips -z 256 256 "$icon_source" --out "$iconset_dir/icon_128x128@2x.png" >/dev/null
  sips -z 256 256 "$icon_source" --out "$iconset_dir/icon_256x256.png" >/dev/null
  sips -z 512 512 "$icon_source" --out "$iconset_dir/icon_256x256@2x.png" >/dev/null
  sips -z 512 512 "$icon_source" --out "$iconset_dir/icon_512x512.png" >/dev/null
  sips -z 1024 1024 "$icon_source" --out "$iconset_dir/icon_512x512@2x.png" >/dev/null

  iconutil -c icns "$iconset_dir" -o "$APP_ICON"
  rm -rf "$temp_dir"
}

open_app() {
  /usr/bin/open -n "$APP_BUNDLE"
}

build_bundle

case "$MODE" in
  run)
    open_app
    ;;
  --debug|debug)
    lldb -- "$APP_BINARY"
    ;;
  --logs|logs)
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$PRODUCT_NAME\""
    ;;
  --telemetry|telemetry)
    open_app
    /usr/bin/log stream --info --style compact --predicate "subsystem == \"$BUNDLE_ID\""
    ;;
  --verify|verify)
    open_app
    sleep 2
    pgrep -x "$PRODUCT_NAME" >/dev/null
    codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
