'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function registerUser({ name, email, password }) {
  const existing = await findByEmail(email);
  if (existing) {
    throw new AppError('Ese correo ya está registrado.', 400);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'registered')
     RETURNING user_id, name, email, role`,
    [name, email, passwordHash]
  );
  return rows[0];
}

async function verifyCredentials(email, password) {
  const user = await findByEmail(email);
  if (!user) {
    // RF-03: no se revela si falló el usuario o la contraseña.
    return null;
  }
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return null;
  }
  return { user_id: user.user_id, name: user.name, email: user.email, role: user.role };
}

module.exports = { registerUser, verifyCredentials, findByEmail };
