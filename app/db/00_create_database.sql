-- 00_create_database.sql
-- Ejecutar UNA sola vez, conectado al clúster propio (ver deploy/pg_cluster_init.sh)
-- como el rol superusuario de ESE clúster (no del sistema operativo, no root):
--
--   psql -h 127.0.0.1 -p "$PGCLUSTER_PORT" -U library_admin -d postgres \
--        -v app_password="'$LIBRARY_APP_PASSWORD'" -f db/00_create_database.sql
--
-- `library_admin` es superusuario únicamente de este clúster autocontenido en
-- $HOME (ver ENGINEERING_DECISIONS.md, decisión D-04); la aplicación Node.js
-- NUNCA se conecta con este rol, solo se usa para migraciones/administración.

CREATE ROLE library_app WITH LOGIN PASSWORD :app_password;
COMMENT ON ROLE library_app IS 'Rol de aplicación de mínimo privilegio para el monolito Node.js. No es superusuario.';

CREATE DATABASE library OWNER library_admin;
REVOKE ALL ON DATABASE library FROM PUBLIC;
GRANT CONNECT ON DATABASE library TO library_app;
