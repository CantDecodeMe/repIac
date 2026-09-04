# Handoff — Checkpoint G: despliegue en vivo en ubiquitous.udem.edu

Este documento es el prompt/brief para continuar el Ejercicio 02
(Integración de Aplicaciones Computacionales, UDEM) en una sesión de
opencode corriendo **directamente en `ubiquitous.udem.edu`** como el
usuario `iac-615639`. Todo lo de este documento se ejecuta ahí (no por
SSH desde otra máquina): esa sesión ya está dentro del servidor.

## Qué ya existe (no rediseñar, solo ejecutar)

Todo el trabajo de diseño, código y documentación del ejercicio ya está
hecho y vive en este mismo repo (`~/html` en el servidor = este repo git).
Lo único que falta es **ejecutarlo en vivo** y capturar evidencia real —
nada de esto se simula ni se inventa:

- `app/` — aplicación Node.js/Express/EJS/PostgreSQL completa.
- `app/db/00_create_database.sql` … `06_views.sql` — esquema 4FN, seed,
  stored procedures, triggers, vistas.
- `app/docs/` — requisitos, arquitectura, normalización 4FN, seguridad,
  plan de pruebas (30 casos), decisiones de ingeniería, y
  `DEPLOYMENT_UBIQUITOUS.md` con el procedimiento narrado (este handoff es
  su versión ejecutable paso a paso).
- `deploy/` — scripts para el clúster PostgreSQL propio, el heartbeat de
  cron, y el snippet de `.htaccess` para el reverse proxy.
- `ejercicio02/` — el entregable formal (16 secciones) que se publica en
  `https://ubiquitous.udem.edu/~iac-615639/ejercicio02/`.

Léete primero, en este orden: `app/README.md`,
`app/docs/ENGINEERING_DECISIONS.md` (decisión D-04, explica por qué NO se
usa GCP ni el PostgreSQL de sistema), y `app/docs/DEPLOYMENT_UBIQUITOUS.md`.

## Hechos ya verificados por SSH (no reasumir GCP ni sudo)

- Servidor Fedora 40, usuario `iac-615639`, **sin sudo** (`sudo -n true`
  pide password). No hay ninguna VM en GCP: todo corre aquí mismo.
- `node -v` → v22.22.2, `npm -v` → 10.9.7. `psql`/`postgres`/`initdb`/
  `pg_ctl` ya instalados (PostgreSQL 16.8).
- Hay un `postgresql.service` de sistema corriendo, pero **no hay
  credenciales ni acceso a `/var/lib/pgsql`** — no se usa. Se confirmó por
  prueba real que un clúster propio en `$HOME` (`initdb`/`pg_ctl`, sin
  sudo) funciona.
- `httpd -M` confirma `mod_proxy`/`mod_proxy_http`/`mod_rewrite` cargados;
  `userdir.conf` permite `AllowOverride FileInfo` → el reverse proxy se
  hace con `.htaccess` de usuario, sin tocar la config global de Apache.
- Puertos ya ocupados por otros estudiantes (evitarlos):
  `3101-3105`, `4000`, `9080-9092`.
- `~/html` (= este repo) se auto-sincroniza cada 5 min vía un cron ya
  existente (`sync.sh`: `git fetch origin main && git reset --hard
  origin/main`).

## Paso 0 — confirmar que el código está sincronizado

```
cd ~/html && git log -1 --oneline
```

Debe mostrar el commit del Ejercicio 02 (app/, deploy/, ejercicio02/). Si
no aparece, forzar el mismo sync que hace el cron:

```
cd ~/html && git fetch origin main && git reset --hard origin/main
```

⚠️ `--hard` descarta cualquier cambio local no commiteado en `~/html`.
Confirmar con `git status` antes de que no haya trabajo suelto ahí.

## Paso 1 — elegir puertos libres

```
ss -tlnp | grep 127.0.0.1
```

Elegir un puerto para Node (evitar 3101-3105/4000/9080-9092) y uno
distinto para el clúster PostgreSQL propio (ej. 5433, si está libre).

