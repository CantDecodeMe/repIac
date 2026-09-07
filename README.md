# Portafolio — Integración de Aplicaciones Computacionales

Sitio estático tipo *journal* de la materia. Una entrada por actividad del curso
con el resumen, la reflexión y la evidencia de cada ejercicio pedido en clase.

Este repositorio contiene **solo el sitio**: HTML, CSS, JS y los PDF de las
consignas. No incluye aplicaciones desplegables ni infraestructura para correrlas.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html` | Portada del portafolio: tarjetas de actividad y datos del curso. |
| `activities/<n>/` | Reporte de cada actividad (usa `styles/report.css`). |
| `enunciados/` | PDF de las consignas del curso. |
| `styles/`, `js/` | Estilos y el script de navegación del sitio. |

## Ver el sitio localmente

Abrir `index.html` en el navegador, o servir la carpeta:

```
python3 -m http.server
```
