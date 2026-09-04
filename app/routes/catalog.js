'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const catalogService = require('../services/catalogService');

const router = express.Router();

// RF-04/RF-05: solo un usuario autenticado puede ver el catálogo.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await catalogService.listCatalog({ page: req.query.page, search: req.query.q });
    res.render('catalog/index', { title: 'Catálogo', ...result, search: req.query.q || '' });
  } catch (err) {
    next(err);
  }
});

// RF-06: detalle con autores, géneros, conceptos e imágenes.
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const detail = await catalogService.getBookDetail(Number(req.params.id));
    if (!detail) {
      return res.status(404).render('errors/not-found', { title: 'Libro no encontrado' });
    }
    res.render('catalog/detail', { title: detail.book.title, ...detail });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
