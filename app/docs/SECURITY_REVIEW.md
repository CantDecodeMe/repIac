# Revisión de seguridad

Formato por control: amenaza → control aplicado → evidencia. Cubre los 9
controles mínimos de la Parte 6 del enunciado, más los controles
adicionales que surgieron de operar sin sudo en un servidor compartido.

## 1. Hash de contraseñas y política básica

- **Amenaza:** robo de la base de datos expone contraseñas en texto plano,
  reutilizables en otros servicios de las víctimas.
- **Control aplicado:** `bcryptjs` con costo 12 en `services/authService.js`
  (`bcrypt.hash(password, 12)`); nunca se guarda ni se compara texto plano.
  Contraseña mínima de 8 caracteres validada server-side en
  `routes/auth.js` (`routes/auth.js` líneas de `POST /register`).
- **Evidencia:** columna `users.password_hash` solo contiene hashes
  `$2a$…`/`$2b$…`; los datos de seed usan `crypt(..., gen_salt('bf'))`
  (pgcrypto), verificable con `SELECT password_hash FROM users LIMIT 1;`.

## 2. Variables de entorno para secretos

- **Amenaza:** credenciales de BD o secreto de sesión publicados en el
  repositorio (que además se sincroniza automáticamente al servidor).
- **Control aplicado:** todo secreto vive en `.env` (leído con `dotenv`),
  que está en `.gitignore` de la raíz del repo; se publica únicamente
  `.env.example` sin valores reales.
- **Evidencia:** `git ls-files app | grep '\.env$'` no debe devolver nada;
  `.gitignore` (raíz del repo) contiene `app/.env`.

## 3. Consultas parametrizadas (SQL Injection)

- **Amenaza:** un campo de formulario (título, búsqueda, ISBN…) altera la
  sentencia SQL ejecutada.
- **Control aplicado:** el 100% de las consultas en `services/*.js` usa
  parámetros posicionales (`$1`, `$2`…) del driver `pg`; no existe ni un
  solo punto donde se concatene un valor de usuario dentro de un string
  SQL. Única excepción controlada: `services/catalogEntitiesService.js`
  interpola nombres de **tabla/columna**, pero exclusivamente desde una
  lista blanca fija (`ENTITIES`), nunca desde el valor crudo de la URL.
- **Evidencia:** prueba de parametrización con caracteres especiales en
  `db/03_all_queries_before_stored_procedures.sql` (sección 3) y en
  `TEST_PLAN.md`.

## 4. Validación server-side de todos los campos

- **Amenaza:** un cliente sin JavaScript, o uno modificado, evade la
  validación HTML5 (`required`, `type="number"`…).
- **Control aplicado:** cada ruta de escritura valida de nuevo en el
  servidor (p. ej. `routes/auth.js` valida longitud de contraseña y
  coincidencia de confirmación; `bookService.createBook`/`updateBook`
  capturan violaciones de `CHECK`/`UNIQUE` de PostgreSQL y las traducen a
  mensajes de negocio).
- **Evidencia:** casos de prueba de validación en `TEST_PLAN.md`.

## 5. Autorización por rol en cada ruta administrativa

- **Amenaza:** un usuario registrado alcanza una función de Administrador
  cambiando la URL directamente.
- **Control aplicado:** `middleware/auth.js` (`requireAdmin`) se monta en
  `app.js` en **cada** subruta de `/library/admin/*` (index, books,
  catalogs, concepts, images) — no depende de que cada ruta lo recuerde
  individualmente.
- **Evidencia:** prueba de autorización en `TEST_PLAN.md` (usuario
  registrado intentando `GET /library/admin/books` → 403 vía
  `views/errors/forbidden.ejs`, no un error de servidor crudo).

## 6. Manejo seguro de sesiones y cierre de sesión

- **Amenaza:** secuestro de sesión, sesión persistente tras cerrar sesión,
  o pérdida de sesiones activas si el proceso Node se reinicia (sin sudo,
  el proceso puede reiniciarse por el cron *heartbeat*, ver
  `DEPLOYMENT_UBIQUITOUS.md`).
