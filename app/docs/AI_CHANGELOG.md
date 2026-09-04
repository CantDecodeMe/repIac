# Changelog de cambios asistidos por IA

Resumen por checkpoint de qué se creó/modificó con ayuda de IA durante el
Ejercicio 02. Ver `AI_PROMPT_HISTORY.md` para el detalle de prompts,
riesgos y verificación de cada bloque.

## 2026-09-04 — Checkpoint A: Análisis

- `app/docs/REQUIREMENTS.md` (nuevo)

## 2026-09-04 — Checkpoint B: Arquitectura

- `app/docs/ENGINEERING_DECISIONS.md` (nuevo)
- `app/docs/architecture_monolithic.svg` + `ARCHITECTURE_MONOLITHIC.png` (nuevo)
- `app/README.md` (nuevo — responsabilidades de carpetas)
- `app/.htaccess`, `app/.env.example` (nuevo)
- `.gitignore` (raíz, actualizado: `app/node_modules/`, `app/.env`, `app/uploads/*`)

## 2026-09-04 — Checkpoint C: Modelo de datos 4FN

- `app/docs/NORMALIZATION_4FN.md` (nuevo)
- `app/docs/db_design_er_4fn.svg` + `DB_DESIGN_ER_4FN.png` (nuevo)
- `app/db/00_create_database.sql` … `06_views.sql` (nuevo, 7 archivos)

## 2026-09-04 — Checkpoint D: Aplicación Node.js

- `app/package.json`, `app/app.js`, `app/config/db.js` (nuevo)
- `app/middleware/{auth,errorHandler,upload}.js` (nuevo)
- `app/services/{authService,catalogService,bookService,catalogEntitiesService,conceptService,imageService}.js` (nuevo)
- `app/routes/{auth,catalog}.js`, `app/routes/admin/{index,books,entities,concepts,images}.js` (nuevo)
- `app/views/**/*.ejs` (nuevo — layout, auth, catálogo, admin, errores)
- `app/public/css/style.css` (nuevo)

## 2026-09-04 — Checkpoint E: Seguridad

- `app/docs/SECURITY_REVIEW.md` (nuevo)

## 2026-09-04 — Checkpoint F: Pruebas

- `app/docs/TEST_PLAN.md` (nuevo — 30 casos, columnas Observado/Estado/
  Evidencia pendientes de la corrida en vivo)

## 2026-09-04 — Checkpoint G: Despliegue en ubiquitous.udem.edu

- `deploy/pg_cluster_init.sh`, `deploy/pg_cluster_ctl.sh`,
  `deploy/app_heartbeat.sh`, `deploy/htaccess_root.snippet` (nuevo)
- `app/docs/DEPLOYMENT_UBIQUITOUS.md` (nuevo)

## Pendiente (se agrega tras desplegar en vivo)

- Checkpoint H: `ejercicio02/index.html`, `scripts/release.sh`,
  `activities/02/index.html`.
- Relleno de `TEST_PLAN.md` (Observado/Estado/Evidencia) y de la sección 4
  de `db/03_all_queries_before_stored_procedures.sql` (errores reales de
  PostgreSQL) con la evidencia real del servidor.
- Entrada de Tarea 2e (mejora puntual vía `PROMPT_MAESTRO_IA.md`) una vez
  que exista algo desplegado y verificable sobre lo cual mejorar.

## 2026-09-04 — G2: Despliegue en vivo y arreglo del reverse proxy UserDir

Ejecución real del despliegue en `ubiquitous.udem.edu` (usuario
`iac-615639`, sin sudo) y corrección de un bug de fondo que el despliegue
descubrió (no se podía navegar la app en el navegador a través de Apache):

- Despliegue: PostgreSQL propio en puerto **5433** (clúster en
  `~/pgdata`, socket `~/pgsocket`; `library_admin` superusuario trust local,
  `library_app` scram-sha-256; DB `library` con todo el esquema+seed+SP+
  triggers+vistas y 30 libros). App Node.js en puerto **3110** con
  `app/.env` real (PORT, PGPORT, PGPASSWORD alternativo, SESSION_SECRET,
  `APP_BASE_PATH=/~iac-615639`). Reverse proxy en `~/html/.htaccess`
  (`RewriteBase /~iac-615639/` → `127.0.0.1:3110`); heartbeat en crontab
  cada 5 min.
- Causa raíz navegando por el navegador: (1) la cookie de sesión se
  emitía con `Path=/library` pero el navegador pide
  `/~iac-615639/library/...` → RFC 6265 path-match fallaba → la cookie
  nunca se enviaba; además express-session 1.19 exige que el pathname que
  le llega a Node (Apache entrega `/library/...`, sin el prefijo UserDir)
  empiece por el cookie path → único prefijo válido para ambos: `/`.
  (2) los `Location:` y los links de vistas eran absolutos
  `/library/...` y perdían el prefijo `/~iac-615639`.
- Fix (deploy en vivo en `~/libapp/`; patch para el repo en
  `~/library-work/`):
  - `app/app.js`: middleware `APP_BASE_PATH` (prefija `res.redirect` a
    rutas `/library…` y expone `res.locals.basePath` a las vistas) y cookie
    `path: '/'`. Se agrega además el mount estático `/uploads` para servir
    las imágenes seed/subidas por el mismo socket.
  - Vistas `.ejs`: todos los `href`/`action`/`src` `/library/…` y las imgs
    llevan `<%= basePath %>`.
  - `~/html/.htaccess`: regla adicional que proxiá `/~iac-615639/uploads`
    a Node (las imágenes viven en `app/uploads`, no en el UserDir).
  - Portadas seed: generadas como JPEG reales (300x450) en
    `app/uploads/seed/` para los 30 ISBNs (`convert` de ImageMagick).
- Nota operativa (importante para quien empuje el repo): `~/sync.sh`
  ejecuta `git fetch origin main && git reset --hard origin/main` cada 5
  min (decisión previa del autor) y este servidor no tiene credencial de
  push; por eso la copia que sirve la web en vivo vive en `~/libapp/`
  (con su propio heartbeat `~/libapp-heartbeat.sh` ya apuntado en crontab)
  y **NO en la copia git del repo**. El patch con todo el fix está en
  `~/library-work/fix-proxy-userdir.patch` para aplicarlo al repo desde la
  máquina del autor (`git apply`), y así el historial git reciba el arreglo.
- Verificación en vivo (vía `http://127.0.0.1/~iac-615639/...`, que es el
  mismo camino que usa el Apache público):
  login admin 302 → `Location: /~iac-615639/library/catalog`;
  `Set-Cookie library.sid; Path=/`; catálogo/detalle/admin 200; links
  prefijados (`/~iac-615639/library/...`); css 200; portada seed 200
  (`image/jpeg`); `http://ubiquitous.udem.edu/~iac-615639/library/auth/login` 200.

## Tarea 2e (pendiente de definir con la mejora puntual)
