# Inicio y el swipe atrás del iPhone

Producto **4.2.5**. La 4.1.3.1 dejó un solo centinela en el hash. En un iPhone ese gesto no se queda en Fairway: un swipe terminado sale de Safari o cierra la PWA. El botón Atrás del navegador sí veía el hash; el gesto del borde no se detiene en entradas del mismo documento.

## Qué hace la 4.2.5

El velo de la 4.2.2 sigue, solo en Inicio: una franja de 30px en el borde izquierdo. Desde iOS 13.4, un `touchstart` no pasivo que llama a `preventDefault()` en esa franja impide que Safari arme el swipe, en la pestaña y en la PWA instalada. `overscroll-behavior-x` no lo hace en WebKit (bug 240183). No hay clave del manifest que lo apague.

Ese mismo toque ya no hace `pushState`. Antes el centinela se creaba primero y el gesto animaba justo esa entrada. El listener que cancela va antes, y `stopImmediatePropagation` evita el alta del centinela.

Si el swipe entra igual, el `popstate` de Inicio no cambia de pantalla. Un `pushState` en ese turno iOS lo ignora. `history.go(1)` vuelve a la entrada que se acaba de dejar. El colchón se repone en un turno siguiente.

Perfil, el alta de la ronda y la hoja de hoyos no llevan el velo. Ahí el gesto sigue siendo un paso dentro de la app.

## Prueba sin iPhone

`node tests/run.mjs` incluye `tests/nav.mjs`. Ahí el toque con `clientX` dentro de la franja no empuja historia y llama a `preventDefault`. Un toque más adentro sí empuja el colchón. En Perfil el borde no se cancela. Un `history.go(1)` reentrante no se llama dos veces.

Eso no reproduce el gesto de WebKit. El navegador de escritorio no cierra una PWA.

## Cómo comprobarlo en un iPhone

Hace falta la build **4.2.5** (el número está en Inicio). Si la PWA ya estaba instalada, cerrarla del todo y abrirla otra vez para que coja el shell `fairway-v4-425`. Probar las dos: Safari y el icono de la pantalla de inicio.

1. Abrir Inicio, sin haber entrado en otra pantalla. Deslizar desde el borde izquierdo, despacio y luego del todo. Fairway sigue en Inicio. No aparece el escritorio ni la página anterior de Safari.
2. Repetir después de haber hecho scroll en Inicio, con el dedo ya parado.
3. Abrir Perfil y deslizar una vez. Vuelve a Inicio, un solo paso, y no sale de la app.
4. Empezar el alta de una ronda, avanzar un paso y deslizar. Vuelve al paso anterior.
5. Con una ronda abierta, abrir la hoja de hoyos y deslizar. Se cierra la hoja. Otro deslizamiento vuelve a la pantalla anterior, no al escritorio.

Si el paso 1 aún sale de la app, anotar la versión de iOS, si era Safari o el icono, y si el dedo empezó pegado al borde o un poco dentro.
