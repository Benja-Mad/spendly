# Patrón de interacción

Regla única, sin excepciones por pantalla.

## 1. Página
Solo para **navegar entre secciones**: los destinos del sidebar, más una
vista de detalle con URL propia cuando el enlace debe poder compartirse.
Una página muestra **listas y resúmenes**. No crea ni edita nada.

## 2. Menú
Para un **conjunto corto de acciones o interruptores de un clic** que cuelgan de
un mismo elemento: el tema, cerrar sesión, abrir los ajustes. Se ancla al botón
que lo abre y crece desde él.

Cabe en un menú lo que se resuelve al instante y sin formulario. Un interruptor
que se prueba mirando (el tema) no cierra el menú al usarse; una acción que
termina la tarea (cerrar sesión, abrir ajustes) sí.

## 3. Modal
Para **crear o editar una entidad**. Siempre:
- se abre desde un botón explícito o un ítem de menú,
- vive centrado, sobre el contenido,
- cierra con Escape, clic en el fondo, Cancelar o al guardar con éxito,
- tiene siempre el par Cancelar / Acción primaria abajo a la derecha.

Nunca se abre un modal desde dentro de otro modal.

## 4. Diálogo de confirmación
Único caso que **puede apilarse sobre un modal**, porque no es una tarea sino
una pregunta de sí/no. Se usa solo para acciones destructivas.

## 5. Dónde va un botón
El encabezado de **página** solo identifica dónde estás: nunca lleva acciones.
Un botón vive pegado a lo que modifica, y hay tres sitios válidos:

- **El encabezado de la sección**: "+ Tarjeta" junto a las tarjetas,
  "+ Nuevo fondo" junto a los fondos, "Ejecutar" junto a las reglas recurrentes,
  "Unirse con código" junto a las juntas.
- **El final de la grilla que extiende**, como una celda más con la misma
  altura que las demás: así se crea una junta. Cuando la acción agrega un
  elemento del mismo tipo que los de la grilla, esto se lee mejor que un botón
  en el encabezado, porque el sitio donde pinchas es el sitio donde aparecerá.
- **El estado vacío**, cuando no hay ni sección ni grilla todavía.

Los tres son alternativas, no acumulables: la misma acción nunca aparece dos
veces en la misma pantalla.

## 6. Esqueletos
Lo que **siempre se ve igual se pinta de inmediato**: títulos, descripciones,
encabezados de sección, tabs, enlaces de volver y los botones cuya existencia no
depende de los datos. El esqueleto cubre **solo la región que espera datos**.

Una vista nunca se reemplaza entera por un esqueleto. Eso hacía que "Ahorros" o
"Tarjetas y cuentas" tardaran en aparecer lo mismo que las cifras, cuando el
título ya se conocía antes de pedir nada.

Cada tipo de contenido tiene **un** esqueleto, y vive junto al componente que
imita para que cambien juntos: `TransactionRowSkeleton` en transaction-row.tsx,
`AccountCardSkeleton` en account-card.tsx, y así. Repite la caja del componente
real (mismo padding, mismos tamaños de línea) en vez de fijar una altura a ojo:
la altura tiene que salir del mismo cálculo en los dos.

El cambio pasa siempre por `TransitionSwap`, que cruza las dos capas y ajusta el
alto. Nunca se corta de golpe.

La condición se escribe siempre igual: `isLoading && !data`.

## 7. Toast
Todo resultado de una acción: éxito, error y estado en curso. Nunca se informa
el resultado con un bloque incrustado en la página.

## Lo que queda prohibido
- Formularios que se despliegan inline y empujan el contenido.
- Confirmaciones que se expanden dentro de la fila que van a borrar.
- Acciones equivalentes resueltas de forma distinta en dos pantallas.
- Meter en un modal lo que se resuelve con un clic: abrir un overlay, buscar la
  sección y cerrarlo para cambiar de tema es tres pasos para un interruptor.