## Paso 2 — clúster PostgreSQL propio (una sola vez)

```
PGCLUSTER_PORT=<puerto_pg> bash ~/html/deploy/pg_cluster_init.sh
```

Pide una contraseña para `library_admin` (superusuario **del clúster
propio**, no del sistema) — elegir una nueva, no reutilizar ninguna otra.
Seguir las instrucciones que el script imprime al final (correr
`00_create_database.sql` … `06_views.sql` en orden, con `library_admin`).

## Paso 3 — configurar `app/.env`

```
cp ~/html/app/.env.example ~/html/app/.env
```

Completar `PORT` (puerto de Node del paso 1), `PGHOST=127.0.0.1`,
`PGPORT=<puerto_pg>`, `PGDATABASE=library`, `PGUSER=library_app`,
`PGPASSWORD=<la elegida al crear el rol en db/00_create_database.sql>`,
`SESSION_SECRET=$(openssl rand -hex 32)`. **Nunca** commitear este archivo.

## Paso 4 — instalar dependencias y probar en local

```
cd ~/html/app && npm install --omit=dev
nohup node app.js >> ~/library_app.log 2>&1 &
disown
curl -I http://127.0.0.1:<puerto>/library/catalog
```

Debe responder `302` hacia `/library/auth/login` (requireAuth). Si hay
error, revisar `~/library_app.log`.

## Paso 5 — reverse proxy (Apache, sin sudo)

Crear/editar `~/html/.htaccess` pegando `deploy/htaccess_root.snippet`
con `<PUERTO>` reemplazado por el puerto real de Node. Probar:

```
curl -I https://ubiquitous.udem.edu/~iac-615639/library/catalog
```

y luego confirmar en un navegador en **ventana privada** (no solo desde
la propia sesión).

## Paso 6 — persistencia sin sudo

```
crontab -e
```

Agregar:

```
*/5 * * * * /bin/bash /home/iac-615639/html/deploy/app_heartbeat.sh >> /home/iac-615639/library_heartbeat.log 2>&1
```

Verificar con `crontab -l`.

## Paso 7 — rellenar evidencia real (obligatorio, nada simulado)

- **`app/db/03_all_queries_before_stored_procedures.sql`**, sección 4:
  correr las 6 pruebas negativas contra el clúster real y reemplazar cada
  "Resultado real: PENDIENTE" por el error REAL de PostgreSQL.
- **`app/docs/TEST_PLAN.md`**: ejecutar los 30 casos (o los aplicables) y
  llenar Observado/Estado/Evidencia. Nunca marcar un caso como aprobado
  sin evidencia real adjunta.
- **`app/docs/DEPLOYMENT_UBIQUITOUS.md`**, secciones 3 y 5: reemplazar
  `<PUERTO_ELEGIDO>` por el puerto real y marcar el checklist de evidencia
  con lo que de verdad se capturó.
- **`ejercicio02/index.html`**, sección 11 (Galería de evidencias):
  agregar capturas reales guardadas en `ejercicio02/evidencias/`.
- Si opencode modifica código durante esta sesión, registrar el cambio en
  `app/docs/AI_PROMPT_HISTORY.md` y `app/docs/AI_CHANGELOG.md` con el
  mismo formato ya usado ahí (prompt, riesgo, verificación).
- Al final, regenerar el entregable: `bash ~/html/scripts/release.sh`
  (recopila docs/sql actualizados y regenera `ejercicio02.tar.gz`).

## Reglas que no se deben romper

- Nunca ejecutar la app ni conectarse a diario con `library_admin`
  (superusuario del clúster); la app siempre usa `library_app`.
- Nunca commitear `.env`, contraseñas, tokens ni claves — revisar
  `git status`/`git diff` antes de cualquier commit.
- No usar `sudo` en ningún paso. Si algo pide sudo, es señal de que el
  enfoque está mal — releer `ENGINEERING_DECISIONS.md` D-04.
- Ningún checkpoint se marca como terminado sin evidencia real (comando +
  salida, o captura de pantalla) adjunta en el documento correspondiente.
