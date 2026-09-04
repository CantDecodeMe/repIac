-- 03_all_queries_before_stored_procedures.sql
--
-- Consultas parametrizadas validadas manualmente con psql ANTES de
-- envolverlas en stored procedures (04) o exponerlas en services/*.js.
-- Aquí los parámetros se escriben como literales para poder ejecutarlas
-- directo en psql; en el código Node.js las mismas consultas se llaman con
-- $1, $2… vía el driver `pg` (nunca concatenación de strings).
--
-- La segunda mitad del archivo son las PRUEBAS NEGATIVAS DE INTEGRIDAD
-- exigidas por la Parte 3, punto 8 del enunciado: para cada una se deja la
-- sentencia ejecutada, el resultado esperado y — una vez corridas de verdad
-- contra el clúster real (Checkpoint G, con el usuario) — el error real que
-- devolvió PostgreSQL. Mientras no se han corrido en vivo, el campo
-- "Resultado real" queda marcado como PENDIENTE.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Consultas de lectura (catálogo, búsqueda, detalle)
-- ═══════════════════════════════════════════════════════════════════════

-- 1.1 Listado de catálogo, paginado, con autor(es) concatenados y portada.
SELECT
  b.book_id, b.isbn, b.title, b.price, b.stock,
  f.name  AS format_name,
  c.name  AS category_name,
  string_agg(DISTINCT a.full_name, ', ' ORDER BY a.full_name) AS authors,
  (SELECT file_path FROM book_images bi WHERE bi.book_id = b.book_id AND bi.is_cover LIMIT 1) AS cover_path
FROM books b
LEFT JOIN formats f ON f.format_id = b.format_id
LEFT JOIN categories c ON c.category_id = b.category_id
LEFT JOIN book_authors ba ON ba.book_id = b.book_id
LEFT JOIN authors a ON a.author_id = ba.author_id
GROUP BY b.book_id, f.name, c.name
ORDER BY b.title
LIMIT 20 OFFSET 0;

-- 1.2 Búsqueda por ISBN exacto.
SELECT book_id, isbn, title FROM books WHERE isbn = '978-0-EJ02-0021';

-- 1.3 Búsqueda por título, insensible a mayúsculas/acentos (unaccent opcional).
SELECT book_id, isbn, title FROM books WHERE lower(title) LIKE lower('%cien años%');

-- 1.4 Detalle completo de un libro: autores, géneros, conceptos, imágenes.
SELECT b.*,
  (SELECT array_agg(a.full_name) FROM book_authors ba JOIN authors a ON a.author_id = ba.author_id WHERE ba.book_id = b.book_id) AS authors,
  (SELECT array_agg(g.name) FROM book_genres bg JOIN genres g ON g.genre_id = bg.genre_id WHERE bg.book_id = b.book_id) AS genres
FROM books b WHERE b.book_id = 1;

SELECT c.name AS concept, bc.definition, bc.reference_page
FROM book_concepts bc JOIN concepts c ON c.concept_id = bc.concept_id
WHERE bc.book_id = 1 ORDER BY c.name;

SELECT image_id, file_path, alt_text, is_cover FROM book_images WHERE book_id = 1 ORDER BY is_cover DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Consultas de escritura representativas (CRUD)
-- ═══════════════════════════════════════════════════════════════════════

-- 2.1 Crear libro.
INSERT INTO books (isbn, title, publication_year, price, stock, format_id, category_id)
VALUES ('978-0-EJ02-9001', 'Libro de prueba', 2024, 199.00, 5,
        (SELECT format_id FROM formats LIMIT 1), (SELECT category_id FROM categories LIMIT 1))
RETURNING book_id;

-- 2.2 Actualizar precio y stock de forma independiente al resto de campos.
UPDATE books SET price = 219.00, stock = stock - 1, updated_at = now() WHERE book_id = 1;

-- 2.3 Asociar autor y género a un libro (multivaluado, independiente entre sí).
INSERT INTO book_authors (book_id, author_id) VALUES (1, 2) ON CONFLICT DO NOTHING;
INSERT INTO book_genres  (book_id, genre_id)  VALUES (1, 3) ON CONFLICT DO NOTHING;

-- 2.4 Eliminar un libro (las tablas puente e imágenes se eliminan en cascada
--     por ON DELETE CASCADE; los catálogos NUNCA se eliminan en cascada).
DELETE FROM books WHERE book_id = (SELECT book_id FROM books WHERE isbn = '978-0-EJ02-9001');

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Prueba de parametrización con caracteres especiales (Tarea 2b)
-- ═══════════════════════════════════════════════════════════════════════
-- Ejecutada tal cual desde Node con pg (parámetro $1), NUNCA concatenada.
-- Aquí se simula el valor recibido de un formulario que intenta una
-- inyección clásica; con consulta parametrizada debe tratarse como texto
-- literal de búsqueda (0 filas), nunca alterar la sentencia.
--
-- Equivalente Node: pool.query('SELECT * FROM books WHERE title = $1', [input])
PREPARE buscar_titulo_exacto (text) AS SELECT book_id, title FROM books WHERE title = $1;
EXECUTE buscar_titulo_exacto('x'' OR ''1''=''1');
DEALLOCATE buscar_titulo_exacto;
-- Resultado esperado: 0 filas (el string completo, comillas incluidas, se
-- busca como título literal). Si esto alguna vez devolviera todas las filas
-- de `books`, sería evidencia de una inyección SQL real en el código Node.

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Pruebas negativas de integridad (Parte 3, punto 8)
-- ═══════════════════════════════════════════════════════════════════════
-- Formato por prueba: sentencia → resultado esperado → resultado real.
-- El "resultado real" se completa corriendo esto en el clúster ya
-- desplegado (Checkpoint G); mientras tanto queda como PENDIENTE.

-- 4.1 ISBN duplicado
-- Sentencia:
--   INSERT INTO books (isbn, title, price) VALUES ('978-0-EJ02-0001', 'Duplicado', 100);
-- Resultado esperado: falla por violar `books_isbn_key` (UNIQUE).
-- Resultado real: PENDIENTE (ver docs/DEPLOYMENT_UBIQUITOUS.md / TEST_PLAN.md)

-- 4.2 Stock negativo
-- Sentencia:
--   UPDATE books SET stock = -5 WHERE book_id = 1;
-- Resultado esperado: falla por CHECK (stock >= 0).
-- Resultado real: PENDIENTE

-- 4.3 Precio inválido (cero o negativo)
-- Sentencia:
--   UPDATE books SET price = 0 WHERE book_id = 1;
-- Resultado esperado: falla por CHECK (price > 0).
-- Resultado real: PENDIENTE

-- 4.4 FK inexistente
-- Sentencia:
--   INSERT INTO book_authors (book_id, author_id) VALUES (1, 999999);
-- Resultado esperado: falla por violar la FK hacia `authors`.
-- Resultado real: PENDIENTE

-- 4.5 Eliminación que viola una relación (autor con libros asociados)
-- Sentencia:
--   DELETE FROM authors WHERE author_id = (SELECT author_id FROM authors WHERE full_name = 'Gabriel García Márquez');
-- Resultado esperado: falla por ON DELETE RESTRICT en book_authors.author_id.
-- Resultado real: PENDIENTE

-- 4.6 Creación de un segundo Administrador
-- Sentencia:
--   INSERT INTO users (name, email, password_hash, role)
--   VALUES ('Segundo Admin', 'admin2@libreria.udem.edu', crypt('x', gen_salt('bf')), 'admin');
-- Resultado esperado: falla por violar el índice único parcial
--   ux_users_single_admin, y adicionalmente por el trigger
--   trg_single_admin (05_triggers.sql) con un mensaje explícito.
-- Resultado real: PENDIENTE
