'use strict';

const express = require('express');
const entitiesService = require('../../services/catalogEntitiesService');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router({ mergeParams: true });

// RF-08: CRUD de catálogos independientes (autores, géneros, formatos,
// categorías) montado una sola vez con :entity en la URL, validado contra
// la lista blanca en services/catalogEntitiesService.js.
router.param('entity', (req, res, next, entityKey) => {
  try {
    req.entityConfig = entitiesService.getEntityConfig(entityKey);
    req.entityKey = entityKey;
    next();
  } catch (err) {
    next(err);
  }
});

router.get('/:entity', async (req, res, next) => {
  try {
    const items = await entitiesService.list(req.entityKey);
    res.render('admin/entities/list', { title: req.entityConfig.label + 's', items, entityKey: req.entityKey, entityConfig: req.entityConfig, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/:entity', async (req, res, next) => {
  try {
    await entitiesService.create(req.entityKey, { name: req.body.name, bio: req.body.bio });
    res.redirect(`/library/admin/catalogs/${req.entityKey}`);
  } catch (err) {
    if (err instanceof AppError) {
      const items = await entitiesService.list(req.entityKey);
      return res.status(err.statusCode).render('admin/entities/list', { title: req.entityConfig.label + 's', items, entityKey: req.entityKey, entityConfig: req.entityConfig, error: err.message });
    }
    next(err);
  }
});

router.post('/:entity/:id/update', async (req, res, next) => {
  try {
    await entitiesService.update(req.entityKey, Number(req.params.id), { name: req.body.name, bio: req.body.bio });
    res.redirect(`/library/admin/catalogs/${req.entityKey}`);
  } catch (err) {
    next(err);
  }
});

router.post('/:entity/:id/delete', async (req, res, next) => {
  try {
    await entitiesService.remove(req.entityKey, Number(req.params.id));
    res.redirect(`/library/admin/catalogs/${req.entityKey}`);
  } catch (err) {
    if (err instanceof AppError) {
      req.session.flashError = err.message;
      return res.redirect(`/library/admin/catalogs/${req.entityKey}`);
    }
    next(err);
  }
});

module.exports = router;
