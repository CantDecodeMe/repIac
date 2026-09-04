#!/bin/bash
# Mantiene viva la app Node.js y el clúster PostgreSQL propio SIN systemd
# --user y SIN sudo, con el mismo patrón que el sync.sh ya presente en el
# servidor (cron independiente de la sesión SSH).
#
# Cron sugerido (cada 5 min):
#   */5 * * * * /bin/bash /home/iac-615639/html/deploy/app_heartbeat.sh >> /home/iac-615639/library_heartbeat.log 2>&1
#
# NO se instala solo/automáticamente: se agrega a crontab manualmente
# (crontab -e) después de validar que la app arranca bien a mano.

set -euo pipefail

APP_DIR="$HOME/html/app"
LOG_FILE="$HOME/library_app.log"

# Sube el clúster propio si no estaba arriba; no falla si ya lo estaba.
bash "$HOME/html/deploy/pg_cluster_ctl.sh" start >/dev/null 2>&1 || true

if ! pgrep -f "node .*${APP_DIR}/app.js" > /dev/null 2>&1; then
  echo "[$(date -Iseconds)] app.js no estaba corriendo; se reinicia." >> "$LOG_FILE"
  cd "$APP_DIR"
  nohup node app.js >> "$LOG_FILE" 2>&1 &
  disown
fi
