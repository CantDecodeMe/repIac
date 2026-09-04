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

// La app se publica bajo https://ubiquitous.udem.edu/~iac-615639/library por
// un reverse proxy UserDir; Apache quita el prefijo antes de llegar aquí,
// pero el navegador lo ve en su barra de direcciones. Por eso los redirects
// y las URLs de las vistas deben llevar ese prefijo externo. Se configura
// con APP_BASE_PATH en .env; vacío mantiene el comportamiento de montar en
// la raíz (/library) para pruebas locales. (Ver DEPLOYMENT_UBIQUITOUS.md 5.)
const BASE_PATH = (process.env.APP_BASE_PATH || '').replace(/\/+$/, '');

app.use((req, res, next) => {
  res.locals.basePath = BASE_PATH;
  if (BASE_PATH) {
    const originalRedirect = res.redirect.bind(res);
    res.redirect = (target) => {
      if (typeof target === 'string' && target.startsWith('/library')) {
        return originalRedirect(BASE_PATH + target);
      }
      return originalRedirect(target);
    };
  }
  next();
});

app.use(helmet({
  contentSecurityPolicy: false, // se define a mano en public/css si hace falta; evita bloquear EJS inline por defecto
}));
app.use(express.urlencoded({ extended: false }));
app.use('/library/public', express.static(path.join(__dirname, 'public')));
app.use('/library/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  name: 'library.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // cookie path '/' en vez de '/library': express-session 1.19 exige que el
// pathname que llega (Apache le entrega a Node /library/... SIN el prefijo
// UserDir) empiece por el cookie path; y el navegador exige que el cookie
// path empiece por la ruta que él pide (/~iac-615639/library/...). Único
// prefijo común a ambos: '/'. HttpOnly + SameSite=Lax + secure en
// producción limitan el riesgo de exponerla a rutas ajenas del mismo host.
  cookie: {
    path: '/',
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
