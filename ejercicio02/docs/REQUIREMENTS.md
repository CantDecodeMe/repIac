# Requisitos — Ejercicio 02: Librería en línea

Este documento se completa **antes** de escribir código, como lo pide la
Parte 1 del enunciado (`enunciados/Ejercicio-02.pdf`). Cubre alcance,
requisitos funcionales/no funcionales, actores y riesgos iniciales.

## 1. Alcance

Aplicación web monolítica server-side (Node.js + Express + EJS) para
gestionar el catálogo de una librería: libros, autores, géneros, formatos,
categorías, conceptos/definiciones asociados a cada libro e imágenes de
portada/galería. Acceso mediante cuentas registradas; un único usuario con
rol Administrador gestiona el catálogo completo. No se implementan APIs
REST/GraphQL/SOAP ni intercambio JSON/XML entre frontend y backend; todas
las vistas se renderizan en el servidor y los formularios HTML envían datos
directamente al monolito.

## 2. Actores

| Actor | Puede | No puede |
|---|---|---|
| Visitante (no autenticado) | Ver login/registro, páginas públicas explícitamente autorizadas | Consultar catálogo, ver detalle de libro, cualquier CRUD |
| Usuario registrado | Iniciar/cerrar sesión, consultar catálogo, buscar por ISBN/título, ver detalle de libro y sus conceptos | Crear/editar/eliminar libros, autores, géneros, formatos, categorías, conceptos, imágenes; administrar usuarios |
| Administrador (único) | Todo lo del usuario registrado + CRUD completo sobre todas las tablas administrables, gestión de imágenes, administración del sistema | Existir más de una vez (regla reforzada en BD y aplicación) |

## 3. Requisitos funcionales

- **RF-01** Un visitante puede registrarse con nombre, correo único y
  contraseña (política mínima: 8+ caracteres, se valida server-side).
- **RF-02** Un usuario registrado puede iniciar sesión y cerrar sesión.
- **RF-03** El sistema debe rechazar credenciales inválidas sin indicar si
  falló el usuario o la contraseña.
- **RF-04** Un usuario autenticado puede consultar el catálogo de libros
  (listado paginado con portada, título, autor(es), precio, stock).
- **RF-05** El catálogo permite búsqueda por ISBN exacto y por título
  (coincidencia parcial, insensible a mayúsculas/acentos).
- **RF-06** Un usuario autenticado puede ver el detalle de un libro:
  metadatos, autores, géneros, formato, categoría, imágenes y conceptos con
  su definición asociada.
- **RF-07** El Administrador puede crear, consultar, actualizar y eliminar
  libros, incluyendo ISBN, título, año, precio, stock.
- **RF-08** El Administrador puede crear, consultar, actualizar y eliminar
  autores, géneros, formatos, categorías y conceptos como catálogos
  independientes.
- **RF-09** El Administrador puede asociar un libro a uno o varios autores y
  a uno o varios géneros (relación muchos-a-muchos en ambos casos).
- **RF-10** El Administrador puede registrar, editar y eliminar conceptos y
  su definición específica para un libro concreto (la misma definición de
  concepto puede variar entre libros).
- **RF-11** El Administrador puede subir, editar metadatos y eliminar
  imágenes de un libro (múltiples imágenes por libro); puede marcar
  exactamente una imagen como portada por libro.
- **RF-12** El Administrador puede ajustar stock y precio de un libro de
  forma independiente al resto de los campos.
- **RF-13** Las funciones administrativas están restringidas al único
  usuario con rol Administrador; un usuario regular que intente acceder
  recibe un acceso denegado controlado (no un error de servidor crudo).
- **RF-14** El sistema impide la existencia de un segundo Administrador,
  tanto desde la interfaz como desde la base de datos.

## 4. Requisitos no funcionales

- **RNF-01 (Seguridad)** Contraseñas con hash (bcrypt), sesiones seguras,
  autorización por rol en cada ruta administrativa, consultas parametrizadas
  en el 100% de los accesos a datos, sin construir SQL por concatenación.
