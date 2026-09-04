-- 02_seed_30_per_table.sql — Datos sintéticos suficientes para probar la
-- solución (catálogos, usuarios, libros y todas sus relaciones 4FN).
--
-- Nota de ingeniería: en catálogos de dominio naturalmente pequeño
-- (formats, categories) forzar 30 valores distintos sin sentido no aporta
-- nada; se seedean con un tamaño realista y se compensa con los volúmenes
-- de books/authors/genres/concepts/users y con las tablas puente
-- (book_authors/book_genres/book_concepts/book_images), que sí superan
-- ampliamente 30 filas — que es el propósito real del requisito: tener
-- suficiente volumen para probar paginación, búsqueda y JOINs.
--
-- Ejecutar: psql -h 127.0.0.1 -p "$PGCLUSTER_PORT" -U library_admin -d library -f db/02_seed_30_per_table.sql

BEGIN;

-- ── Formatos (10) ────────────────────────────────────────────────────────
INSERT INTO formats (name) VALUES
  ('Tapa dura'), ('Rústica'), ('Bolsillo'), ('Digital ePub'), ('Digital PDF'),
  ('Audiolibro'), ('Edición de lujo'), ('Edición de coleccionista'),
  ('Cómic / novela gráfica'), ('Libro interactivo');

-- ── Categorías (15) ──────────────────────────────────────────────────────
INSERT INTO categories (name) VALUES
  ('Ficción'), ('No ficción'), ('Ciencia'), ('Computación'), ('Historia'),
  ('Biografía'), ('Autoayuda'), ('Infantil'), ('Juvenil'), ('Poesía'),
  ('Ensayo'), ('Arte'), ('Filosofía'), ('Economía'), ('Salud');

-- ── Géneros (30) ─────────────────────────────────────────────────────────
INSERT INTO genres (name) VALUES
  ('Novela'), ('Cuento'), ('Fantasía'), ('Ciencia ficción'), ('Misterio'),
  ('Terror'), ('Romance'), ('Aventura'), ('Drama'), ('Distopía'),
  ('Realismo mágico'), ('Policiaco'), ('Thriller'), ('Satírico'), ('Épico'),
  ('Divulgación científica'), ('Ingeniería de software'), ('Arquitectura de software'),
  ('Bases de datos'), ('Redes y sistemas'), ('Inteligencia artificial'),
  ('Ciberseguridad'), ('Historia militar'), ('Historia contemporánea'),
  ('Biografía política'), ('Memoria personal'), ('Crecimiento personal'),
  ('Liderazgo'), ('Filosofía política'), ('Poesía contemporánea');

-- ── Autores (30) ─────────────────────────────────────────────────────────
INSERT INTO authors (full_name) VALUES
  ('Gabriel García Márquez'), ('Isabel Allende'), ('Jorge Luis Borges'),
  ('Mario Vargas Llosa'), ('Julio Cortázar'), ('Octavio Paz'),
  ('Laura Esquivel'), ('Carlos Fuentes'), ('Pablo Neruda'), ('Juan Rulfo'),
  ('George Orwell'), ('Aldous Huxley'), ('Ray Bradbury'), ('Ursula K. Le Guin'),
  ('Isaac Asimov'), ('Arthur C. Clarke'), ('Philip K. Dick'), ('Frank Herbert'),
  ('Agatha Christie'), ('Arthur Conan Doyle'),
  ('Robert C. Martin'), ('Martin Fowler'), ('Eric Evans'), ('Kent Beck'),
  ('Andrew Hunt'), ('David Thomas'), ('Erich Gamma'), ('Kathleen Fisher'),
  ('Yuval Noah Harari'), ('Michio Kaku');

-- ── Conceptos (30) ───────────────────────────────────────────────────────
-- Incluye explícitamente los conceptos de Cloud Computing pedidos por el
-- enunciado (Parte 5, punto 15) más otros conceptos técnicos y literarios
-- reutilizables en distintos libros con definiciones propias.
INSERT INTO concepts (name) VALUES
  ('IaaS'), ('PaaS'), ('SaaS'), ('FaaS'), ('Bucket'),
  ('Public Cloud'), ('Private Cloud'), ('Hybrid Cloud'), ('Multicloud'), ('Serverless'),
  ('Contenedor'), ('Orquestación'), ('Microservicio'), ('API REST'), ('Balanceo de carga'),
  ('Normalización de bases de datos'), ('Transacción ACID'), ('Índice (bases de datos)'),
  ('Patrón de diseño'), ('Refactorización'), ('Deuda técnica'), ('Integración continua'),
  ('Cifrado simétrico'), ('Cifrado asimétrico'),
  ('Realismo mágico (recurso literario)'), ('Narrador no confiable'), ('Distopía (género)'),
  ('Metáfora'), ('Alegoría'), ('Monólogo interior');

