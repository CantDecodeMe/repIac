'use strict';

require('dotenv').config();

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const { pool } = require('./config/db');
const { exposeUserToViews, requireAdmin } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const adminIndexRoutes = require('./routes/admin/index');
const adminBookRoutes = require('./routes/admin/books');
const adminEntityRoutes = require('./routes/admin/entities');
const adminConceptRoutes = require('./routes/admin/concepts');
const adminImageRoutes = require('./routes/admin/images');

const app = express();

// La app solo escucha en loopback (Parte 8, punto 19): nunca se expone
// directamente a Internet, solo a través del reverse proxy de Apache.
const PORT = Number(process.env.PORT || 3000);
const HOST = '127.0.0.1';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // detrás de Apache/mod_proxy

app.use(helmet({
  contentSecurityPolicy: false, // se define a mano en public/css si hace falta; evita bloquear EJS inline por defecto
}));
app.use(express.urlencoded({ extended: false }));
app.use('/library/public', express.static(path.join(__dirname, 'public')));
app.use('/library/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  name: 'library.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/library',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'true',
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
  },
}));

app.use(exposeUserToViews);

const router = express.Router();
router.get('/', (req, res) => res.redirect('/library/catalog'));
router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/admin', requireAdmin, adminIndexRoutes);
router.use('/admin/books', requireAdmin, adminBookRoutes);
router.use('/admin/catalogs', requireAdmin, adminEntityRoutes);
router.use('/admin/concepts', requireAdmin, adminConceptRoutes);
router.use('/admin/images', requireAdmin, adminImageRoutes);

app.use('/library', router);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, HOST, () => {
  console.log(`[library] escuchando en http://${HOST}:${PORT}/library (prueba local antes de exponer vía reverse proxy)`);
});
