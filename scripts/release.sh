#!/bin/bash
# release.sh — Script para crear una nueva versión y publicar en GitHub Releases.
#
# Uso:
#   ./scripts/release.sh [patch|minor|major]
#
# Ejemplos:
#   ./scripts/release.sh patch   → 0.1.0 → 0.1.1
#   ./scripts/release.sh minor   → 0.1.0 → 0.2.0
#   ./scripts/release.sh major   → 0.1.0 → 1.0.0
#
# Requisitos:
#   - Git limpio (sin cambios pendientes)
#   - GH_TOKEN configurado (para publicar en GitHub)
set -euo pipefail

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Uso: $0 [patch|minor|major]"
  exit 1
fi

# Verificar que git está limpio
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: Hay cambios sin commitear. Haz commit o stash primero."
  exit 1
fi

# Verificar GH_TOKEN
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "Error: GH_TOKEN no está configurado."
  echo "Exporta tu token: export GH_TOKEN=ghp_tu_token_aqui"
  exit 1
fi

# Leer versión actual
CURRENT_VERSION=$(node -p "require('./apps/desktop/package.json').version")
echo "Versión actual: $CURRENT_VERSION"

# Calcular nueva versión
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "Nueva versión: $NEW_VERSION"

# Actualizar versión en package.json
cd "$(dirname "$0")/.."
sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" apps/desktop/package.json
echo "Versión actualizada en apps/desktop/package.json"

# Commit
git add apps/desktop/package.json
git commit -m "release: v$NEW_VERSION"

# Tag
git tag "v$NEW_VERSION"
echo "Tag creado: v$NEW_VERSION"

# Push
git push
git push --tags
echo "Push completado"

# Publicar release (GitHub Actions se encargará del build)
echo ""
echo "✅ Release v$NEW_VERSION creado."
echo "GitHub Actions construirá los instaladores automáticamente."
echo "Ve a https://github.com/JuanfyF/SPVSW/releases para ver el progreso."
