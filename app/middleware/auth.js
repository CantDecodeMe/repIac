'use strict';

// Autenticación (¿quién eres?) y autorización (¿qué puedes hacer?) se
// mantienen como conceptos separados a propósito (ver
// docs/REQUIREMENTS.md RNF-01 y docs/SECURITY_REVIEW.md): estas funciones
// solo verifican, nunca deciden reglas de negocio.

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/library/auth/login');
  }
  return next();
}

function requireGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/library/catalog');
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/library/auth/login');
  }
  if (req.session.user.role !== 'admin') {
    // RF-13: acceso denegado controlado, nunca un error de servidor crudo.
    return res.status(403).render('errors/forbidden', { title: 'Acceso denegado' });
  }
  return next();
}

// Expone el usuario de sesión y mensajes flash de un solo uso a todas las
// vistas, sin que cada ruta tenga que pasarlos explícitamente.
function exposeUserToViews(req, res, next) {
  res.locals.currentUser = (req.session && req.session.user) || null;
  res.locals.flashError = (req.session && req.session.flashError) || null;
  if (req.session) delete req.session.flashError;
  next();
}

module.exports = { requireAuth, requireGuest, requireAdmin, exposeUserToViews };
