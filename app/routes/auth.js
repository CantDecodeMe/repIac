'use strict';

const express = require('express');
const { requireGuest } = require('../middleware/auth');
const authService = require('../services/authService');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', { title: 'Iniciar sesión', error: null });
});

router.post('/login', requireGuest, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).render('auth/login', { title: 'Iniciar sesión', error: 'Correo y contraseña son obligatorios.' });
    }
    const user = await authService.verifyCredentials(email.trim().toLowerCase(), password);
    if (!user) {
      // RF-03: mensaje genérico, no revela cuál campo falló.
      return res.status(401).render('auth/login', { title: 'Iniciar sesión', error: 'Correo o contraseña incorrectos.' });
    }
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = user;
      const redirectTo = req.session.returnTo || '/library/catalog';
      delete req.session.returnTo;
      res.redirect(redirectTo);
    });
  } catch (err) {
    next(err);
  }
});

router.get('/register', requireGuest, (req, res) => {
  res.render('auth/register', { title: 'Crear cuenta', error: null });
});

router.post('/register', requireGuest, async (req, res, next) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;
    if (!name || !email || !password) {
      return res.status(400).render('auth/register', { title: 'Crear cuenta', error: 'Todos los campos son obligatorios.' });
    }
    if (password.length < 8) {
      return res.status(400).render('auth/register', { title: 'Crear cuenta', error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (password !== passwordConfirm) {
      return res.status(400).render('auth/register', { title: 'Crear cuenta', error: 'Las contraseñas no coinciden.' });
    }
    await authService.registerUser({ name: name.trim(), email: email.trim().toLowerCase(), password });
    res.redirect('/library/auth/login');
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).render('auth/register', { title: 'Crear cuenta', error: err.message });
    }
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('library.sid');
    res.redirect('/library/auth/login');
  });
});

module.exports = router;
