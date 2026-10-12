#!/bin/bash
# patch-appimage.sh — Extract AppImage, patch AppRun with GPU/sandbox flags, repackage.
# Usage: ./patch-appimage.sh <path-to.AppImage> | ./patch-appimage.sh <directory>
set -euo pipefail

INPUT="${1:?Usage: $0 <appimage-path-or-directory>}"

# Si es un directorio, buscar el .AppImage MÁS RECIENTE (evita archivos stale)
if [ -d "$INPUT" ]; then
  INPUT=$(find "$INPUT" -maxdepth 1 -name "*.AppImage" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
  if [ -z "$INPUT" ]; then
    echo "Error: No se encontró ningún .AppImage en el directorio"
    exit 1
  fi
fi
echo "Target: $INPUT"

APPIMAGE_PATH="$INPUT"
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

# Patch AppRun: always pass --in-process-gpu (GPU deshabilitado en la app).
# NOTA (2026-10-12): --no-sandbox se eliminó tras probar empíricamente que
# el sandbox de Chromium funciona en este equipo. Si en algún equipo la app
# falla con "No usable sandbox!", reinstaurarlo aquí y en electron/main.ts.
#
# Runtime AppImage 12.x (electron-builder ≥26): AppRun define NO_SANDBOX=()
# con auto-detección de user namespaces y tiene DOS líneas exec:
#   exec "$BIN" "${NO_SANDBOX[@]}"              (sin args)
#   exec "$BIN" "${NO_SANDBOX[@]}" "${args[@]}" (con args)
sed -i 's|exec "\$BIN" "\${NO_SANDBOX\[@\]}" "\${args\[@\]}"|exec "$BIN" --in-process-gpu "${NO_SANDBOX[@]}" "${args[@]}"|' \
  "$WORKDIR/appdir/AppRun"
sed -i 's|exec "\$BIN" "\${NO_SANDBOX\[@\]}"$|exec "$BIN" --in-process-gpu "${NO_SANDBOX[@]}"|' \
  "$WORKDIR/appdir/AppRun"

# Compat con el template viejo del runtime 1.x (por si se reintegra)
sed -i 's|exec "\$BIN" "\${args\[@\]}"|exec "\$BIN" --in-process-gpu "\${args[@]}"|' \
  "$WORKDIR/appdir/AppRun"
sed -i 's|exec "\$BIN"$|exec "$BIN" --in-process-gpu|' \
  "$WORKDIR/appdir/AppRun"

echo "Patched AppRun:"
if ! grep -q 'exec.*in-process-gpu' "$WORKDIR/appdir/AppRun"; then
  echo "ERROR: el patch de AppRun no encontró las líneas exec esperadas." >&2
  echo "El formato de AppRun cambió; revisar patch-appimage.sh." >&2
  exit 1
fi
grep -n 'exec.*in-process-gpu' "$WORKDIR/appdir/AppRun"

echo "Repackaging..."
ARCH=x86_64 "$TOOL" "$WORKDIR/appdir" "$APPIMAGE_PATH" 2>&1 | grep -v "^$"

# Regenerate latest-linux.yml with correct filename, sha512 and size
YML="$APPIMAGE_DIR/latest-linux.yml"
if [ -f "$YML" ]; then
  FILENAME="$(basename "$APPIMAGE_PATH")"
  SHA512_B64="$(openssl dgst -sha512 -binary "$APPIMAGE_PATH" | base64 -w0)"
  SIZE="$(stat -c%s "$APPIMAGE_PATH")"

  sed -i "s|url: .*|url: $FILENAME|" "$YML"
  sed -i "s|path: .*|path: $FILENAME|" "$YML"
  sed -i "s|sha512: .*|sha512: $SHA512_B64|" "$YML"
  sed -i "s|size: .*|size: $SIZE|" "$YML"
  sed -i "/blockMapSize/d" "$YML"

  echo "Updated $YML:"
  cat "$YML"
fi

echo "Done: $APPIMAGE_PATH"
ls -lh "$APPIMAGE_PATH"
