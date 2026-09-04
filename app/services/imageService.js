'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// RF-11: alta de imagen ya validada (extensión/MIME real/tamaño en
// middleware/upload.js) — aquí solo se guarda la referencia en BD. Marcar
// como portada se delega al trigger trg_book_images_single_cover
// (05_triggers.sql), que desmarca cualquier portada previa del mismo libro.
async function addImage(bookId, storedFilename, altText, isCover) {
  const { rows } = await pool.query(
    `INSERT INTO book_images (book_id, file_path, alt_text, is_cover)
     VALUES ($1, $2, $3, $4) RETURNING image_id`,
    [bookId, `/library/uploads/${storedFilename}`, altText || null, Boolean(isCover)]
  );
  return rows[0].image_id;
}

async function setCover(bookId, imageId) {
  const { rowCount } = await pool.query(
    'UPDATE book_images SET is_cover = true WHERE image_id = $1 AND book_id = $2',
    [imageId, bookId]
  );
  if (!rowCount) {
    throw new AppError('La imagen indicada no pertenece a este libro.', 404);
  }
}

async function deleteImage(bookId, imageId) {
  const { rows } = await pool.query(
    'DELETE FROM book_images WHERE image_id = $1 AND book_id = $2 RETURNING file_path',
    [imageId, bookId]
  );
  const deleted = rows[0];
  if (!deleted) return;

  // Solo se borra del disco si la ruta apunta dentro de uploads/ (defensa
  // en profundidad: nunca confiar en que file_path no pudo ser manipulado).
  const absolutePath = path.join(UPLOADS_DIR, path.basename(deleted.file_path));
  fs.promises.unlink(absolutePath).catch(() => {
    /* el archivo puede no existir físicamente (dato de seed); no es un error de negocio */
  });
}

module.exports = { addImage, setCover, deleteImage };
