'use strict';

const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function listAuthorsAndGenres() {
  const [authors, genres, formats, categories] = await Promise.all([
    pool.query('SELECT author_id, full_name FROM authors ORDER BY full_name'),
    pool.query('SELECT genre_id, name FROM genres ORDER BY name'),
    pool.query('SELECT format_id, name FROM formats ORDER BY name'),
    pool.query('SELECT category_id, name FROM categories ORDER BY name'),
  ]);
  return {
    authors: authors.rows,
    genres: genres.rows,
    formats: formats.rows,
    categories: categories.rows,
  };
}

function toIdArray(value) {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map(Number).filter((n) => Number.isInteger(n));
}

// RF-07/RF-09: crea un libro y sus asociaciones N:M en una sola transacción
// vía el stored procedure sp_create_book (04_stored_procedures.sql).
async function createBook(input) {
  const authorIds = toIdArray(input.authorIds);
  const genreIds = toIdArray(input.genreIds);

  try {
    const { rows } = await pool.query(
      `CALL sp_create_book($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL)`,
      [
        input.isbn,
        input.title,
        input.publicationYear || null,
        input.price,
        input.stock || 0,
        input.formatId || null,
        input.categoryId || null,
        authorIds,
        genreIds,
      ]
    );
    return rows[0].p_book_id;
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Ya existe un libro con ese ISBN.', 400);
    }
    if (err.code === '23514') {
      throw new AppError('Precio o stock inválidos (el precio debe ser mayor a 0 y el stock no puede ser negativo).', 400);
    }
    throw err;
  }
}

async function updateBook(bookId, input) {
  const authorIds = toIdArray(input.authorIds);
  const genreIds = toIdArray(input.genreIds);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE books SET title=$1, publication_year=$2, price=$3, stock=$4,
              format_id=$5, category_id=$6
        WHERE book_id=$7`,
      [input.title, input.publicationYear || null, input.price, input.stock || 0,
       input.formatId || null, input.categoryId || null, bookId]
    );
    await client.query('DELETE FROM book_authors WHERE book_id = $1', [bookId]);
    await client.query('DELETE FROM book_genres WHERE book_id = $1', [bookId]);
    if (authorIds.length) {
      await client.query(
        `INSERT INTO book_authors (book_id, author_id) SELECT $1, a FROM unnest($2::bigint[]) AS a`,
        [bookId, authorIds]
      );
    }
    if (genreIds.length) {
      await client.query(
        `INSERT INTO book_genres (book_id, genre_id) SELECT $1, g FROM unnest($2::bigint[]) AS g`,
        [bookId, genreIds]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23514') {
      throw new AppError('Precio o stock inválidos.', 400);
    }
    throw err;
  } finally {
    client.release();
  }
}

async function deleteBook(bookId) {
  await pool.query('DELETE FROM books WHERE book_id = $1', [bookId]);
}

async function adjustStock(bookId, delta) {
  try {
    await pool.query('CALL sp_adjust_stock($1, $2)', [bookId, delta]);
  } catch (err) {
    // sp_adjust_stock usa RAISE EXCEPTION ... USING ERRCODE = 'check_violation',
    // que PostgreSQL traduce al SQLSTATE 23514.
    if (err.code === '23514') {
      throw new AppError('Ese ajuste dejaría el stock en negativo.', 400);
    }
    if (err.code === 'P0002') {
      throw new AppError('El libro indicado no existe.', 404);
    }
    throw err;
  }
}

module.exports = { listAuthorsAndGenres, createBook, updateBook, deleteBook, adjustStock };
