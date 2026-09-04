'use strict';

const { Pool } = require('pg');

// Único punto de creación del pool de conexión a PostgreSQL. Ningún otro
// archivo del proyecto debe llamar a `new Pool()` ni abrir su propia
// conexión — así se centraliza timeouts, límites y manejo de errores de
// conexión (ver ENGINEERING_DECISIONS.md, D-02).
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Conexión perdida en una sesión inactiva del pool: se registra en el
  // log del servidor, nunca se propaga como error HTTP a un usuario.
  console.error('[db] error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = { pool };
