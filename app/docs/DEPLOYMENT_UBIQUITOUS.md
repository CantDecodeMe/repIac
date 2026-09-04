# Despliegue en ubiquitous.udem.edu (sin GCP, sin sudo)

Este documento reemplaza el "GCP_COMMANDS.md" que pide literalmente el
enunciado: aquí no se aprovisiona ninguna VM en la nube — se despliega
directamente sobre el servidor compartido de la materia, al que se accede
por SSH con el usuario `iac-615639` y **sin privilegios de sudo**. Ver
`ENGINEERING_DECISIONS.md` (decisión D-04) para la justificación completa.

## 1. Diagnóstico del entorno (ya verificado por SSH)

Antes de diseñar el despliegue se comprobó, en ese orden, qué ofrece el
servidor real (nunca se asumió nada sin probarlo):

```
$ whoami; hostname; echo "HOME=$HOME"
iac-615639
ubiquitous.udem.edu
HOME=/home/iac-615639

$ cat /etc/os-release | head -5
NAME="Fedora Linux"
VERSION="40 (Workstation Edition)"

$ sudo -n true
sudo: a password is required          # confirmado: sin sudo

$ node -v; npm -v
v22.22.2
10.9.7

$ psql --version; command -v initdb pg_ctl postgres
psql (PostgreSQL) 16.8
/usr/bin/initdb /usr/bin/pg_ctl /usr/bin/postgres

$ systemctl status postgresql
● postgresql.service ... Active: active (running)   # servicio de sistema,
                                                      # pero sin credenciales
                                                      # ni acceso a /var/lib/pgsql

$ httpd -M | grep -i proxy
 proxy_module (shared)  proxy_http_module (shared)  ...

$ grep -i AllowOverride /etc/httpd/conf.d/userdir.conf
AllowOverride FileInfo AuthConfig Limit Indexes

$ ss -tlnp | grep 127.0.0.1
LISTEN 0 511 127.0.0.1:3101 ...   # otros estudiantes ya usan 3101-3105, 4000
```

Y la prueba decisiva — que un clúster PostgreSQL propio en `$HOME` funciona
sin sudo — corrida en un directorio temporal y limpiada después:

```
$ initdb -D ~/pgtest/data -U iac_app --auth=trust
initdb OK
$ pg_ctl -D ~/pgtest/data -o "-p 5544 -k ~/pgtest/sock -h ''" start
server started
$ psql -h ~/pgtest/sock -p 5544 -U iac_app -d postgres -c "select version();"
 PostgreSQL 16.8 on x86_64-redhat-linux-gnu ...
$ pg_ctl -D ~/pgtest/data stop -m fast
```

Conclusión aplicada al diseño: clúster propio en `$HOME/pgdata` (no el
servicio de sistema), reverse proxy vía `.htaccess` con `mod_rewrite`/
`mod_proxy` (no configuración global de Apache), y un cron *heartbeat* para
mantener vivo el proceso Node (no `systemctl --user`, que no se confirmó
disponible con *lingering*).

## 2. Sincronización del código (ya existente en el servidor)

`~/html` en el servidor **es** este mismo repositorio git, mantenido por un
cron ya presente antes de este ejercicio:

```
# ~/sync.sh (cada 5 min vía crontab)
cd /home/iac-615639/html
git fetch origin main
git reset --hard origin/main
```

Es decir: **`git push` a la rama `main` de este repo ya despliega el
código** (incluyendo `app/`, `deploy/` y `ejercicio02/`) sin ningún paso
manual adicional de copiado de archivos.

## 3. Puerto elegido para Node.js

El enunciado ejemplifica con el puerto 3000, pero el servidor es
compartido — ya hay procesos de otros estudiantes en 3101-3105, 4000 y
9080-9092. El puerto real usado en este despliegue es
**`<PUERTO_ELEGIDO>`** (completar aquí una vez asignado en `app/.env`;
elegido evitando los rangos ya ocupados observados con `ss -tlnp`).

## 4. Pasos de despliegue (en orden)

1. **Clúster PostgreSQL propio** (una sola vez):
   `bash deploy/pg_cluster_init.sh` (ver ese script para el detalle) y
   luego cargar `db/00` a `db/06` en el orden indicado por el propio
   script al terminar.
2. **Variables de entorno**: copiar `app/.env.example` a `app/.env` y
   completar `PORT`, `PGPORT` (el del clúster propio), `PGUSER=library_app`,
   `PGPASSWORD` (la elegida en el paso 1) y `SESSION_SECRET` (generar una
   cadena aleatoria propia, por ejemplo con `openssl rand -hex 32`).
3. **Dependencias**: `cd app && npm install --omit=dev`.
4. **Prueba local** (antes de exponer nada): `node app.js` y verificar
   `curl http://127.0.0.1:<PUERTO_ELEGIDO>/library` desde la propia sesión
   SSH.
5. **Reverse proxy**: pegar `deploy/htaccess_root.snippet` (con el puerto
   real) en `~/html/.htaccess`, creando el archivo si no existe.
6. **Verificación externa**: abrir
   `https://ubiquitous.udem.edu/~iac-615639/library` en una ventana
   privada/incógnito (no solo desde la propia sesión).
7. **Persistencia**: agregar la entrada de cron de
   `deploy/app_heartbeat.sh` con `crontab -e` (no se instala sola) para que
   tanto el clúster como el proceso Node se recuperen solos si el servidor
   se reinicia o el proceso muere.

## 5. Evidencia pendiente de captura en vivo

Esta sección se completa la primera vez que se ejecuten los pasos 1-7
contra el servidor real (no antes):

- [ ] Salida de `psql` mostrando las tablas creadas (`\dt`) y los
      privilegios de `library_app` (`\dp books`, `\du`).
- [ ] Salida de las 6 pruebas negativas de integridad de
      `db/03_all_queries_before_stored_procedures.sql` (sección 4), con el
      error real que devolvió PostgreSQL en cada una.
- [ ] `curl -I http://127.0.0.1:<PUERTO_ELEGIDO>/library` (200 local).
- [ ] Captura del navegador en ventana privada mostrando
      `https://ubiquitous.udem.edu/~iac-615639/library` funcionando
      (catálogo, login, subida de imagen).
- [ ] Confirmación de que `crontab -l` incluye `app_heartbeat.sh`.
