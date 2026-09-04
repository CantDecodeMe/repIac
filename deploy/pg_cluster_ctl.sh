#!/bin/bash
# Arrancar/detener/consultar el clúster PostgreSQL propio (sin sudo, sin
# systemd --user). Usado también por app_heartbeat.sh vía cron.
set -euo pipefail

PGDATA_DIR="$HOME/pgdata"

case "${1:-status}" in
  start)
    pg_ctl -D "$PGDATA_DIR" -l "$PGDATA_DIR/server.log" start
    ;;
  stop)
    pg_ctl -D "$PGDATA_DIR" stop -m fast
    ;;
  restart)
    pg_ctl -D "$PGDATA_DIR" restart -m fast
    ;;
  status)
    pg_ctl -D "$PGDATA_DIR" status
    ;;
  *)
    echo "Uso: $0 {start|stop|restart|status}" >&2
    exit 1
    ;;
esac
