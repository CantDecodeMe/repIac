'use strict';

const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// RF-10: catálogo de conceptos + su definición específica por libro
// (book_concepts.definition puede variar entre libros — ver
// docs/NORMALIZATION_4FN.md).

async function listConcepts() {
  const { rows } = await pool.query('SELECT concept_id, name FROM concepts ORDER BY name');
  return rows;
}

async function createConcept(name) {
  try {
    const { rows } = await pool.query('INSERT INTO concepts (name) VALUES ($1) RETURNING concept_id', [name]);
    return rows[0].concept_id;
  } catch (err) {
    if (err.code === '23505') throw new AppError('Ese concepto ya existe.', 400);
    throw err;
  }
}

async function listBookConcepts(bookId) {
  const { rows } = await pool.query(
    `SELECT bc.concept_id, c.name, bc.definition, bc.reference_page
       FROM book_concepts bc JOIN concepts c ON c.concept_id = bc.concept_id
      WHERE bc.book_id = $1 ORDER BY c.name`,
    [bookId]
  );
  return rows;
}

async function addBookConcept(bookId, conceptId, definition, referencePage) {
  try {
    await pool.query(
      `INSERT INTO book_concepts (book_id, concept_id, definition, reference_page)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (book_id, concept_id) DO UPDATE SET definition = EXCLUDED.definition, reference_page = EXCLUDED.reference_page`,
      [bookId, conceptId, definition, referencePage || null]
    );
  } catch (err) {
    if (err.code === '23514') throw new AppError('La definición no puede estar vacía.', 400);
    throw err;
  }
}

async function removeBookConcept(bookId, conceptId) {
  await pool.query('DELETE FROM book_concepts WHERE book_id = $1 AND concept_id = $2', [bookId, conceptId]);
}

module.exports = { listConcepts, createConcept, listBookConcepts, addBookConcept, removeBookConcept };
