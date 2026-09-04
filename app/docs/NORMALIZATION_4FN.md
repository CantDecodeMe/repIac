# Normalización 1FN → 2FN → 3FN/BCNF → 4FN

Partiendo de ISBN, título, autor, año, género, precio, stock, formato,
categoría, imágenes y conceptos definidos por libro (Parte 3, punto 6 del
enunciado). Se documenta la evolución completa, no solo el modelo final.

## 0. Estructura inicial sin normalizar

Una única tabla plana, tal como llegaría de un formulario o una hoja de
cálculo:

```
books_flat(
  isbn, title, year, price, stock,
  format_name, category_name,
  authors,              -- "Robert C. Martin, Martin Fowler"
  genres,               -- "Ingeniería de software, Arquitectura"
  concepts,             -- "IaaS: definición...; PaaS: definición..."
  image_paths           -- "/img/a.jpg, /img/b.jpg"
)
```

Problemas evidentes: columnas con listas separadas por comas (repeating
groups), imposibilidad de indexar o filtrar por autor/género/concepto
individual, y anomalías de actualización (renombrar un autor exige editar
texto libre en cada fila donde aparece).

## 1FN — Atomicidad

Se elimina toda columna con listas; cada campo debe contener un solo valor
atómico. Esto obliga a separar autores, géneros, conceptos e imágenes en
filas propias:

```
books(isbn, title, year, price, stock, format_name, category_name)
book_authors_raw(isbn, author_name)
book_genres_raw(isbn, genre_name)
book_concepts_raw(isbn, concept_name, definition)
book_images_raw(isbn, image_path)
```

Ya en 1FN, pero `author_name`, `genre_name`, `format_name`, etc. siguen
siendo texto libre repetido en múltiples filas (mismo autor escrito de
formas distintas, sin identidad propia).

## 2FN — Eliminar dependencias parciales de una clave compuesta

En `book_authors_raw`, la clave candidata es `(isbn, author_name)`. No hay
atributos adicionales dependientes de solo una parte de esa clave todavía,
pero el problema real es que `author_name` no es una entidad propia: dos
libros del "mismo" autor no están garantizadamente vinculados al mismo
autor si el nombre se escribió distinto. Se extraen los catálogos como
entidades con clave propia:

```
authors(author_id PK, full_name)
genres(genre_id PK, name UNIQUE)
formats(format_id PK, name UNIQUE)
categories(category_id PK, name UNIQUE)
concepts(concept_id PK, name UNIQUE)

books(book_id PK, isbn UNIQUE, title, year, price, stock,
      format_id FK, category_id FK)
```

Esto ya cumple 2FN: todo atributo no clave depende de la clave completa de
su tabla (en tablas con clave simple, 2FN se cumple automáticamente una vez
resuelta la atomicidad).

## 3FN / BCNF — Eliminar dependencias transitivas

Se revisa que ningún atributo no clave dependa de otro atributo no clave.
`format_name` y `category_name` ya se movieron a catálogos propios
(`formats`, `categories`), así que `books` solo guarda sus llaves foráneas,
no el nombre repetido — evita que actualizar el nombre de un formato
implique tocar todos los libros. Se verifica que cada tabla catálogo
(`authors`, `genres`, `formats`, `categories`, `concepts`) tenga una única
llave candidata (su PK) y ningún atributo que dependa de otro atributo no
clave. `books` queda en BCNF: `book_id` determina todos los demás atributos
y no hay determinantes parciales.

## 4FN — Eliminar dependencias multivaluadas independientes

Aquí está el punto central de este ejercicio. Antes de 4FN, alguien podría
verse tentado a modelar `book_authors` y `book_genres` como una sola tabla
"book_details" con `(book_id, author_id, genre_id)`. Eso introduciría una
**dependencia multivaluada (MVD)** falsa: un libro con 2 autores y 3 géneros
generaría 2×3=6 filas, sugiriendo una relación entre autor y género que no
existe — ambas son independientes entre sí, solo dependen del libro.

Regla aplicada: si un libro puede tener varios autores **y**, de forma
independiente, varios géneros, esas dos relaciones multivaluadas deben
vivir en tablas puente separadas, cada una con su propia clave:

```
book_authors(book_id FK, author_id FK, PRIMARY KEY(book_id, author_id))
book_genres (book_id FK, genre_id  FK, PRIMARY KEY(book_id, genre_id))
```

Lo mismo aplica a las imágenes: un libro puede tener varias imágenes
independientemente de sus autores o géneros. Se modela como entidad propia
(no solo bridge, tiene atributos):

```
book_images(image_id PK, book_id FK, file_path, alt_text,
            is_cover BOOLEAN, uploaded_at)
```

Y los conceptos son el caso más claro de por qué no basta con una tabla
puente simple: la **definición** de un concepto (p. ej. "Bucket") cambia
según el libro donde aparece, así que el atributo `definition` no puede
vivir en el catálogo `concepts` (ahí solo va el nombre del concepto) ni en
`books` — pertenece a la **relación** libro-concepto:

```
book_concepts(book_id FK, concept_id FK, definition TEXT,
              reference_page INT, PRIMARY KEY(book_id, concept_id))
```

Con esto: `authors`, `genres`, `concepts`, `book_images` son conjuntos que
varían de forma independiente por libro → cada uno en su propia tabla
puente/entidad, ninguno combinado con otro. Ese es el modelo 4FN final,
documentado en `DB_DESIGN_ER_4FN.png` e implementado en
`db/01_schema.sql`.

## Regla de negocio "un solo Administrador" y su normalización

`users(user_id PK, name, email UNIQUE, password_hash, role, created_at)`
con `role CHECK (role IN ('registered','admin'))`. Esta restricción por sí
sola no impide un segundo `admin`; la unicidad del rol se refuerza con un
índice único parcial (`CREATE UNIQUE INDEX ... WHERE role = 'admin'`) más
un trigger explícito — ver `db/01_schema.sql` y `db/05_triggers.sql`.

## Resumen de tablas finales (4FN)

| Tabla | Tipo | Por qué está separada |
|---|---|---|
| `users` | Entidad | Identidad y rol, independiente del catálogo |
| `authors`, `genres`, `formats`, `categories`, `concepts` | Catálogos | Evitan texto libre repetido; cada uno con su propia clave |
| `books` | Entidad | Atributos propios de un libro; FKs a `formats`/`categories` |
| `book_authors` | Puente MVD | Autores de un libro, independiente de géneros/imágenes |
| `book_genres` | Puente MVD | Géneros de un libro, independiente de autores/imágenes |
| `book_concepts` | Puente con atributo | Definición específica por libro, independiente de autores/géneros |
| `book_images` | Entidad débil | Imágenes de un libro, independiente de autores/géneros/conceptos |
