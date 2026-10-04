# Changelog

## 5.0.6

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 5.0.5 siguen entrando.

- Dos móviles con el mismo código ya no se pisan los golpes. La fusión sigue por campo. Un hoyo que el otro no manda no se borra. Gana el `seq` más alto; si empatan, el `deviceId` mayor. Ver el `seq` remoto sube el contador de este móvil.
- Si el mapa de campos ya es el de la sala, este móvil no hace POST. Ese POST sustituye el JSON entero y una foto vieja borraba los hoyos del otro. Si el GET posterior no trae un campo local, el campo sigue en `fairway.sharedRound.v1`.
- Sin red se sigue anotando en localStorage. La cola no se vacía y sale cuando hay red. No entra en el JSON de copia.
- La versión de producto es 5.0.6: cabecera, perfil, manifiesto y `appVersion` del JSON.
- El service worker pasa a `fairway-v5-506`. No hace `skipWaiting` al instalar y no recarga con una ronda abierta.
- Quedó publicada como v5.0.6, el 2026-10-04T16:46:13Z, sobre `d08b685299e2069226ae218eed4cbcca1ef74e36`.

## 5.0.5

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 5.0.4 siguen entrando.

- Al guardar la ronda en curso, la `.bak` se queda con la tarjeta recién escrita si esa tarjeta conserva cada jugador y cada clave de scores, putts, fir y gir (y totalsGross / totalsPutts si no eran null) de la última tarjeta buena. El primer guardado también crea la `.bak`. Si falta la clave principal, los golpes del último guardado vuelven con esa copia.
- Una tarjeta que pierde un golpe no pisa `fairway.activeRound.bak.v1`. Una clave principal ilegible con `.bak` buena tampoco.
- La versión de producto es 5.0.5: cabecera, perfil, manifiesto y `appVersion` del JSON.
- El service worker pasa a `fairway-v5-505`. No hace `skipWaiting` al instalar y no recarga con una ronda abierta.
- Quedó publicada como v5.0.5, el 2026-10-04T15:37:03Z, sobre `0b961329dfdc5b0774896e5d1bf948761d8116fd`.

## 5.0.4

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 5.0.3 siguen entrando.

- Al guardar el historial, la `.bak` se queda con la lista recién escrita si esa lista conserva cada id que ya estaba. Si falta la clave principal, la ronda recién cerrada vuelve con esa copia.
- Una lista que pierde un id no pisa `fairway.rounds.bak.v1`. Una clave principal ilegible tampoco.
- La versión de producto es 5.0.4: cabecera, perfil, manifiesto y `appVersion` del JSON.
- El service worker pasa a `fairway-v5-504`. No hace `skipWaiting` al instalar y no recarga con una ronda abierta.
- Quedó publicada como v5.0.4, el 2026-10-03T22:52:59Z, sobre `8b5752ffe311928458958e875f4b82e536fe732d`.

## 5.0.3

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 5.0.2 siguen entrando.

- La lista del paso Campo y los paneles grandes usan `--glass-r-card` (16px). Las fichas de modalidad y los botones de golpe usan `--glass-r-chip` (12px). La hoja de invitar y la de elegir hoyo redondean arriba con `--glass-r-sheet` (20px).
- La fila del campo elegido no pinta un aro inset cuadrado sobre la lista. La banda del borde sigue en 30px. El padding de Inicio sigue en `6px 32px 22px 32px`.
- La versión de producto es 5.0.3: cabecera, perfil, manifiesto y `appVersion` del JSON.
- El service worker pasa a `fairway-v5-503`. No hace `skipWaiting` al instalar y no recarga con una ronda abierta.
- Quedó publicada como v5.0.3, el 2026-10-03T22:40:43Z, sobre `a23a9b872d23928d29b31c6605ffdfdfb49e6700`.

## 5.0.2

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 5.0.1 siguen entrando.

- Si falta `fairway.rounds.v1` y la `.bak` tiene partidas, el historial vuelve de esa copia. Una lista vacía válida no se sustituye.
- Una clave principal ilegible no se copia encima de `fairway.rounds.bak.v1`.
- La versión de producto es 5.0.2: cabecera, perfil, manifiesto y `appVersion` del JSON.
- El service worker pasa a `fairway-v5-502`. No hace `skipWaiting` al instalar y no recarga con una ronda abierta.

## 5.0.1

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 5.0.0 siguen entrando.

- Inicio queda centrado: el mismo padding a izquierda y derecha. La banda del borde se queda.
- La versión de producto es 5.0.1: cabecera, perfil, manifiesto y `appVersion` del JSON.
- El service worker pasa a `fairway-v5-501`. No hace `skipWaiting` al instalar y no recarga con una ronda abierta.

## 5.0.0

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 4.2.6 siguen entrando.

- La versión de producto es 5.0.0: cabecera, perfil, manifiesto y `appVersion` del JSON.
- El service worker pasa a `fairway-v5-500`. No hace `skipWaiting` al instalar y no recarga con una ronda abierta.
- Siguen las fórmulas de tanteo, el catálogo, la navegación, la partida compartida y Drive.

## 4.2.6

Esquema del JSON de copia: 3. Las copias de la 4.0.11 a la 4.2.5 siguen entrando.

- En Inicio, la ficha de la partida compartida ya no va pegada a la ronda. Hay 16px entre las dos, el margen habitual de iOS. En Ajustes y en la hoja de varios móviles la ficha también respira.
- Dos móviles con el mismo código comparten la misma tarjeta. El documento está en `https://mantledb.sh/v2/{código}/card`. No hay cuenta ni clave. Quien tiene el código puede leer los golpes; no van cifrados. Una sala sin escrituras se borra a los 30 días. Cada entrada cabe en 64 KB.
- El MQTT `wss://test.mosquitto.org:8081/mqtt` sigue como aviso en vivo, con subprotocolo `mqtt` y mensaje retenido. En Safari ese socket a menudo no abre (iOS con Private Relay manda CONNECT en vez del cambio a WebSocket; el broker de prueba también deja caer WebSocket y TLS). Si el socket no abre, la sala HTTPS sigue. No bloquea el envío.
- Drive, si el buzón público no responde, sigue siendo un archivo de esta cuenta de Google. Otro teléfono con otra cuenta no lo ve. No es la tarjeta compartida.
- Quien se une con la tarjeta vacía adopta jugadores, campo y golpes del anfitrión. Si los ids no coinciden, se suman los jugadores que faltan y se siguen aplicando los golpes remotos. Un móvil no borra el hoyo que solo tiene el otro.
- El service worker pasa a `fairway-v4-426` y no recarga con una ronda abierta.
- Siguen el esquema 3, el velo de Inicio de la 4.2.2, la selección al deslizar la ficha de la 4.2.4 y los mapas. No vuelven los workflows que hacían `git push`.
- Drive no tira el golpe que el otro móvil no tiene: la misma partida se fusiona por hoyo, también cuando la descarga llevaría `mergeRounds` en false. Con la ronda protegida o en pantalla de juego no se escribe `fairway.host.v1` ni el hándicap en memoria. Una clave local vacía no borra la copia buena de IndexedDB. `deletedLocal` sigue en false.

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
