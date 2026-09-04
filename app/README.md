# app/ — Aplicación monolítica de la librería

Proyecto Node.js/Express/EJS/PostgreSQL del Ejercicio 02. Ver
`docs/REQUIREMENTS.md`, `docs/ENGINEERING_DECISIONS.md` y
`docs/ARCHITECTURE_MONOLITHIC.png` para el análisis completo antes de leer
código.

Esta carpeta vive dentro del repo público del portafolio (`ubIaC`), que se
sincroniza tal cual al servidor. Por eso trae su propio `.htaccess` con
`Require all denied`: nadie debe poder pedir estos archivos por HTTP
directamente. La única forma de llegar a la aplicación es vía el reverse
proxy configurado en `~/html/.htaccess` (ver `deploy/htaccess_root.snippet`
y `docs/DEPLOYMENT_UBIQUITOUS.md`), que reenvía `/library` al proceso Node
escuchando en `127.0.0.1:<puerto>`.

## Responsabilidad de cada carpeta/archivo

| Elemento | Responsabilidad |
|---|---|
| `app.js` | Inicialización de Express, montaje de middleware general, registro de rutas y arranque controlado (lee `PORT` de `.env`). |
| `config/db.js` | Único punto de creación del *pool* de conexión a PostgreSQL (`pg`); lee credenciales de variables de entorno; ningún otro archivo abre conexiones propias. |
| `routes/` | Recepción de solicitudes HTTP y coordinación del flujo (valida parámetros de ruta, llama a `services/`, decide qué vista renderizar o a dónde redirigir). No contiene SQL ni reglas de negocio. |
| `services/` | Reglas de negocio y todas las consultas a PostgreSQL, siempre parametrizadas. Es la única capa que importa `config/db.js`. |
| `middleware/` | Autenticación (sesión), autorización por rol, validación transversal y manejo centralizado de errores (nunca expone SQL ni stack traces al cliente). |
| `views/` | Plantillas EJS. Reciben datos ya procesados por `services/` a través de `routes/`; no ejecutan consultas ni deciden reglas de negocio. |
| `public/` | CSS, JavaScript de interfaz e imágenes estáticas servidas por Express (`express.static`). |
| `uploads/` | Imágenes de libros ya validadas (extensión, tipo MIME real, tamaño) y renombradas por el servidor. Nunca se usa el nombre de archivo enviado por el usuario. Contenido ignorado por git salvo `.gitkeep`. |
| `db/` | Scripts SQL versionados: creación de base de datos, esquema 4FN, semillas, consultas de prueba, *stored procedures*, *triggers* y vistas — en el orden en que deben ejecutarse (ver numeración de archivos). |
| `docs/` | Toda la documentación de ingeniería exigida por el enunciado (requisitos, arquitectura, normalización, decisiones, seguridad, pruebas, despliegue, uso de IA). |

## Variables de entorno

Ver `.env.example`. El archivo real `.env` **nunca** se publica ni se
commitea (ver `.gitignore` en la raíz del repo).
