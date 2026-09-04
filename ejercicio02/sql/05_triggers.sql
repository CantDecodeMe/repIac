-- 05_triggers.sql

-- ── trg_single_admin: bloquea explícitamente un segundo Administrador con
--    un mensaje de negocio claro. El índice único parcial
--    ux_users_single_admin (01_schema.sql) ya lo impide a nivel de dato;
--    este trigger es la capa que da un error entendible en vez de solo
--    "duplicate key value violates unique constraint". ──────────────────
CREATE OR REPLACE FUNCTION fn_prevent_second_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'admin' AND EXISTS (
    SELECT 1 FROM users
     WHERE role = 'admin'
       AND user_id <> COALESCE(NEW.user_id, -1)
  ) THEN
    RAISE EXCEPTION 'Ya existe un Administrador; el sistema permite exactamente uno.'
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_admin
  BEFORE INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_second_admin();

-- ── trg_books_touch_updated_at: mantiene updated_at correcto sin depender
--    de que cada UPDATE en services/ lo recuerde escribir. ──────────────
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_books_touch_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION fn_touch_updated_at();

-- ── trg_book_images_single_cover: si se inserta o actualiza una imagen
--    marcándola como portada, automáticamente desmarca cualquier otra
--    portada previa del mismo libro (en vez de fallar contra el índice
--    único parcial ux_book_images_one_cover). ───────────────────────────
CREATE OR REPLACE FUNCTION fn_enforce_single_cover()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_cover THEN
    UPDATE book_images
       SET is_cover = false
     WHERE book_id = NEW.book_id
       AND image_id <> COALESCE(NEW.image_id, -1)
       AND is_cover;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_book_images_single_cover
  BEFORE INSERT OR UPDATE OF is_cover ON book_images
  FOR EACH ROW
  EXECUTE FUNCTION fn_enforce_single_cover();
