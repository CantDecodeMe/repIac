'use strict';

const express = require('express');
const { pool } = require('../../config/db');
const bookService = require('../../services/bookService');
const catalogService = require('../../services/catalogService');
const conceptService = require('../../services/conceptService');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await catalogService.listCatalog({ page: req.query.page, search: req.query.q });
    res.render('admin/books/list', { title: 'Administrar libros', ...result, search: req.query.q || '' });
  } catch (err) {
    next(err);
  }
});

router.get('/new', async (req, res, next) => {
  try {
    const lists = await bookService.listAuthorsAndGenres();
    res.render('admin/books/form', { title: 'Nuevo libro', book: null, error: null, ...lists });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const bookId = await bookService.createBook({
      isbn: req.body.isbn,
      title: req.body.title,
      publicationYear: req.body.publicationYear ? Number(req.body.publicationYear) : null,
      price: Number(req.body.price),
      stock: Number(req.body.stock || 0),
      formatId: req.body.formatId ? Number(req.body.formatId) : null,
      categoryId: req.body.categoryId ? Number(req.body.categoryId) : null,
      authorIds: req.body.authorIds,
      genreIds: req.body.genreIds,
    });
    res.redirect(`/library/admin/books/${bookId}/edit`);
  } catch (err) {
    if (err instanceof AppError) {
      const lists = await bookService.listAuthorsAndGenres();
      return res.status(err.statusCode).render('admin/books/form', { title: 'Nuevo libro', book: req.body, error: err.message, ...lists });
    }
    next(err);
  }
});

router.get('/:id/edit', async (req, res, next) => {
  try {
    const bookId = Number(req.params.id);
    const [detail, lists, allConcepts] = await Promise.all([
      catalogService.getBookDetail(bookId),
      bookService.listAuthorsAndGenres(),
      conceptService.listConcepts(),
    ]);
    if (!detail) return res.status(404).render('errors/not-found', { title: 'Libro no encontrado' });

    const selectedAuthors = await pool.query('SELECT author_id FROM book_authors WHERE book_id = $1', [bookId]);
    const selectedGenres = await pool.query('SELECT genre_id FROM book_genres WHERE book_id = $1', [bookId]);

    res.render('admin/books/form', {
      title: `Editar: ${detail.book.title}`,
      book: detail.book,
      error: null,
      selectedAuthorIds: selectedAuthors.rows.map((r) => r.author_id),
      selectedGenreIds: selectedGenres.rows.map((r) => r.genre_id),
      images: detail.images,
      concepts: detail.concepts,
      allConcepts,
      ...lists,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id', async (req, res, next) => {
  try {
    const bookId = Number(req.params.id);
    await bookService.updateBook(bookId, {
      title: req.body.title,
      publicationYear: req.body.publicationYear ? Number(req.body.publicationYear) : null,
      price: Number(req.body.price),
      stock: Number(req.body.stock || 0),
      formatId: req.body.formatId ? Number(req.body.formatId) : null,
      categoryId: req.body.categoryId ? Number(req.body.categoryId) : null,
      authorIds: req.body.authorIds,
      genreIds: req.body.genreIds,
    });
    res.redirect(`/library/admin/books/${bookId}/edit`);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/delete', async (req, res, next) => {
  try {
    await bookService.deleteBook(Number(req.params.id));
    res.redirect('/library/admin/books');
  } catch (err) {
    next(err);
  }
});

// RF-12: ajuste de stock independiente del resto de los campos.
router.post('/:id/stock', async (req, res, next) => {
  try {
    const delta = Number(req.body.delta);
    await bookService.adjustStock(Number(req.params.id), delta);
    res.redirect(`/library/admin/books/${req.params.id}/edit`);
  } catch (err) {
    if (err instanceof AppError) {
      req.session.flashError = err.message;
      return res.redirect(`/library/admin/books/${req.params.id}/edit`);
    }
    next(err);
  }
});

module.exports = router;
