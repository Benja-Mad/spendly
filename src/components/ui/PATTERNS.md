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

## 5. Toast
Todo resultado de una acción: éxito, error y estado en curso. Nunca se informa
el resultado con un bloque incrustado en la página.

## Lo que queda prohibido
- Formularios que se despliegan inline y empujan el contenido.
- Confirmaciones que se expanden dentro de la fila que van a borrar.
- Acciones equivalentes resueltas de forma distinta en dos pantallas.
- Meter en un modal lo que se resuelve con un clic: abrir un overlay, buscar la
  sección y cerrarlo para cambiar de tema es tres pasos para un interruptor.
