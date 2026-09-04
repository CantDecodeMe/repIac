'use strict';

const express = require('express');
const { upload, verifyRealImageType } = require('../../middleware/upload');
const imageService = require('../../services/imageService');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.post('/books/:bookId', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Selecciona una imagen para subir.', 400);
    }
    verifyRealImageType(req.file.path, req.file.mimetype);
    await imageService.addImage(
      Number(req.params.bookId),
      req.file.filename,
      req.body.altText,
      req.body.isCover === 'on'
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

router.post('/books/:bookId/:imageId/cover', async (req, res, next) => {
  try {
    await imageService.setCover(Number(req.params.bookId), Number(req.params.imageId));
    res.redirect(`/library/admin/books/${req.params.bookId}/edit`);
  } catch (err) {
    next(err);
  }
});

router.post('/books/:bookId/:imageId/delete', async (req, res, next) => {
  try {
    await imageService.deleteImage(Number(req.params.bookId), Number(req.params.imageId));
    res.redirect(`/library/admin/books/${req.params.bookId}/edit`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
