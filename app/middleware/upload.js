'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const { AppError } = require('./errorHandler');

// Validación de subida de imágenes (Parte 5, punto 16 y Parte 6):
// - extensión Y tipo MIME real permitido (jpg/jpeg, png, webp)
// - tamaño máximo (MAX_UPLOAD_BYTES)
// - el nombre en disco lo genera el servidor; NUNCA se usa el nombre
//   original enviado por el usuario (evita path traversal / colisiones /
//   ejecución de un archivo con nombre malicioso).

const ALLOWED_MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename(req, file, cb) {
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype];
    const generatedName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, generatedName);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
    return cb(new AppError('Formato de imagen no permitido. Usa JPG, PNG o WebP.', 400));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024),
    files: 1,
  },
});

// `file.mimetype` es el Content-Type que declaró el navegador: un atacante
// puede mandarlo falso. Se verifica el tipo REAL leyendo los primeros bytes
// del archivo ya guardado (firma binaria), como pide explícitamente la
// Parte 6 ("validación server-side... aunque exista validación
// HTML/JavaScript"). Si no coincide, se borra el archivo y se rechaza.
function verifyRealImageType(filePath, declaredMimetype) {
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  const matchesDeclared =
    (declaredMimetype === 'image/jpeg' && isJpeg) ||
    (declaredMimetype === 'image/png' && isPng) ||
    (declaredMimetype === 'image/webp' && isWebp);

  if (!matchesDeclared) {
    fs.unlinkSync(filePath);
    throw new AppError('El archivo subido no es una imagen válida del tipo declarado.', 400);
  }
}

module.exports = { upload, verifyRealImageType };
