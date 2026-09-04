# Prompt maestro para solicitar mejoras con IA (Tarea 2e)

Plantilla usada para pedirle a la IA una mejora **pequeña y verificable**
sobre el sistema ya construido, evitando que "usar IA" se convierta en
"sustituir el análisis". Cada uso real de esta plantilla se registra en
`AI_PROMPT_HISTORY.md` con el prompt exacto, la respuesta relevante, los
archivos modificados, el riesgo introducido, las pruebas ejecutadas y el
resultado.

## Plantilla

```
Contexto: <qué parte del sistema, en qué estado, por qué se toca ahora>
Objetivo puntual: <UNA mejora concreta y acotada, no una lista>
Restricciones: <qué NO debe cambiar — arquitectura, contrato de rutas,
                esquema de BD, estilo del código existente>
Verificación esperada: <cómo se va a comprobar que la mejora funciona y
                        que no rompió nada — comando, prueba, captura>
```

## Reglas de uso

1. Una mejora por prompt. Si la respuesta de la IA toca más archivos de
   los que el objetivo puntual justifica, se revisa manualmente por qué
   antes de aceptarla.
2. Toda mejora que toque `services/*.js` (acceso a datos) se re-verifica
   contra la matriz de `TEST_PLAN.md`, no solo se asume correcta.
3. El estudiante explica el cambio sin apoyarse en la IA antes de darlo
   por aceptado (criterio de evaluación "Uso de IA": trazabilidad, revisión
   crítica, pruebas, responsabilidad sobre los cambios).
4. Ninguna mejora solicitada por esta vía puede introducir una regresión de
   seguridad (ver `SECURITY_REVIEW.md`) ni reabrir una prueba negativa ya
   cerrada en `TEST_PLAN.md`.

## Ejemplo real (ver entrada correspondiente en AI_PROMPT_HISTORY.md)

```
Contexto: catalogService.listCatalog ya pagina y busca por ISBN/título,
          verificado en TC-04/TC-05 contra el clúster real.
Objetivo puntual: agregar un índice a books(lower(title)) si no existiera
                  ya, para que la búsqueda por título no dependa de un
                  full scan cuando el catálogo crezca.
Restricciones: no cambiar la firma de listCatalog ni la vista view_catalog;
               solo agregar el índice si realmente falta.
Verificación esperada: EXPLAIN ANALYZE de la consulta de búsqueda antes y
                       después, confirmando uso del índice.
```
