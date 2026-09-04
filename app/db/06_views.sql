-- 06_views.sql

-- ── view_catalog: listado de catálogo tal como lo consume la vista EJS de
--    catálogo (routes/catalog.js), evita repetir el JOIN/agregación en cada
--    consulta de listado y búsqueda. ─────────────────────────────────────
CREATE OR REPLACE VIEW view_catalog AS
SELECT
  b.book_id,
  b.isbn,
  b.title,
  b.publication_year,
  b.price,
  b.stock,
  f.name AS format_name,
  c.name AS category_name,
  (SELECT string_agg(a.full_name, ', ' ORDER BY a.full_name)
     FROM book_authors ba JOIN authors a ON a.author_id = ba.author_id
    WHERE ba.book_id = b.book_id) AS authors,
  (SELECT string_agg(g.name, ', ' ORDER BY g.name)
     FROM book_genres bg JOIN genres g ON g.genre_id = bg.genre_id
    WHERE bg.book_id = b.book_id) AS genres,
  (SELECT bi.file_path FROM book_images bi WHERE bi.book_id = b.book_id AND bi.is_cover LIMIT 1) AS cover_path
FROM books b
LEFT JOIN formats f ON f.format_id = b.format_id
LEFT JOIN categories c ON c.category_id = b.category_id;

COMMENT ON VIEW view_catalog IS 'Catálogo listo para renderizar: un libro por fila con autores/géneros ya concatenados y su portada.';

-- ── view_admin_books: igual que view_catalog pero pensada para las
--    pantallas de administración (incluye timestamps de auditoría). ──────
CREATE OR REPLACE VIEW view_admin_books AS
SELECT v.*, b.created_at, b.updated_at
FROM view_catalog v
JOIN books b ON b.book_id = v.book_id;

-- ── view_low_stock: apoyo para el dashboard de Administrador. ──────────
CREATE OR REPLACE VIEW view_low_stock AS
SELECT book_id, isbn, title, stock
FROM books
WHERE stock < 5
ORDER BY stock ASC;

GRANT SELECT ON view_catalog, view_admin_books, view_low_stock TO library_app;
