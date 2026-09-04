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
