# Plan y matriz de pruebas

Diseñado antes de dar por terminado el sistema (Parte 7, punto 18) y
ampliado para la Tarea 2b (≥15 casos, positivos y negativos). Las columnas
**Observado**, **Estado** y **Evidencia** se llenan durante el
Checkpoint G, al correr la aplicación real en `ubiquitous.udem.edu`; hasta
entonces quedan como `Pendiente`. No se declara ninguna prueba "aprobada"
sin evidencia real adjunta (captura de pantalla o salida de terminal).

| ID | Requisito | Precondición | Entrada | Pasos | Esperado | Observado | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|
| TC-01 | RF-02 | Usuario registrado existente | email+password correctos | POST /library/auth/login | Sesión iniciada, redirige a /library/catalog | Pendiente | Pendiente | Pendiente |
| TC-02 | RF-02, RF-03 | Usuario existente | password incorrecto | POST /library/auth/login | 401, mensaje genérico "Correo o contraseña incorrectos" (no dice cuál falló) | Pendiente | Pendiente | Pendiente |
| TC-03 | RF-02 | Sesión iniciada | — | POST /library/auth/logout | Sesión destruida; GET /library/catalog vuelve a pedir login | Pendiente | Pendiente | Pendiente |
| TC-04 | RF-05 | Usuario autenticado | ISBN exacto existente | GET /library/catalog?q=978-0-EJ02-0001 | 1 resultado exacto | Pendiente | Pendiente | Pendiente |
| TC-05 | RF-05 | Usuario autenticado | "cien años" (minúsculas) | GET /library/catalog?q=cien+años | Encuentra "Cien años de soledad" | Pendiente | Pendiente | Pendiente |
| TC-06 | RF-07 | Admin autenticado | ISBN nuevo válido | POST /library/admin/books | Libro creado, redirige a edición | Pendiente | Pendiente | Pendiente |
| TC-07 | RF-07 | Libro existente | cambio de precio/título | POST /library/admin/books/:id | Cambios reflejados en catálogo | Pendiente | Pendiente | Pendiente |
| TC-08 | RF-07 | Libro sin relaciones bloqueantes | — | POST /library/admin/books/:id/delete | Libro eliminado, ya no aparece en catálogo | Pendiente | Pendiente | Pendiente |
| TC-09 | RF-08 | Admin autenticado | nombre de autor nuevo | CRUD en /library/admin/catalogs/authors | Alta/edición/baja reflejadas en la lista | Pendiente | Pendiente | Pendiente |
| TC-10 | RF-08 | Admin autenticado | nombre de género nuevo | CRUD en /library/admin/catalogs/genres | Igual que TC-09 | Pendiente | Pendiente | Pendiente |
| TC-11 | RF-08 | Admin autenticado | nombre de formato nuevo | CRUD en /library/admin/catalogs/formats | Igual que TC-09 | Pendiente | Pendiente | Pendiente |
| TC-12 | RF-08 | Admin autenticado | nombre de categoría nuevo | CRUD en /library/admin/catalogs/categories | Igual que TC-09 | Pendiente | Pendiente | Pendiente |
| TC-13 | RF-10 | Libro existente, concepto del catálogo | definición + página | POST /library/admin/concepts/books/:id | Definición visible en detalle del libro | Pendiente | Pendiente | Pendiente |
| TC-14 | RF-04, RF-13 | Sesión no iniciada | — | GET /library/catalog | Redirige a /library/auth/login (RF-04: visitante no ve catálogo) | Pendiente | Pendiente | Pendiente |
| TC-15 | RF-13 | Usuario rol "registered" | — | GET /library/admin/books | 403 (views/errors/forbidden.ejs), no error de servidor crudo | Pendiente | Pendiente | Pendiente |
| TC-16 | RF-07..RF-12 | Usuario rol "admin" | — | Recorrer todas las pantallas /library/admin/* | Acceso completo sin bloqueos | Pendiente | Pendiente | Pendiente |
| TC-17 | RNF-03 | — | ISBN ya existente | INSERT books con isbn duplicado | Falla por UNIQUE (`books_isbn_key`) | Pendiente | Pendiente | Pendiente |
| TC-18 | RNF-03 | Libro existente | stock = -5 | UPDATE books SET stock=-5 | Falla por CHECK (stock >= 0) | Pendiente | Pendiente | Pendiente |
| TC-19 | RNF-03 | Libro existente | price = 0 | UPDATE books SET price=0 | Falla por CHECK (price > 0) | Pendiente | Pendiente | Pendiente |
| TC-20 | RNF-03 | — | author_id inexistente | INSERT book_authors con FK inválida | Falla por violación de FK | Pendiente | Pendiente | Pendiente |
| TC-21 | RNF-03 | Autor con libros asociados | — | DELETE FROM authors WHERE … | Falla por ON DELETE RESTRICT | Pendiente | Pendiente | Pendiente |
| TC-22 | RF-14 | Ya existe 1 Administrador | rol='admin' | INSERT users (…, role='admin') | Falla por índice único parcial + trg_single_admin, mensaje "Ya existe un Administrador…" | Pendiente | Pendiente | Pendiente |
| TC-23 | RNF-01 | Formulario de registro | campos vacíos | POST /library/auth/register sin password | 400, mensaje "Todos los campos son obligatorios" | Pendiente | Pendiente | Pendiente |
| TC-24 | Parte 6, control 7 | Admin autenticado, libro existente | archivo `.php` renombrado a `.jpg` | POST /library/admin/images/books/:id con ese archivo | Rechazado por firma binaria real (verifyRealImageType) | Pendiente | Pendiente | Pendiente |
| TC-25 | RF-09 | Admin autenticado | 2 autores seleccionados | Crear/editar libro con 2 checkboxes de autor | Ambos autores asociados en book_authors, independiente de géneros | Pendiente | Pendiente | Pendiente |
| TC-26 | RF-09 | Admin autenticado | 2 géneros seleccionados | Crear/editar libro con 2 checkboxes de género | Ambos géneros asociados en book_genres, independiente de autores | Pendiente | Pendiente | Pendiente |
| TC-27 | RF-10 | Libro con 2+ conceptos | 2 conceptos con definiciones distintas | Agregar concepto A y B con definiciones propias | Cada definición queda ligada solo a ese libro (mismo concepto, otro libro, otra definición) | Pendiente | Pendiente | Pendiente |
| TC-28 | RNF-01 (SQLi) | Usuario autenticado | `x' OR '1'='1` en buscador | GET /library/catalog?q=x'+OR+'1'='1 | 0 resultados; NO devuelve todos los libros | Pendiente | Pendiente | Pendiente |
| TC-29 | Parte 8 | Reverse proxy configurado | — | Abrir `https://ubiquitous.udem.edu/~iac-615639/library` en ventana privada | Misma app que en 127.0.0.1:<puerto>, sesión/formularios/imágenes funcionan | Pendiente | Pendiente | Pendiente |
| TC-30 | RNF-05 | Cualquier rol | — | Navegar catálogo → detalle → volver, y panel admin → subsecciones → volver | Todos los enlaces de vuelta funcionan, sin URLs rotas | Pendiente | Pendiente | Pendiente |

## Cobertura por categoría exigida

- Funcionales de login/logout/búsqueda/CRUD: TC-01 a TC-13.
- Autorización (visitante/registrado/administrador): TC-14, TC-15, TC-16.
- Negativas de base de datos y restricciones: TC-17 a TC-22.
- Validación de campos y archivos: TC-23, TC-24.
- Relaciones libro-autor, libro-género, libro-concepto: TC-25, TC-26, TC-27.
- Consulta SQL con caracteres especiales: TC-28.
- Despliegue mediante reverse proxy: TC-29.
- Navegación y usabilidad: TC-30.
