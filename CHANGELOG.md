# Changelog

## 4.2.2

Esquema del JSON de copia: 3. Las copias de la 4.0.11, de la 4.1.0, de la 4.1.1, de la 4.1.2, de la 4.1.3, de la 4.1.3.1 y de la 4.2.1 siguen entrando.

- En Inicio, el gesto de volver desde el borde izquierdo del iPhone no llega a arrancar: no hay paso atrás, ni el deslizamiento de la página, ni un parpadeo hacia fuera de la PWA. El colchón de la 4.2.1 evitaba salir, pero cada centinela es una entrada real y Safari anima ese retroceso. Aquí un velo fijo en el borde cancela el toque antes de que el gesto se arme, y solo está en Inicio.
- Si un swipe se cuela igual, Inicio no cambia de pantalla ni de scroll: el `popstate` no pinta nada y el colchón se repone en un turno siguiente.
- En Perfil, en el alta de la ronda y en la hoja de hoyos el gesto sigue volviendo un paso.
- El service worker pasa a `fairway-v4-422` y no recarga con una ronda abierta.

## 4.2.1

Esquema del JSON de copia: 3. Las copias de la 4.0.11, de la 4.1.0, de la 4.1.1, de la 4.1.2, de la 4.1.3 y de la 4.1.3.1 siguen entrando.

- En Inicio, el gesto de volver del iPhone (Safari y la PWA instalada) y el botón Atrás no cierran ni descargan Fairway. Hay varias entradas centinela, el primer toque en Inicio deja una dentro del gesto, y cada atrás las repone en un turno siguiente: iOS ignora un `pushState` hecho en el mismo turno del `popstate`.
- En Perfil, en el alta de la ronda y en la hoja de hoyos el gesto sigue volviendo un paso, como en la 4.1.3.
- El service worker pasa a `fairway-v4-421` y no recarga con una ronda abierta.

## 4.1.3.1

Esquema del JSON de copia: 3. Las copias de la 4.0.11, de la 4.1.0, de la 4.1.1, de la 4.1.2 y de la 4.1.3 siguen entrando.

- En Inicio, el gesto de volver del iPhone y el botón Atrás del navegador no hacen nada: Fairway no se cierra ni se descarga.
- En el resto de pantallas el gesto sigue cerrando la hoja de hoyos o volviendo a la pantalla anterior.
- El service worker pasa a `fairway-v4-4131` y no recarga con una ronda abierta.

## 4.1.3

Esquema del JSON de copia: 3. Las copias de la 4.0.11, de la 4.1.0, de la 4.1.1 y de la 4.1.2 siguen entrando.

- El gesto de volver del iPhone y el botón Atrás del navegador cierran la hoja de hoyos o vuelven a la pantalla anterior. Si todavía hay una pantalla dentro, Fairway no se cierra.
- Con una ronda en curso, el último paso que descargaría la app no hace nada. Los golpes se quedan.
- El service worker pasa a `fairway-v4-413` y no recarga con una ronda abierta.

## 4.1.2

Esquema del JSON de copia: 3. Las copias de la 4.0.11, de la 4.1.0 y de la 4.1.1 siguen entrando.

- Google Drive usa el client id público de OAuth web registrado para `https://ardu01.github.io` y `https://ardu01.github.io/app-golf/`. No hay secreto de cliente en el repositorio. El token sigue solo en memoria. El alcance sigue siendo `drive.file`. El archivo sigue siendo `Fairway/fairway-data.json`.
- El service worker pasa a `fairway-v4-412` y no recarga con una ronda abierta.

## 4.1.1

Esquema del JSON de copia: 3. Las copias de la 4.0.11 y de la 4.1.0 siguen entrando.

- Sale la bolsa de palos: la ficha del hoyo, los nombres guardados y `fairway.bag.v1`. No hay recomendación de palo ni de juego conservador o agresivo.
- Siguen el teléfono del caddie de La Herrería, el árbitro, el marcador y la copia de la ronda.
- El service worker pasa a `fairway-v4-411` y no recarga con una ronda abierta.

## 4.1.0

Esquema del JSON de copia: 3. Las copias de la 4.0.11 siguen entrando.

- IndexedDB guarda una copia verificada del historial, la ronda activa y su `.bak`, el roster, el perfil, el creativo, los presets y los punteros de Drive. `localStorage` no se borra al verificar. No se migra el token de OAuth.
- Los workflows que descargaban V3, aplicaban el parche multi-curso, aplicaban tees, ensamblaban `index.html` o decodificaban `.b64` quedan sin dispatch y sin `git push` en esta rama.
- Google Drive sigue sin client id. El panel lo dice. Un conflicto no sustituye la ronda en curso hasta elegir.
- El service worker pasa a `fairway-v4-410` y no recarga con una ronda abierta.
- Las estadísticas separan Gross · 9 y Gross · 18.
- El teléfono del caddie de La Herrería sigue.
- `el-robledal`, `rshecc-norte` y `rshecc-sur` tienen manifiesto de los planos que ya existían, sin nombres de hoyo.
- La fórmula de hándicap no cambia.

## 4.0.11

Cabecera más baja y ficha del jugador al inicio del hueco. Esquema 3.