- **RNF-02 (Mantenibilidad)** Separación de responsabilidades tipo MVC
  (rutas/servicios/vistas/middleware); las vistas EJS no contienen SQL ni
  lógica de negocio.
- **RNF-03 (Integridad de datos)** Restricciones de PK/FK/UNIQUE/CHECK en
  PostgreSQL que reflejen las reglas del negocio (stock ≥ 0, precio > 0,
  ISBN único, un solo Administrador).
- **RNF-04 (Rendimiento básico)** Listado de catálogo paginado; consultas
  con índices sobre columnas de búsqueda frecuente (ISBN, título).
- **RNF-05 (Usabilidad)** Formularios con validación y mensajes de error
  claros; navegación consistente entre catálogo, detalle y administración.
- **RNF-06 (Disponibilidad)** La aplicación se mantiene corriendo de forma
  no interactiva en el servidor (proceso persistente + verificación
  periódica), incluso sin acceso privilegiado al sistema operativo.
- **RNF-07 (Trazabilidad de errores)** Errores registrados en logs del
  servidor con detalle técnico; el usuario final recibe siempre un mensaje
  genérico, nunca un stack trace ni el SQL ejecutado.
- **RNF-08 (Facilidad de despliegue)** El proyecto debe poder desplegarse
  sin privilegios de superusuario en el sistema operativo de destino
  (supuesto explícito de este entorno, ver `ENGINEERING_DECISIONS.md`).

## 5. Supuestos y restricciones

- El servidor de despliegue (`ubiquitous.udem.edu`) es compartido entre
  varios estudiantes y **no se dispone de acceso root/sudo**; esto reemplaza
  el supuesto original del enunciado de una VM propia en GCP.
- El puerto interno de Node.js se elige evitando colisión con procesos de
  otros estudiantes ya activos en el servidor (ver
  `DEPLOYMENT_UBIQUITOUS.md`), en vez de usar literalmente el puerto 3000
  del ejemplo del enunciado.
- Solo existe un rol de Administrador en todo el sistema (regla de negocio
  explícita del enunciado).

## 6. Criterios de aceptación (resumen)

- Un visitante no puede ver el catálogo ni el detalle de un libro sin
  iniciar sesión.
- Un usuario registrado no puede acceder a ninguna ruta bajo `/admin` ni
  ejecutar acciones de escritura sobre libros, catálogos o imágenes.
- Intentar crear un segundo Administrador falla tanto por la interfaz como
  directamente en PostgreSQL (ver pruebas negativas en
  `db/03_all_queries_before_stored_procedures.sql` y `TEST_PLAN.md`).
- Toda consulta con datos provistos por el usuario usa parámetros (`$1`,
  `$2`, …) del driver `pg`, nunca interpolación de strings.

## 7. Riesgos iniciales identificados

| Riesgo | Descripción | Mitigación prevista |
|---|---|---|
| Acceso no autorizado | Usuario regular alcanza rutas administrativas | Middleware de autorización por rol en cada ruta `/admin/*` |
| SQL Injection | Entrada de usuario alcanza una consulta sin parametrizar | Uso exclusivo de consultas parametrizadas con `pg`, sin concatenación |
| Subida de archivos peligrosos | Archivo con extensión/MIME falso o ejecutable | Validación de extensión, MIME real y tamaño; nombre generado por el servidor |
| Exposición de credenciales | `.env`, contraseñas o cadenas de conexión publicadas | `.env` fuera de git, `.env.example` sin valores reales, revisión antes de cada publicación |
| Eliminación accidental de información | `DELETE`/`UPDATE` sin condición o sin confirmación | Confirmación en UI + restricciones FK que impiden borrados que rompan relaciones |
| Publicación de datos sensibles | Rutas internas, stack traces o SQL visibles al usuario final | Manejador de errores centralizado que solo expone mensajes genéricos |
