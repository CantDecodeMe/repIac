# Registro de decisiones de ingeniería

Formato exigido por el enunciado: **Necesidad/problema → alternativas
consideradas → decisión tomada → justificación técnica → riesgo o
limitación → evidencia de validación.** Este archivo se actualiza durante
todo el ejercicio, no solo al inicio.

---

## D-01 · Arquitectura monolítica vs. desacoplada

- **Necesidad/problema:** elegir cómo estructurar una aplicación de gestión
  de librería con catálogo, CRUD y autenticación.
- **Alternativas consideradas:** (a) monolito server-side con Express+EJS;
  (b) frontend SPA + API REST/JSON separada; (c) microservicios por dominio
  (catálogo, usuarios, imágenes).
- **Decisión tomada:** monolito server-side, según restricción explícita del
  enunciado (no se permiten REST/JSON/microservicios en esta entrega).
- **Justificación técnica:** para el tamaño y equipo de este proyecto
  (un solo desarrollador, alcance académico) un monolito reduce la
  complejidad operativa: un solo proceso que desplegar, una sola base de
  código que mantener consistente, sin necesidad de contratos de API ni
  versionado entre servicios.
- **Riesgo o limitación:** escalar partes específicas (p. ej. solo carga de
  imágenes) requeriría escalar todo el proceso; el acoplamiento entre vistas
  y backend dificulta reemplazar solo el frontend en el futuro.
- **Evidencia de validación:** estructura de carpetas con separación interna
  de responsabilidades (`routes/services/middleware/views`) documentada en
  este mismo directorio; ver también `ARCHITECTURE_TRADEOFFS.md` (Tarea 2c)
  para el análisis comparativo completo.

## D-02 · Acceso directo a PostgreSQL con `pg` (sin ORM)

- **Necesidad/problema:** acceder a los datos desde Node.js de forma segura
  y auditable.
- **Alternativas consideradas:** (a) ORM (Sequelize/Prisma); (b) query
  builder (Knex); (c) driver `pg` con consultas parametrizadas escritas a
  mano.
- **Decisión tomada:** driver `pg` puro, con consultas SQL parametrizadas
  centralizadas en `services/`.
- **Justificación técnica:** el enunciado exige justificar y controlar
  explícitamente cada consulta (incluyendo *stored procedures*, *triggers*
  y vistas propias); un ORM oculta ese SQL y complica demostrar el modelo
  4FN tal como se diseñó. `pg` da control total sobre el pool de conexiones
  y la parametrización.
- **Riesgo o limitación:** más código repetitivo que con un ORM; requiere
  disciplina manual para no concatenar strings SQL en ningún punto nuevo.
- **Evidencia de validación:** todas las consultas en `services/*.js` usan
  parámetros posicionales (`$1`, `$2`, …); prueba de inyección con
  caracteres especiales en `db/03_all_queries_before_stored_procedures.sql`
  y en `TEST_PLAN.md`.

## D-03 · Renderizado server-side con EJS

- **Necesidad/problema:** elegir cómo generar el HTML que ve el usuario.
- **Alternativas consideradas:** (a) EJS; (b) Pug/Handlebars; (c) SPA con
  fetch al backend (descartada por la restricción de no usar JSON entre
  frontend y backend).
- **Decisión tomada:** EJS.
- **Justificación técnica:** sintaxis basada en HTML+JS que minimiza la
  curva de aprendizaje, soporta parciales/layouts para reutilizar
  navegación y formularios, y es la opción explícitamente sugerida por el
  enunciado.
- **Riesgo o limitación:** sin disciplina, la lógica de negocio puede
  filtrarse a las vistas; se mitiga con la regla explícita de que
  `views/` solo recibe datos ya procesados por `services/`, nunca ejecuta
  consultas ni valida reglas de negocio.
- **Evidencia de validación:** revisión manual de que ningún archivo bajo
  `views/` importa `config/db.js` ni contiene SQL.

## D-04 · PostgreSQL en un clúster propio dentro de `$HOME` (sin sudo)

- **Necesidad/problema:** el enunciado asume una VM propia en GCP donde el
  estudiante instala PostgreSQL como root. El despliegue real es
  `ubiquitous.udem.edu`, un servidor compartido donde **no hay acceso
  sudo**. Ya existe un `postgresql.service` de sistema, pero no se cuenta
  con la contraseña del rol existente ni con acceso a `/var/lib/pgsql` para
  crear roles o bases de datos ahí.
- **Alternativas consideradas:** (a) solicitar credenciales/creación de BD
  a un administrador externo al ejercicio; (b) usar el servicio PostgreSQL
  de sistema si se consiguiera password; (c) inicializar y correr un
  clúster PostgreSQL propio dentro de `$HOME` con `initdb`/`pg_ctl`, en un
  puerto no estándar, sin privilegios de sistema.
- **Decisión tomada:** (c) clúster propio en `$HOME/pgdata`.
- **Justificación técnica:** `initdb` y `pg_ctl` son binarios de usuario
  (no requieren root) siempre que los paquetes de PostgreSQL ya estén
  instalados en el sistema, como se confirmó en `ubiquitous.udem.edu`. Esto
  da control total: se puede crear la base de datos y un rol de aplicación
  con privilegios mínimos actuando como superusuario *del propio clúster*,
  sin depender de terceros ni de credenciales ajenas, y sin necesitar que
  la aplicación corra como superusuario del sistema en ningún momento.
- **Riesgo o limitación:** el clúster consume memoria/CPU/disco de la
  cuota del propio usuario (no del servicio de sistema); si el servidor se
  reinicia, el proceso de PostgreSQL debe volver a levantarse manualmente o
  vía cron, igual que la aplicación Node (ver `DEPLOYMENT_UBIQUITOUS.md`);
  el puerto elegido debe evitar colisión con otros estudiantes en el mismo
  servidor multi-tenant.
- **Evidencia de validación:** prueba realizada por SSH: `initdb` +
  `pg_ctl start` en un directorio temporal (`~/pgtest`) con
  `--auth=trust`, conexión exitosa vía `psql` con
  `select version();` devolviendo `PostgreSQL 16.8 …`, y `pg_ctl stop`
  limpio. El clúster real de la aplicación usa `scram-sha-256` (no
  `trust`) y un rol de aplicación separado del superusuario del clúster
  — ver `deploy/pg_cluster_init.sh`.
