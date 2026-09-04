'use strict';

const express = require('express');
const { pool } = require('../../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [books, lowStock, users] = await Promise.all([
      pool.query('SELECT count(*)::int AS total FROM books'),
      pool.query('SELECT * FROM view_low_stock LIMIT 10'),
      pool.query('SELECT count(*)::int AS total FROM users'),
    ]);
    res.render('admin/dashboard', {
      title: 'Panel de administración',
      totalBooks: books.rows[0].total,
      totalUsers: users.rows[0].total,
      lowStock: lowStock.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
