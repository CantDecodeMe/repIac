#!/bin/bash
# Arma el entregable formal ejercicio02/ a partir de app/ (fuente única de
# verdad de la documentación y el SQL), para no mantener dos copias a mano.
# No toca ejercicio02/index.html, css/ ni evidencias/ (esos se editan
# directamente, son el reporte en sí).
#
# Uso: bash scripts/release.sh   (correr desde la raíz del repo)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
RELEASE_DIR="$ROOT_DIR/ejercicio02"

mkdir -p "$RELEASE_DIR/docs" "$RELEASE_DIR/sql" "$RELEASE_DIR/descargas"

echo "== Copiando documentación (app/docs -> ejercicio02/docs) =="
cp -f "$APP_DIR"/docs/*.md "$APP_DIR"/docs/*.png "$RELEASE_DIR/docs/" 2>/dev/null || true

echo "== Copiando SQL (app/db -> ejercicio02/sql) =="
cp -f "$APP_DIR"/db/*.sql "$RELEASE_DIR/sql/"

echo "== Empaquetando app/ (sin node_modules, .env ni uploads) =="
TAR_PATH="$RELEASE_DIR/descargas/ejercicio02.tar.gz"
tar --exclude='app/node_modules' \
    --exclude='app/.env' \
    --exclude='app/uploads/*' \
    -czf "$TAR_PATH" \
    -C "$ROOT_DIR" app deploy scripts

echo "Listo: $TAR_PATH"
echo "Recuerda revisar antes de publicar: git status, y que no haya secretos"
echo "en ningún archivo copiado (app/.env NUNCA debe estar en el tar.gz)."
