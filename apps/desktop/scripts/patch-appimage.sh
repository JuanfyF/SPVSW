#!/bin/bash
# patch-appimage.sh — Extract AppImage, patch AppRun with GPU/sandbox flags, repackage.
# Usage: ./patch-appimage.sh <path-to.AppImage>
set -euo pipefail

APPIMAGE_PATH="${1:?Usage: $0 <appimage-path>}"
APPIMAGE_NAME="$(basename "$APPIMAGE_PATH")"
APPIMAGE_DIR="$(dirname "$APPIMAGE_PATH")"
WORKDIR="$(mktemp -d)"
TOOL="/tmp/appimagetool"

# Download appimagetool if missing
if [ ! -x "$TOOL" ]; then
  echo "Downloading appimagetool..."
  curl -sL "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" \
    -o "$TOOL"
  chmod +x "$TOOL"
fi

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "Extracting $APPIMAGE_NAME..."
"$APPIMAGE_PATH" --appimage-extract >/dev/null 2>&1
mv squashfs-root "$WORKDIR/appdir"

# Patch AppRun: always pass --no-sandbox --in-process-gpu
sed -i 's|exec "\$BIN" "\${args\[@\]}"|exec "\$BIN" --no-sandbox --in-process-gpu "\${args[@]}"|' \
  "$WORKDIR/appdir/AppRun"

# Also handle the no-args case
sed -i 's|exec "\$BIN"$|exec "$BIN" --no-sandbox --in-process-gpu|' \
  "$WORKDIR/appdir/AppRun"

echo "Patched AppRun:"
grep -A4 'atexit()' "$WORKDIR/appdir/AppImage" 2>/dev/null || grep 'exec.*BIN.*no-sandbox' "$WORKDIR/appdir/AppRun"

echo "Repackaging..."
ARCH=x86_64 "$TOOL" "$WORKDIR/appdir" "$APPIMAGE_PATH" 2>&1 | grep -v "^$"

echo "Done: $APPIMAGE_PATH"
ls -lh "$APPIMAGE_PATH"