- **Control aplicado:** `express-session` con cookie `httpOnly`,
  `sameSite=lax`, `secure` condicionado a HTTPS real, y **almacén de
  sesión en PostgreSQL** (`connect-pg-simple`) en vez de memoria — así las
  sesiones sobreviven a un reinicio del proceso. `req.session.regenerate()`
  en login (previene *session fixation*); `req.session.destroy()` +
  `res.clearCookie()` en logout.
- **Evidencia:** tabla `user_sessions` visible en `psql \dt`; cookie de
  sesión inspeccionable en herramientas de desarrollador del navegador
  (atributos `HttpOnly`, `SameSite=Lax`).

## 7. Validación de archivos subidos (extensión, MIME real, tamaño)

- **Amenaza:** subir un archivo ejecutable disfrazado de imagen, o un
  archivo cuyo nombre permita *path traversal*.
- **Control aplicado:** `middleware/upload.js` restringe extensión/MIME
  declarado a JPG/PNG/WebP, limita tamaño (`MAX_UPLOAD_BYTES`), y genera el
  nombre de archivo en el servidor (`crypto.randomBytes` + timestamp) —
  nunca se usa el nombre original. Además, `verifyRealImageType()` lee la
  **firma binaria real** del archivo ya guardado y lo borra si no coincide
  con el tipo declarado (el MIME que manda el navegador no es confiable).
- **Evidencia:** prueba subiendo un archivo `.php` renombrado a `.jpg` en
  `TEST_PLAN.md`; debe ser rechazado por firma binaria.

## 8. Mensajes de error controlados (sin stack traces ni SQL)

- **Amenaza:** un stack trace o el texto de una consulta SQL fallida
  revela estructura interna útil para un atacante.
- **Control aplicado:** `middleware/errorHandler.js` centraliza **todo**
  manejo de errores; el detalle técnico se imprime solo en el log del
  servidor (`console.error`), el cliente siempre recibe
  `views/errors/generic.ejs` con un mensaje genérico o de negocio (nunca el
  `err.stack` ni `err.message` crudo de PostgreSQL).
- **Evidencia:** forzar un error de BD (p. ej. desconectar temporalmente el
  clúster) y confirmar que la respuesta HTTP no contiene texto de
  PostgreSQL ni rutas de archivo del servidor.

## 9. Mínimo privilegio del rol de PostgreSQL

- **Amenaza:** si la aplicación se compromete (inyección, dependencia
  maliciosa), un rol de conexión con privilegios de superusuario permitiría
  leer/alterar cualquier base de datos del clúster o crear roles nuevos.
- **Control aplicado:** la aplicación se conecta únicamente como
  `library_app` (creado en `db/00_create_database.sql`), que **no** es
  superusuario ni dueño de las tablas — solo tiene `SELECT/INSERT/
  UPDATE/DELETE` sobre las tablas y `EXECUTE` sobre los stored procedures
  (`db/01_schema.sql`, `db/04_stored_procedures.sql`). Las migraciones se
  ejecutan con `library_admin`, nunca con las credenciales de la app.
- **Evidencia:** `\du` en `psql` mostrando `library_app` sin atributo
  `Superuser`; `\dp books` mostrando los privilegios otorgados.

## Controles adicionales (propios de este entorno sin sudo)

- **Aislamiento del código fuente del docroot:** como el repo completo se
  sincroniza al servidor y `app/` queda dentro del árbol servido por
  Apache, `app/.htaccess` con `Require all denied` bloquea cualquier
  intento de leer `app.js`, `config/db.js` o `db/*.sql` por HTTP directo.
  Solo se llega a la aplicación vía el reverse proxy hacia
  `127.0.0.1:<puerto>` (ver `deploy/htaccess_root.snippet`).
- **Imágenes servidas sin autenticación adicional (riesgo residual
  aceptado):** `express.static` en `/library/uploads` no valida sesión;
  quien adivine/conozca una ruta de imagen puede verla sin iniciar sesión.
  Se acepta porque son portadas de libros, no datos personales; queda
  documentado como limitación conocida (ver también
  `ARCHITECTURE_TRADEOFFS.md`).
- **Multi-tenencia del servidor:** el puerto interno de Node y el clúster
  PostgreSQL propio se eligieron para no colisionar con procesos de otros
  estudiantes (ver `ENGINEERING_DECISIONS.md`, D-04), reduciendo el riesgo
  de interferencia entre proyectos que comparten el mismo host.
