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
