'use strict';

const express = require('express');
const conceptService = require('../../services/conceptService');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await conceptService.listConcepts();
    res.render('admin/concepts/list', { title: 'Conceptos', items, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    await conceptService.createConcept(req.body.name);
    res.redirect('/library/admin/concepts');
  } catch (err) {
    if (err instanceof AppError) {
      const items = await conceptService.listConcepts();
      return res.status(err.statusCode).render('admin/concepts/list', { title: 'Conceptos', items, error: err.message });
    }
    next(err);
  }
});

// RF-10: definición de un concepto específica para un libro.
router.post('/books/:bookId', async (req, res, next) => {
  try {
    await conceptService.addBookConcept(
      Number(req.params.bookId),
      Number(req.body.conceptId),
      req.body.definition,
      req.body.referencePage ? Number(req.body.referencePage) : null
    );
    res.redirect(`/library/admin/books/${req.params.bookId}/edit`);
  } catch (err) {
    if (err instanceof AppError) {
      req.session.flashError = err.message;
      return res.redirect(`/library/admin/books/${req.params.bookId}/edit`);
    }
    next(err);
  }
});

router.post('/books/:bookId/:conceptId/delete', async (req, res, next) => {
  try {
    await conceptService.removeBookConcept(Number(req.params.bookId), Number(req.params.conceptId));
    res.redirect(`/library/admin/books/${req.params.bookId}/edit`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
