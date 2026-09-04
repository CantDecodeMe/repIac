-- 01_schema.sql — Esquema 4FN completo con restricciones de integridad.
-- Ejecutar conectado a la base "library" con el rol library_admin:
--   psql -h 127.0.0.1 -p "$PGCLUSTER_PORT" -U library_admin -d library -f db/01_schema.sql
--
-- Ver app/docs/NORMALIZATION_4FN.md para la justificación de cada tabla y
-- app/docs/DB_DESIGN_ER_4FN.png para el diagrama.

BEGIN;

-- Necesario para generar hashes de contraseña compatibles con bcrypt
-- directamente en el seed de datos (crypt(..., gen_salt('bf'))).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Catálogos ────────────────────────────────────────────────────────────

CREATE TABLE authors (
  author_id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  bio       TEXT
);

CREATE TABLE genres (
  genre_id BIGSERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE
);

CREATE TABLE formats (
  format_id BIGSERIAL PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE
);

CREATE TABLE categories (
  category_id BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE
);

CREATE TABLE concepts (
  concept_id BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE
);

-- ── Usuarios ─────────────────────────────────────────────────────────────

CREATE TABLE users (
  user_id       BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('registered', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Regla de negocio "un solo Administrador" reforzada a nivel de dato
-- (además de un trigger explícito en 05_triggers.sql que da un mensaje claro).
CREATE UNIQUE INDEX ux_users_single_admin ON users ((role)) WHERE role = 'admin';

-- ── Libros ───────────────────────────────────────────────────────────────

CREATE TABLE books (
  book_id          BIGSERIAL PRIMARY KEY,
  isbn             TEXT NOT NULL UNIQUE CHECK (length(btrim(isbn)) BETWEEN 10 AND 20),
  title            TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  -- Rango amplio a propósito: una librería también cataloga obras clásicas
  -- de la Antigüedad (p. ej. "El arte de la guerra", "Meditaciones").
  publication_year INTEGER CHECK (publication_year BETWEEN -3000 AND 2100),
  price            NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  format_id        BIGINT REFERENCES formats (format_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  category_id      BIGINT REFERENCES categories (category_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_books_title_lower ON books (lower(title));

-- ── Relaciones multivaluadas (4FN: cada una independiente de las demás) ──

CREATE TABLE book_authors (
  book_id   BIGINT NOT NULL REFERENCES books (book_id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES authors (author_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  PRIMARY KEY (book_id, author_id)
);

CREATE TABLE book_genres (
  book_id  BIGINT NOT NULL REFERENCES books (book_id) ON DELETE CASCADE,
  genre_id BIGINT NOT NULL REFERENCES genres (genre_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  PRIMARY KEY (book_id, genre_id)
);

-- La definición de un concepto depende de la relación libro-concepto, no
-- del concepto en sí (el mismo concepto puede definirse distinto según el
-- libro donde aparece) — ver NORMALIZATION_4FN.md.
CREATE TABLE book_concepts (
  book_id        BIGINT NOT NULL REFERENCES books (book_id) ON DELETE CASCADE,
  concept_id     BIGINT NOT NULL REFERENCES concepts (concept_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  definition     TEXT NOT NULL CHECK (length(btrim(definition)) > 0),
  reference_page INTEGER CHECK (reference_page IS NULL OR reference_page > 0),
  PRIMARY KEY (book_id, concept_id)
);

CREATE TABLE book_images (
  image_id    BIGSERIAL PRIMARY KEY,
  book_id     BIGINT NOT NULL REFERENCES books (book_id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  alt_text    TEXT,
  is_cover    BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Como máximo una portada por libro.
CREATE UNIQUE INDEX ux_book_images_one_cover ON book_images (book_id) WHERE is_cover;
CREATE INDEX ix_book_images_book_id ON book_images (book_id);

COMMIT;

-- ── Privilegios mínimos para el rol de aplicación ───────────────────────
-- La aplicación Node.js se conecta únicamente como `library_app`, que NUNCA
-- es superusuario ni dueño de las tablas (esas son de `library_admin`).

GRANT USAGE ON SCHEMA public TO library_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO library_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO library_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO library_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO library_app;
