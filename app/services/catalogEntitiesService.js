'use strict';

const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// CRUD genérico para los catálogos simples (autores, géneros, formatos,
// categorías): todos comparten la forma (id, name[, bio]). Se usa una
// LISTA BLANCA fija de tablas/columnas — el nombre de tabla JAMÁS se arma
// con texto que venga del usuario o de la URL sin pasar por este mapa, lo
// que evita SQL injection por identificador (algo que los parámetros $1/$2
// no protegen, porque no aplican a nombres de tabla/columna).
const ENTITIES = {
  authors: { table: 'authors', idCol: 'author_id', nameCol: 'full_name', hasBio: true, label: 'Autor' },
  genres: { table: 'genres', idCol: 'genre_id', nameCol: 'name', hasBio: false, label: 'Género' },
  formats: { table: 'formats', idCol: 'format_id', nameCol: 'name', hasBio: false, label: 'Formato' },
  categories: { table: 'categories', idCol: 'category_id', nameCol: 'name', hasBio: false, label: 'Categoría' },
};

function getEntityConfig(entityKey) {
  const config = ENTITIES[entityKey];
  if (!config) {
    throw new AppError('Catálogo no reconocido.', 404);
  }
  return config;
}

async function list(entityKey) {
  const { table, idCol, nameCol } = getEntityConfig(entityKey);
  const { rows } = await pool.query(`SELECT ${idCol} AS id, ${nameCol} AS name FROM ${table} ORDER BY ${nameCol}`);
  return rows;
}

async function create(entityKey, data) {
  const { table, nameCol, hasBio } = getEntityConfig(entityKey);
  try {
    if (hasBio) {
      await pool.query(`INSERT INTO ${table} (${nameCol}, bio) VALUES ($1, $2)`, [data.name, data.bio || null]);
    } else {
      await pool.query(`INSERT INTO ${table} (${nameCol}) VALUES ($1)`, [data.name]);
    }
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Ya existe un registro con ese nombre.', 400);
    }
    throw err;
  }
}

async function update(entityKey, id, data) {
  const { table, idCol, nameCol, hasBio } = getEntityConfig(entityKey);
  try {
    if (hasBio) {
      await pool.query(`UPDATE ${table} SET ${nameCol} = $1, bio = $2 WHERE ${idCol} = $3`, [data.name, data.bio || null, id]);
    } else {
      await pool.query(`UPDATE ${table} SET ${nameCol} = $1 WHERE ${idCol} = $2`, [data.name, id]);
    }
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Ya existe un registro con ese nombre.', 400);
    }
    throw err;
  }
}

async function remove(entityKey, id) {
  const { table, idCol, label } = getEntityConfig(entityKey);
  try {
    await pool.query(`DELETE FROM ${table} WHERE ${idCol} = $1`, [id]);
  } catch (err) {
    if (err.code === '23503') {
      throw new AppError(`No se puede eliminar: hay libros que usan este ${label.toLowerCase()}.`, 400);
    }
    throw err;
  }
}

module.exports = { ENTITIES, getEntityConfig, list, create, update, remove };