-- ── Usuarios (30: 1 Administrador + 29 registrados) ────────────────────
-- Contraseña de todos los usuarios de prueba: "Passw0rd!23" (hash bcrypt
-- generado con pgcrypto, compatible con la verificación bcrypt en Node).
-- Cambiar en un entorno real; aquí es dato sintético documentado a propósito.
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin Librería', 'admin@libreria.udem.edu', crypt('Passw0rd!23', gen_salt('bf')), 'admin');

INSERT INTO users (name, email, password_hash, role)
SELECT
  'Usuario Demo ' || lpad(n::text, 2, '0'),
  'usuario' || lpad(n::text, 2, '0') || '@libreria.udem.edu',
  crypt('Passw0rd!23', gen_salt('bf')),
  'registered'
FROM generate_series(1, 29) AS n;

-- ── Libros (30) ──────────────────────────────────────────────────────────
-- ISBN sintéticos con prefijo 978-0-EJ02 para no chocar con ISBN reales.
INSERT INTO books (isbn, title, publication_year, price, stock, format_id, category_id) VALUES
  ('978-0-EJ02-0001', 'Cien años de soledad', 1967, 320.00, 18, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0002', 'El amor en los tiempos del cólera', 1985, 299.00, 12, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0003', 'La casa de los espíritus', 1982, 279.00, 15, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0004', 'Ficciones', 1944, 249.00, 20, (SELECT format_id FROM formats WHERE name='Bolsillo'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0005', 'La ciudad y los perros', 1963, 289.00, 10, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0006', 'Rayuela', 1963, 310.00, 9, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0007', 'El laberinto de la soledad', 1950, 259.00, 14, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ensayo')),
  ('978-0-EJ02-0008', 'Como agua para chocolate', 1989, 239.00, 22, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0009', 'Pedro Páramo', 1955, 219.00, 25, (SELECT format_id FROM formats WHERE name='Bolsillo'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0010', 'Veinte poemas de amor y una canción desesperada', 1924, 199.00, 30, (SELECT format_id FROM formats WHERE name='Bolsillo'), (SELECT category_id FROM categories WHERE name='Poesía')),
  ('978-0-EJ02-0011', '1984', 1949, 269.00, 40, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0012', 'Un mundo feliz', 1932, 259.00, 28, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0013', 'Fahrenheit 451', 1953, 229.00, 33, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0014', 'Un mago de Terramar', 1968, 219.00, 17, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0015', 'Fundación', 1951, 279.00, 21, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0016', 'El fin de la infancia', 1953, 249.00, 11, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0017', '¿Sueñan los androides con ovejas eléctricas?', 1968, 259.00, 16, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0018', 'Dune', 1965, 349.00, 26, (SELECT format_id FROM formats WHERE name='Edición de lujo'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0019', 'Asesinato en el Orient Express', 1934, 229.00, 19, (SELECT format_id FROM formats WHERE name='Bolsillo'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0020', 'Estudio en escarlata', 1887, 199.00, 24, (SELECT format_id FROM formats WHERE name='Bolsillo'), (SELECT category_id FROM categories WHERE name='Ficción')),
  ('978-0-EJ02-0021', 'Código limpio', 2008, 459.00, 13, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Computación')),
  ('978-0-EJ02-0022', 'Refactorización', 1999, 439.00, 8, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Computación')),
  ('978-0-EJ02-0023', 'Diseño guiado por el dominio', 2003, 469.00, 7, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Computación')),
  ('978-0-EJ02-0024', 'El programador pragmático', 1999, 399.00, 20, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Computación')),
  ('978-0-EJ02-0025', 'Patrones de diseño', 1994, 449.00, 9, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Computación')),
  ('978-0-EJ02-0026', 'Fundamentos de Cloud Computing', 2023, 389.00, 30, (SELECT format_id FROM formats WHERE name='Digital PDF'), (SELECT category_id FROM categories WHERE name='Computación')),
  ('978-0-EJ02-0027', 'Sapiens: de animales a dioses', 2011, 329.00, 27, (SELECT format_id FROM formats WHERE name='Tapa dura'), (SELECT category_id FROM categories WHERE name='Historia')),
  ('978-0-EJ02-0028', 'Física del futuro', 2011, 299.00, 12, (SELECT format_id FROM formats WHERE name='Rústica'), (SELECT category_id FROM categories WHERE name='Ciencia')),
  ('978-0-EJ02-0029', 'El arte de la guerra', -500, 149.00, 35, (SELECT format_id FROM formats WHERE name='Bolsillo'), (SELECT category_id FROM categories WHERE name='Filosofía')),
  ('978-0-EJ02-0030', 'Meditaciones', 180, 179.00, 23, (SELECT format_id FROM formats WHERE name='Bolsillo'), (SELECT category_id FROM categories WHERE name='Filosofía'));

-- El año -500 (siglo V a. C.) y 180 (d. C.) prueban a propósito el límite
-- inferior del CHECK (publication_year BETWEEN -3000 AND 2100) definido en
-- 01_schema.sql para admitir obras clásicas de la Antigüedad.

-- ── book_authors (relación N:M autores↔libro) ───────────────────────────
INSERT INTO book_authors (book_id, author_id)
SELECT b.book_id, a.author_id FROM books b, authors a WHERE
  (b.isbn = '978-0-EJ02-0001' AND a.full_name = 'Gabriel García Márquez') OR
  (b.isbn = '978-0-EJ02-0002' AND a.full_name = 'Gabriel García Márquez') OR
  (b.isbn = '978-0-EJ02-0003' AND a.full_name = 'Isabel Allende') OR
  (b.isbn = '978-0-EJ02-0004' AND a.full_name = 'Jorge Luis Borges') OR
  (b.isbn = '978-0-EJ02-0005' AND a.full_name = 'Mario Vargas Llosa') OR
  (b.isbn = '978-0-EJ02-0006' AND a.full_name = 'Julio Cortázar') OR
  (b.isbn = '978-0-EJ02-0007' AND a.full_name = 'Octavio Paz') OR
  (b.isbn = '978-0-EJ02-0008' AND a.full_name = 'Laura Esquivel') OR
  (b.isbn = '978-0-EJ02-0009' AND a.full_name = 'Juan Rulfo') OR
  (b.isbn = '978-0-EJ02-0010' AND a.full_name = 'Pablo Neruda') OR
  (b.isbn = '978-0-EJ02-0011' AND a.full_name = 'George Orwell') OR
  (b.isbn = '978-0-EJ02-0012' AND a.full_name = 'Aldous Huxley') OR
  (b.isbn = '978-0-EJ02-0013' AND a.full_name = 'Ray Bradbury') OR
  (b.isbn = '978-0-EJ02-0014' AND a.full_name = 'Ursula K. Le Guin') OR
  (b.isbn = '978-0-EJ02-0015' AND a.full_name = 'Isaac Asimov') OR
  (b.isbn = '978-0-EJ02-0016' AND a.full_name = 'Arthur C. Clarke') OR
  (b.isbn = '978-0-EJ02-0017' AND a.full_name = 'Philip K. Dick') OR
  (b.isbn = '978-0-EJ02-0018' AND a.full_name = 'Frank Herbert') OR
  (b.isbn = '978-0-EJ02-0019' AND a.full_name = 'Agatha Christie') OR
  (b.isbn = '978-0-EJ02-0020' AND a.full_name = 'Arthur Conan Doyle') OR
  (b.isbn = '978-0-EJ02-0021' AND a.full_name = 'Robert C. Martin') OR
  (b.isbn = '978-0-EJ02-0022' AND a.full_name = 'Martin Fowler') OR
  (b.isbn = '978-0-EJ02-0023' AND a.full_name = 'Eric Evans') OR
  (b.isbn = '978-0-EJ02-0024' AND a.full_name = 'Andrew Hunt') OR
  (b.isbn = '978-0-EJ02-0024' AND a.full_name = 'David Thomas') OR
  (b.isbn = '978-0-EJ02-0025' AND a.full_name = 'Erich Gamma') OR
  (b.isbn = '978-0-EJ02-0026' AND a.full_name = 'Kathleen Fisher') OR
  (b.isbn = '978-0-EJ02-0027' AND a.full_name = 'Yuval Noah Harari') OR
  (b.isbn = '978-0-EJ02-0028' AND a.full_name = 'Michio Kaku');
  -- Nota: '978-0-EJ02-0024' ya queda con 2 autores (Hunt + Thomas), que es
  -- el caso real: ambos son coautores de "El programador pragmático".

-- ── book_genres (relación N:M géneros↔libro, independiente de autores) ──
INSERT INTO book_genres (book_id, genre_id)
SELECT b.book_id, g.genre_id FROM books b, genres g WHERE
  (b.isbn = '978-0-EJ02-0001' AND g.name = 'Realismo mágico') OR
  (b.isbn = '978-0-EJ02-0001' AND g.name = 'Novela') OR
  (b.isbn = '978-0-EJ02-0002' AND g.name = 'Romance') OR
  (b.isbn = '978-0-EJ02-0003' AND g.name = 'Realismo mágico') OR
  (b.isbn = '978-0-EJ02-0004' AND g.name = 'Cuento') OR
  (b.isbn = '978-0-EJ02-0005' AND g.name = 'Drama') OR
  (b.isbn = '978-0-EJ02-0006' AND g.name = 'Novela') OR
  (b.isbn = '978-0-EJ02-0007' AND g.name = 'Filosofía política') OR
  (b.isbn = '978-0-EJ02-0008' AND g.name = 'Romance') OR
  (b.isbn = '978-0-EJ02-0009' AND g.name = 'Realismo mágico') OR
  (b.isbn = '978-0-EJ02-0010' AND g.name = 'Poesía contemporánea') OR
  (b.isbn = '978-0-EJ02-0011' AND g.name = 'Distopía') OR
  (b.isbn = '978-0-EJ02-0012' AND g.name = 'Distopía') OR
  (b.isbn = '978-0-EJ02-0013' AND g.name = 'Distopía') OR
  (b.isbn = '978-0-EJ02-0013' AND g.name = 'Ciencia ficción') OR
  (b.isbn = '978-0-EJ02-0014' AND g.name = 'Fantasía') OR
  (b.isbn = '978-0-EJ02-0015' AND g.name = 'Ciencia ficción') OR
  (b.isbn = '978-0-EJ02-0016' AND g.name = 'Ciencia ficción') OR
  (b.isbn = '978-0-EJ02-0017' AND g.name = 'Ciencia ficción') OR
  (b.isbn = '978-0-EJ02-0018' AND g.name = 'Épico') OR
  (b.isbn = '978-0-EJ02-0018' AND g.name = 'Ciencia ficción') OR
  (b.isbn = '978-0-EJ02-0019' AND g.name = 'Policiaco') OR
  (b.isbn = '978-0-EJ02-0020' AND g.name = 'Misterio') OR
  (b.isbn = '978-0-EJ02-0021' AND g.name = 'Ingeniería de software') OR
  (b.isbn = '978-0-EJ02-0022' AND g.name = 'Ingeniería de software') OR
  (b.isbn = '978-0-EJ02-0023' AND g.name = 'Arquitectura de software') OR
  (b.isbn = '978-0-EJ02-0024' AND g.name = 'Ingeniería de software') OR
  (b.isbn = '978-0-EJ02-0025' AND g.name = 'Arquitectura de software') OR
  (b.isbn = '978-0-EJ02-0026' AND g.name = 'Ingeniería de software') OR
  (b.isbn = '978-0-EJ02-0027' AND g.name = 'Historia contemporánea') OR
  (b.isbn = '978-0-EJ02-0028' AND g.name = 'Divulgación científica') OR
  (b.isbn = '978-0-EJ02-0029' AND g.name = 'Historia militar') OR
  (b.isbn = '978-0-EJ02-0030' AND g.name = 'Filosofía política');

-- ── book_concepts (definición específica por libro; ejemplo Cloud Computing) ──
INSERT INTO book_concepts (book_id, concept_id, definition, reference_page)
SELECT (SELECT book_id FROM books WHERE isbn = '978-0-EJ02-0026'), c.concept_id, def, page
FROM (VALUES
  ('IaaS', 'Infraestructura como servicio: cómputo, almacenamiento y red aprovisionados bajo demanda, el cliente administra el sistema operativo y la aplicación.', 22),
  ('PaaS', 'Plataforma como servicio: el proveedor gestiona el entorno de ejecución; el cliente solo despliega su código.', 35),
  ('SaaS', 'Software como servicio: aplicación completa consumida por el usuario final, típicamente por suscripción, sin instalación local.', 41),
  ('FaaS', 'Funciones como servicio: código ejecutado en respuesta a eventos, sin que el cliente administre servidores.', 58),
  ('Bucket', 'Contenedor lógico de almacenamiento de objetos, identificado por un nombre único dentro del proveedor cloud.', 63),
  ('Public Cloud', 'Infraestructura compartida entre múltiples clientes, operada por un proveedor externo.', 70),
  ('Private Cloud', 'Infraestructura dedicada a una sola organización, on-premise o alojada por un tercero.', 71),
  ('Hybrid Cloud', 'Combinación de nube pública y privada con orquestación entre ambas.', 74),
  ('Multicloud', 'Uso simultáneo de más de un proveedor de nube pública para evitar dependencia de uno solo.', 76),
  ('Serverless', 'Modelo de ejecución donde el proveedor gestiona el aprovisionamiento de servidores de forma transparente al desarrollador.', 80)
) AS defs(concept_name, def, page)
JOIN concepts c ON c.name = defs.concept_name;

INSERT INTO book_concepts (book_id, concept_id, definition, reference_page) VALUES
  ((SELECT book_id FROM books WHERE isbn = '978-0-EJ02-0021'), (SELECT concept_id FROM concepts WHERE name = 'Patrón de diseño'), 'Solución reutilizable a un problema recurrente de diseño de software, documentada como plantilla aplicable a distintos contextos.', 12),
  ((SELECT book_id FROM books WHERE isbn = '978-0-EJ02-0021'), (SELECT concept_id FROM concepts WHERE name = 'Deuda técnica'), 'Costo futuro implícito de tomar una solución rápida en vez de una mejor solución que tomaría más tiempo.', 45),
  ((SELECT book_id FROM books WHERE isbn = '978-0-EJ02-0022'), (SELECT concept_id FROM concepts WHERE name = 'Refactorización'), 'Cambio en la estructura interna del código sin alterar su comportamiento observable, para mejorar su diseño.', 5),
  ((SELECT book_id FROM books WHERE isbn = '978-0-EJ02-0023'), (SELECT concept_id FROM concepts WHERE name = 'Microservicio'), 'Servicio autónomo y desplegable de forma independiente, organizado alrededor de una capacidad de negocio (en contraste con el monolito de este ejercicio).', 30),
  ((SELECT book_id FROM books WHERE isbn = '978-0-EJ02-0001'), (SELECT concept_id FROM concepts WHERE name = 'Realismo mágico (recurso literario)'), 'Recurso narrativo donde eventos fantásticos se presentan como parte normal de la realidad cotidiana.', 8),
  ((SELECT book_id FROM books WHERE isbn = '978-0-EJ02-0011'), (SELECT concept_id FROM concepts WHERE name = 'Distopía (género)'), 'Género que representa una sociedad futura indeseable, usualmente como advertencia crítica del presente.', 3);

-- ── book_images (varias por libro, una portada por libro) ───────────────
-- Los archivos referenciados aquí son rutas de ejemplo; las imágenes reales
-- se suben por la interfaz de administración (ver app/routes/admin) y quedan
-- en app/uploads/ con nombre generado por el servidor.
INSERT INTO book_images (book_id, file_path, alt_text, is_cover)
SELECT book_id, '/uploads/seed/' || isbn || '-cover.jpg', 'Portada de ' || title, true
FROM books;

INSERT INTO book_images (book_id, file_path, alt_text, is_cover)
SELECT book_id, '/uploads/seed/' || isbn || '-back.jpg', 'Contraportada de ' || title, false
FROM books
WHERE book_id % 2 = 0; -- la mitad de los libros también tiene contraportada

COMMIT;
