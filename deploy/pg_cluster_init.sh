#!/bin/bash
# Inicializa (UNA sola vez) un clúster PostgreSQL propio dentro de $HOME,
# sin sudo — ver app/docs/ENGINEERING_DECISIONS.md, decisión D-04.
#
# Uso:
#   PGCLUSTER_PORT=5433 bash deploy/pg_cluster_init.sh
#
# Después de correr este script, ejecuta en orden (te lo repite al final):
#   db/00_create_database.sql, 01_schema.sql, 02_seed_30_per_table.sql,
#   03_all_queries_before_stored_procedures.sql (solo la sección 1-3, la 4
#   son pruebas negativas que se corren aparte), 04_stored_procedures.sql,
#   05_triggers.sql, 06_views.sql.

set -euo pipefail

PGDATA_DIR="$HOME/pgdata"
PGCLUSTER_PORT="${PGCLUSTER_PORT:-5433}"
PG_SOCKET_DIR="$HOME/pgsocket"
SUPERUSER="library_admin"

if [ -d "$PGDATA_DIR" ]; then
  echo "Ya existe $PGDATA_DIR — este clúster ya fue inicializado."
  echo "Usa deploy/pg_cluster_ctl.sh {start|stop|status} para administrarlo."
  exit 0
fi

mkdir -p "$PG_SOCKET_DIR"

echo "== initdb (se te pedirá una contraseña para el superusuario del clúster: $SUPERUSER) =="
initdb -D "$PGDATA_DIR" -U "$SUPERUSER" --auth=scram-sha-256 --pwprompt

{
  echo "listen_addresses = '127.0.0.1'"   # nunca 0.0.0.0: solo el propio Node se conecta
  echo "port = $PGCLUSTER_PORT"
  echo "unix_socket_directories = '$PG_SOCKET_DIR'"
} >> "$PGDATA_DIR/postgresql.conf"

pg_ctl -D "$PGDATA_DIR" -l "$PGDATA_DIR/server.log" start
sleep 2
pg_ctl -D "$PGDATA_DIR" status

cat <<NEXT

Clúster arriba en 127.0.0.1:$PGCLUSTER_PORT.

Siguiente paso (elige una contraseña propia para el rol de aplicación,
NO la reutilices de ningún otro sistema):

  psql -h 127.0.0.1 -p $PGCLUSTER_PORT -U $SUPERUSER -d postgres \\
       -v app_password="'CAMBIA_ESTA_PASSWORD'" -f app/db/00_create_database.sql
  psql -h 127.0.0.1 -p $PGCLUSTER_PORT -U $SUPERUSER -d library -f app/db/01_schema.sql
  psql -h 127.0.0.1 -p $PGCLUSTER_PORT -U $SUPERUSER -d library -f app/db/02_seed_30_per_table.sql
  psql -h 127.0.0.1 -p $PGCLUSTER_PORT -U $SUPERUSER -d library -f app/db/04_stored_procedures.sql
  psql -h 127.0.0.1 -p $PGCLUSTER_PORT -U $SUPERUSER -d library -f app/db/05_triggers.sql
  psql -h 127.0.0.1 -p $PGCLUSTER_PORT -U $SUPERUSER -d library -f app/db/06_views.sql

Luego copia esos mismos valores (host=127.0.0.1, port=$PGCLUSTER_PORT,
database=library, user=library_app, la password que elegiste) a app/.env.
NEXT
