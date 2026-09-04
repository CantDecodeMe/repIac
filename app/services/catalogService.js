'use strict';

const { pool } = require('../config/db');

const PAGE_SIZE = 12;

// RF-04/RF-05: listado paginado + búsqueda por ISBN exacto o título parcial.
// Usa la vista view_catalog (06_views.sql) para no repetir el JOIN/agregación.
async function listCatalog({ page = 1, search = '' } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const offset = (safePage - 1) * PAGE_SIZE;
  const term = search.trim();

  const params = [];
  let where = '';
  if (term) {
    params.push(term, `%${term}%`);
    where = `WHERE isbn = $1 OR title ILIKE $2`;
  }

  const countResult = await pool.query(`SELECT count(*)::int AS total FROM view_catalog ${where}`, params);
  const total = countResult.rows[0].total;

  params.push(PAGE_SIZE, offset);
  const listResult = await pool.query(
    `SELECT * FROM view_catalog ${where} ORDER BY title LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    books: listResult.rows,
    page: safePage,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

async function getBookDetail(bookId) {
  const bookResult = await pool.query('SELECT * FROM view_admin_books WHERE book_id = $1', [bookId]);
  const book = bookResult.rows[0];
  if (!book) return null;

  const conceptsResult = await pool.query(
    `SELECT c.concept_id, c.name AS concept, bc.definition, bc.reference_page
       FROM book_concepts bc JOIN concepts c ON c.concept_id = bc.concept_id
      WHERE bc.book_id = $1
      ORDER BY c.name`,
    [bookId]
  );

  const imagesResult = await pool.query(
    `SELECT image_id, file_path, alt_text, is_cover
       FROM book_images WHERE book_id = $1
       ORDER BY is_cover DESC, image_id ASC`,
    [bookId]
  );

  return { book, concepts: conceptsResult.rows, images: imagesResult.rows };
}

module.exports = { listCatalog, getBookDetail, PAGE_SIZE };
