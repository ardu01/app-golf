# Changelog

## 4.2.5

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 4.2.4 siguen entrando.

- Partida compartida, opcional. Sin código, la ronda sigue solo en este móvil, con o sin cobertura.
- Crear o unirse con un código de 6 caracteres. Cada golpe se encola aquí y sale cuando algún móvil tiene red.
- La fusión es por marca de tiempo de cada hoyo y jugador. Un campo que no llega no borra lo anotado.
- El buzón por defecto es un MQTT público sin credenciales. Si falla y Drive ya está conectado, se usa un archivo aparte en la misma carpeta Fairway. WebRTC es un atajo opcional, no hace falta para jugar.
- La cola vive en `fairway.sharedRound.v1`. No entra en `fairway-data.json`.
- En Inicio, el toque del borde cancela el swipe antes de crear historia. Si el `popstate` entra igual, `history.go(1)` devuelve la misma pantalla. El velo de la 4.2.2 sigue. Perfil, el alta y la hoja de hoyos siguen un paso. Deslizar la ficha del hoyo sigue seleccionando al jugador, como en la 4.2.4.
- El service worker pasa a `fairway-v4-425` y no recarga con una ronda abierta.
- No vuelven los workflows que hacían `git push`. Los planos de `holes/` siguen.

## 4.2.4

Esquema del JSON de copia: 3. Las copias de la 4.0.11, de la 4.1.x, de la 4.2.1, de la 4.2.2 y de la 4.2.3 siguen entrando.

- En el marcador del hoyo, al deslizar hasta la ficha de otro jugador, ese jugador queda seleccionado: es el jugador activo de golpes, putts, FIR y GIR, igual que si se tocara la ficha.
- Con un solo jugador la ficha no cambia de selección.
- El service worker pasa a `fairway-v4-424` y no recarga con una ronda abierta.

## 4.2.3

Esquema del JSON de copia: 3. Las copias de la 4.0.11, de la 4.1.x, de la 4.2.1 y de la 4.2.2 siguen entrando.

- Salen del repositorio los workflows que descargaban otra app o hacían `git push`: `publish-fairway-v3`, `apply-fairway-multicourse`, `apply-player-tees`, `assemble-fairway-index` y `decode-fairway-binaries`. En la 4.2.2 ya estaban apagados (`if: false`); aquí dejan de estar dados de alta.
- `test-fairway.yml` sigue lanzando `node tests/run.mjs` con `contents: read`. Pages sigue en el publicador legacy de `main`. No hay un segundo `deploy-pages`.
- Los planos de `holes/` (404 webp), los manifiestos y la ficha Mapa del hoyo no cambian.
- El service worker pasa a `fairway-v4-423` y no recarga con una ronda abierta.

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
