-- 04_stored_procedures.sql
-- Ejecutar conectado a "library" con library_admin (dueño de los objetos);
-- se otorga EXECUTE a library_app al final del archivo.

-- ── sp_create_book: crea un libro y asocia autores/géneros en una sola
--    transacción (evita libros "huérfanos" si falla la asociación). ──────
CREATE OR REPLACE PROCEDURE sp_create_book(
  p_isbn TEXT, p_title TEXT, p_year INTEGER, p_price NUMERIC, p_stock INTEGER,
  p_format_id BIGINT, p_category_id BIGINT,
  p_author_ids BIGINT[], p_genre_ids BIGINT[],
  INOUT p_book_id BIGINT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO books (isbn, title, publication_year, price, stock, format_id, category_id)
  VALUES (p_isbn, p_title, p_year, p_price, p_stock, p_format_id, p_category_id)
  RETURNING book_id INTO p_book_id;

  INSERT INTO book_authors (book_id, author_id)
  SELECT p_book_id, a FROM unnest(p_author_ids) AS a
  ON CONFLICT DO NOTHING;

  INSERT INTO book_genres (book_id, genre_id)
  SELECT p_book_id, g FROM unnest(p_genre_ids) AS g
  ON CONFLICT DO NOTHING;
END;
$$;

COMMENT ON PROCEDURE sp_create_book IS
  'Crea un libro y asocia autores/géneros existentes en una sola transacción. Uso: CALL sp_create_book(...)';

-- ── sp_adjust_stock: ajusta stock con mensaje de negocio claro en vez de
--    depender solo del CHECK genérico de PostgreSQL. ─────────────────────
CREATE OR REPLACE PROCEDURE sp_adjust_stock(p_book_id BIGINT, p_delta INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  UPDATE books
     SET stock = stock + p_delta,
         updated_at = now()
   WHERE book_id = p_book_id
   RETURNING stock INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sp_adjust_stock: no existe el libro con book_id=%', p_book_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'sp_adjust_stock: el ajuste dejaría stock negativo (%) para book_id=%', v_new_stock, p_book_id
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

COMMENT ON PROCEDURE sp_adjust_stock IS
  'Incrementa o decrementa el stock de un libro; falla con mensaje claro si el resultado sería negativo.';

-- ── fn_register_user: alta de usuario con hash bcrypt centralizado (evita
--    que cualquier capa de la aplicación guarde contraseñas en texto plano
--    "por accidente"). Devuelve el user_id creado. ───────────────────────
CREATE OR REPLACE FUNCTION fn_register_user(p_name TEXT, p_email TEXT, p_plain_password TEXT, p_role TEXT DEFAULT 'registered')
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id BIGINT;
BEGIN
  INSERT INTO users (name, email, password_hash, role)
  VALUES (p_name, p_email, crypt(p_plain_password, gen_salt('bf')), p_role)
  RETURNING user_id INTO v_user_id;
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION fn_register_user IS
  'Alta de usuario con hash bcrypt generado en el servidor de BD; el rol admin queda bloqueado por trg_single_admin si ya existe uno.';

GRANT EXECUTE ON PROCEDURE sp_create_book(TEXT, TEXT, INTEGER, NUMERIC, INTEGER, BIGINT, BIGINT, BIGINT[], BIGINT[], BIGINT) TO library_app;
GRANT EXECUTE ON PROCEDURE sp_adjust_stock(BIGINT, INTEGER) TO library_app;
GRANT EXECUTE ON FUNCTION fn_register_user(TEXT, TEXT, TEXT, TEXT) TO library_app;
