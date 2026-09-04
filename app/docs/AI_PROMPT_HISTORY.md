# Historial de prompts a IA

Registro cronológico de los usos relevantes de IA durante el Ejercicio 02,
con el prompt (exacto o resumido cuando fue una conversación larga), la
respuesta relevante, los archivos afectados, el riesgo introducido y cómo
se verificó. Ver `AI_CHANGELOG.md` para el resumen por archivo y
`PROMPT_MAESTRO_IA.md` para la plantilla usada en mejoras puntuales.

---

## 2026-09-04 · Arranque del ejercicio y exploración del entorno real

- **Prompt (exacto):** "en @enunciados/ está el @enunciados/Ejercicio-02.pdf,
  me vas a ayudar a hacerlo"
- **Respuesta relevante:** la IA leyó el PDF completo (12 páginas), notó
  que asume una VM propia en GCP con acceso root, y preguntó antes de
  planear nada: dónde debía vivir el código, qué alcance tenía sentido sin
  acceso a GCP, y cómo se autentica el estudiante contra
  `ubiquitous.udem.edu`.
- **Archivos afectados:** ninguno todavía (fase de análisis).
- **Riesgo introducido:** ninguno.
- **Pruebas ejecutadas:** ninguna.
- **Resultado:** se confirmó que hay acceso SSH real con password
  interactivo a `ubiquitous.udem.edu` (usuario `iac-615639`) y **sin
  sudo**, y que ese servidor —no GCP— es el destino real del despliegue.

## 2026-09-04 · Diagnóstico del servidor por SSH (solo lectura)

- **Prompt (resumido):** se pidió al estudiante correr, en su propia
  terminal (la IA no maneja la contraseña), dos bloques de comandos de
  solo lectura por SSH para averiguar qué ofrece el servidor: versión de
  Node/PostgreSQL, si hay sudo, qué hace el cron `sync.sh` ya existente, si
  Apache permite `.htaccess` con `mod_proxy`, y qué puertos ya están en
  uso por otros estudiantes.
- **Respuesta relevante:** la IA interpretó la salida real (no la asumió)
  y concluyó: `~/html` es el mismo repo git con un cron que hace
  `git reset --hard origin/main` cada 5 min; Node 22 y PostgreSQL 16 ya
  están instalados; el servicio PostgreSQL de sistema existe pero sin
  credenciales conocidas; `userdir.conf` permite `AllowOverride FileInfo` y
  `mod_proxy_http`/`mod_rewrite` están cargados.
- **Archivos afectados:** ninguno (solo diagnóstico).
- **Riesgo introducido:** ninguno — comandos de solo lectura.
- **Pruebas ejecutadas:** las de diagnóstico mismas (whoami, systemctl
  status, ss -tlnp, etc.), con su salida real pegada en la conversación.
- **Resultado:** definió el diseño real de las Partes 4 y 8 del enunciado
  (ver `ENGINEERING_DECISIONS.md`, D-04) en vez de asumir GCP.

## 2026-09-04 · Prueba de un clúster PostgreSQL propio sin sudo

- **Prompt (resumido):** ante la duda de si un clúster PostgreSQL propio
  en `$HOME` era viable sin permisos de root, se pidió una prueba
  desechable (`initdb` + `pg_ctl` en un directorio temporal, con limpieza
  al final) antes de comprometerse a ese diseño.
- **Respuesta relevante:** la IA propuso el script de prueba exacto,
  incluyendo la limpieza (`rm -rf` del directorio temporal al final) para
  no dejar residuos.
- **Archivos afectados:** ninguno (directorio `~/pgtest` creado y borrado
  en el propio servidor, fuera del repo).
- **Riesgo introducido:** ninguno — aislado en un directorio temporal
  propio, sin tocar el servicio de sistema.
- **Pruebas ejecutadas:** `initdb`, `pg_ctl start`, `psql -c "select
  version();"`, `pg_ctl stop`. Salida real: `PostgreSQL 16.8 on
  x86_64-redhat-linux-gnu…`.
- **Resultado:** confirmó que el diseño D-04 (clúster propio) es viable;
  se adoptó como decisión de arquitectura definitiva.

## 2026-09-04 · Construcción del proyecto completo (Checkpoints A-H)

