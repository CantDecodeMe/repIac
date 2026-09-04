'use strict';

// Manejador de errores centralizado (RNF-07 / Parte 6, control "mensajes de
// error controlados"): el detalle técnico se registra en el log del
// servidor; el usuario final SIEMPRE recibe un mensaje genérico, nunca un
// stack trace ni el texto de una consulta SQL.

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isAppError = true;
  }
}

function notFoundHandler(req, res) {
  res.status(404).render('errors/not-found', { title: 'No encontrado' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // multer (subida de archivos) reporta sus propios errores controlados
  // (tamaño excedido, demasiados archivos, etc.) como MulterError.
  if (err.name === 'MulterError') {
    console.warn(`[upload] ${req.method} ${req.originalUrl} -> ${err.code}`);
    return res.status(400).render('errors/generic', {
      title: 'Error',
      message: 'No se pudo subir el archivo (tamaño u cantidad no permitida).',
    });
  }

  const statusCode = err.isAppError ? err.statusCode : 500;

  console.error(
    `[error] ${req.method} ${req.originalUrl} -> ${statusCode}:`,
    err.isAppError ? err.message : err
  );

  const message = err.isAppError
    ? err.message
    : 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';

  res.status(statusCode).render('errors/generic', { title: 'Error', message });
}

module.exports = { AppError, notFoundHandler, errorHandler };
