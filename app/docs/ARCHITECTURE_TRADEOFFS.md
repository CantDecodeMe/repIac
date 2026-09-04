# Evaluación arquitectónica (Tarea 2c)

~600 palabras. No se cambia la arquitectura del ejercicio (sigue siendo el
monolito server-side exigido); esto es un análisis comparativo de trade-offs
como ejercicio de ingeniería, no una propuesta de migración.

## El monolito en este escenario

Esta librería en línea es, en tamaño real, pequeña: un solo desarrollador,
un dominio de negocio (catálogo + usuarios + imágenes) sin equipos
independientes trabajando en paralelo, y un volumen de tráfico académico,
no productivo. Para ese perfil, un monolito server-side con Express y EJS
es una elección defendible y probablemente la más eficiente en tiempo de
desarrollo: todo el código vive en un solo repositorio y un solo proceso,
lo que elimina la necesidad de versionar contratos de API, coordinar
despliegues entre servicios o resolver consistencia entre bases de datos
distribuidas. El costo operativo también es mínimo — un único proceso
Node.js y un único clúster PostgreSQL, ambos administrables sin
privilegios de sistema, como demuestra este mismo despliegue en
`ubiquitous.udem.edu`. La curva de aprendizaje es baja: cualquiera que lea
`app.js` entiende el flujo completo de la aplicación sin saltar entre
repositorios.

La contrapartida es acoplamiento. Vistas, rutas y acceso a datos comparten
el mismo tiempo de vida: no se puede escalar solo la carga de imágenes sin
escalar todo el proceso, ni desplegar un cambio en el catálogo sin
redesplegar la autenticación. Un error no controlado en un módulo puede, en
el peor caso, tumbar el proceso completo — se mitiga con el manejador de
errores centralizado (`middleware/errorHandler.js`), pero la superficie de
falla compartida sigue siendo mayor que en servicios aislados.

## Frente a una solución desacoplada (frontend + API)

Separar el frontend (SPA) de un backend que expone una API REST/JSON
tendría sentido si existieran múltiples clientes (web, móvil, integración
con otro sistema de la universidad) o si un equipo de frontend y otro de
backend necesitaran trabajar y desplegar de forma independiente. El costo
sería duplicar la lógica de presentación de estado (loading, errores) en
el cliente, versionar la API para no romper consumidores existentes, y
resolver autenticación con tokens en vez de sesión de servidor — más
piezas móviles para un beneficio que, en este proyecto, nadie va a
consumir todavía. La restricción explícita del enunciado de no usar
JSON/REST entre frontend y backend hace esta comparación más teórica que
práctica aquí, pero el trade-off real es: **complejidad de integración a
cambio de flexibilidad de cliente**, algo que este ejercicio no necesita.

## Frente a microservicios

Microservicios (catálogo, usuarios, imágenes como servicios independientes)
solo se justifican cuando distintas partes del sistema tienen ciclos de
vida, tasas de cambio o requisitos de escalado genuinamente distintos, y
cuando existe un equipo por servicio que asuma la carga operativa de cada
uno (observabilidad, despliegue, manejo de fallos de red entre servicios).
Para una librería con un solo desarrollador, migrar a microservicios
multiplicaría la complejidad operativa (varios procesos, descubrimiento de
servicios, consistencia eventual entre bases de datos separadas, más
puntos de fallo) sin ninguna ganancia de negocio correspondiente: nadie
necesita escalar "conceptos de libros" independientemente de "libros".
Es, literalmente, sobre-ingeniería para este tamaño de equipo y de
problema.

## Qué cambiaría si el sistema creciera

Si este proyecto pasara de ejercicio académico a producto real con miles de
usuarios concurrentes, equipos separados y necesidad de alta
disponibilidad, la migración razonable **no sería microservicios de
inmediato**, sino un paso intermedio: extraer primero la carga de imágenes
a almacenamiento de objetos externo (hoy es un directorio local,
`uploads/`, que no escala horizontalmente ni sobrevive a mover el proceso
de servidor), y separar el frontend del backend detrás de una API cuando
exista un segundo cliente real que lo justifique. Microservicios por
dominio (catálogo/usuarios/imágenes) solo tendría sentido después, si
distintos equipos necesitaran desplegar y escalar cada dominio de forma
independiente — no antes.