- **Prompt (resumido):** con el plan ya aprobado por el estudiante
  (`/home/omax/.claude/plans/cached-baking-moler.md`), se pidió construir
  requisitos, arquitectura, normalización 4FN, esquema SQL completo
  (schema/seed/consultas/stored procedures/triggers/vistas), la aplicación
  Node.js/Express/EJS completa, revisión de seguridad, plan de pruebas y
  scripts de despliegue para `ubiquitous.udem.edu`.
- **Respuesta relevante:** ver el detalle completo, archivo por archivo,
  en `AI_CHANGELOG.md`.
- **Archivos afectados:** prácticamente todo `app/`, `deploy/`, y los docs
  de este directorio (lista completa en `AI_CHANGELOG.md`).
- **Riesgo introducido:** código nuevo sin ejecutar todavía contra el
  servidor real (no hay Node/PostgreSQL en el entorno donde se escribió el
  código); mitigado con una revisión manual de balance de sintaxis
  (llaves/paréntesis en `.js`, tags `<% %>` en `.ejs`) antes de continuar,
  y con el Checkpoint G explícitamente pendiente de verificación en vivo
  (ver `DEPLOYMENT_UBIQUITOUS.md`, sección 5).
- **Pruebas ejecutadas:** verificación estática de balance de sintaxis en
  todos los `.js`/`.ejs` (sin mismatches). Las pruebas funcionales reales
  (`TEST_PLAN.md`) quedan pendientes de correr contra el clúster y la app
  ya desplegados.
- **Resultado:** base completa del ejercicio lista para desplegar; el
  estudiante revisó cada decisión de diseño (no solo el código) antes de
  aceptarla, según consta en las preguntas de aclaración de esta misma
  conversación.

## 2026-09-04 · Despliegue en vivo (Checkpoint G ejecutado) + fix de proxy

- **Prompt (resumido):** se pidió ejecutar en el servidor real (SSH,
  `iac-615639`) el Handoff Checkpoint G: puertos, PostgreSQL propio, `.env`,
  `npm install`, `.htaccess` reverse proxy, heartbeat en crontab, pruebas
  reales de la sección 4 del SQL, TEST_PLAN.md y DEPLOYMENT_UBIQUITOUS.md.
  Al validar el flujo completo por el navegador se descubrió que la app no
  era navegable detrás del proxy UserDir.
- **Diagnóstico real (en el servidor):**
  1. Cookie `Path=/library` vs peticiones del navegador
     `/~iac-615639/library/...`: fail en RFC 6265 path-match y además
     express-session 1.19 exige pathname-cookie-path-match sobre lo que
     recibe Node (`/library/...`, Apache quita el prefijo). El único path
     que satisface ambos lados es `/`.
  2. Redirects y links absolutos `/library/...` => se perdía
     `/~iac-615639`.
  3. Las imágenes seed usan paths `/uploads/seed/...` (no montadas) y el
     UserDir no las sirve; Apache solo proxiába `/library`.
  4. `sync.sh` hace `git reset --hard origin/main` cada 5 min y el server
     no tiene credencial de push: cualquier cambio no commiteado/pusheado
     se revierte. Se resolvió con una copia de despliegue fuera del repo
     (`~/libapp/`) y un heartbeat propio en crontab.
- **Fix implementado y verificado en vivo:** middleware `APP_BASE_PATH` +
  `res.locals.basePath` en `app/app.js`; prefix `basePath` en todas las
  vistas; cookie `path:'/'`; mount estático `/uploads`; regla en
  `.htaccess` para `/uploads`; portadas seed JPEG generadas. Todo verificado
  vía el camino del proxy (`http://127.0.0.1/~iac-615639/library/...` y
  `http://ubiquitous.udem.edu/~iac-615639/...` → 200).
- **Riesgo introducido:** la cookie de sesión ahora viaja con `Path=/`
  (decisión documentada en app.js y en AI_CHANGELOG G2). Mitigado con
  HttpOnly + SameSite=Lax y el entorno productivo por HTTPS.
- **Pruebas ejecutadas:** flujo completo login→catálogo→detalle→admin→logout
  vía proxy; imágenes seed y css 200; verificación de prefijos en `Location`
  y links. Detalle por caso en `TEST_PLAN.md`.
- **Resultado:** sitio vivo y estable en
  https://ubiquitous.udem.edu/~iac-615639/library, con copia de producción
  en `~/libapp/` inmune a los resets de `sync.sh`, y patch del fix en
  `~/library-work/fix-proxy-userdir.patch` para incorporarlo al repo.
