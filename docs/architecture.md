# Fairway — arquitectura

Partida documentada abajo: **4.0.11**. El producto de `main` tras la 4.1.4 es **4.1.4**. Esquema del JSON de copia: **3**. Workflows y mapas de esa versión: `docs/rearme-4.1.4.md`. Lo que sigue describe la migración y Drive; el nombre de caché vigente es `fairway-v4-414`.

## Qué sigue siendo la fuente de la partida

La ronda en memoria (`state`, `PLAYERS`) y `localStorage` siguen siendo la copia que lee el marcador. Las fórmulas de hándicap no se han movido de `index.html`. `collectFairwayBackup` escribe `version: 3` y `appVersion: "4.1.2"`.

IndexedDB es una copia verificada de esas claves, no un segundo marcador. Importar un JSON o aplicar Drive sigue pasando por `mergeFairwayBackup` y `driveApplyResolved`, que ya no pisan una ronda local protegida. La migración no es un import remoto: copia lo que ya está en este dispositivo.

## Módulos

Sin bundler. GitHub Pages sirve los archivos tal cual. `index.html` carga al final:

`fairway/js/persist-boot.js` → `persistence.js` + `idb.js` + `keys.js`.

| Archivo | Rol |
| --- | --- |
| `fairway/js/keys.js` | Nombres de clave y esquema 3. No incluye `fairway.drive.clientId` ni el token de OAuth |
| `fairway/js/persistence.js` | Migración, verificación, recuperación, espejo. Funciones puras sobre un adaptador |
| `fairway/js/idb.js` | `indexedDB.open("fairway", 1)`, almacén `kv` |
| `fairway/js/persist-boot.js` | Arranque en el navegador |

El service worker precachea esos archivos y los trata como shell (`/fairway/js/`). El nombre de caché del shell en la 4.1.4 es `fairway-v4-414`. El CSS no se ha partido. La puntuación sigue en `index.html`.

## Migración

Antes de copiar, el arranque borra `fairway.bag.v1` de `localStorage` y de IndexedDB si queda de una versión anterior. Esa clave no entra en la lista.

1. Lee las claves vivas de `localStorage` (historial, `.bak`, ronda activa y su `.bak`, roster, host, sello, creativo, presets, `drive.fileId`, `drive.folderId`, `drive.meta`).
2. Guarda esa foto en IndexedDB (`fairway.migration.backup`) **antes** de escribir los datos.
3. Marca `fairway.migration.v1` como `in_progress`. Si la pestaña se cierra, Safari suspende la página o falla una escritura, el siguiente arranque ve esa marca y reanuda. Los originales no se han borrado.
4. El JSON ilegible no se escribe encima de un valor bueno que ya estuviera en IndexedDB. Se anota en `skipped`.
5. Cuota o fallo de escritura: se para, `deletedLocal: false`, estado no verificado.
6. Lee de vuelta y compara. Solo entonces el estado pasa a `verified`.
7. No borra `localStorage` después de verificar. Un segundo arranque con los mismos bytes es un no-op.

Si `localStorage` llega vacío y IndexedDB ya tiene datos verificados (o queda la foto de respaldo), no se vacía IndexedDB. `recoverMissingLocal` rellena solo las claves que faltan. Una ronda activa que ya está en el dispositivo, o una ronda activa corrupta, no se sustituye. Si existe `fairway.activeRound.bak.v1`, no se reescribe la clave principal desde IndexedDB: sigue valiendo la recuperación que ya tenía la app.

`drive.meta` se copia sin `access_token`, `refresh_token`, `id_token` ni `token`. El access token de la sesión sigue solo en memoria.

## Workflows que escribían en la rama

Desde la 4.1.4 esos cinco archivos no están en el repositorio. El único workflow versionado es `test-fairway.yml` (`node tests/run.mjs`, `contents: read`). Pages sigue en el publicador legacy de `main`. El detalle y lo que se borró (`ops/`, `patches/`) está en `docs/rearme-4.1.4.md`.

## Drive y el service worker

`FAIRWAY_DRIVE_CLIENT_ID` es el client id público de OAuth web para `https://ardu01.github.io` y `https://ardu01.github.io/app-golf/`. El detalle está en `docs/drive-sync.md`. El panel dice «Sin configurar» cuando el id no está. Un conflicto sigue mostrando «Conflicto» y no sustituye la ronda en curso hasta que el jugador elige.

El nombre de caché del shell es `fairway-v4-414`. `fairwayShouldHoldUpdate` impide `SKIP_WAITING` y el reload mientras la pantalla es de juego, de cierre, o hay ronda armada. `tests/pwa.mjs` lo fija. No hay caché de planos.

## Stats

`statsGrossByLayout` separa el gross de 9 y el de 18. No los promedia juntos. La media dentro de cada largo es la misma media aritmética de `me.gross` que ya había. `courseHandicapFor` sigue en `index.html` (`hi * slope / 113`). No se ha extraído la puntuación: la suite la saca por texto y un traslado que no sea idéntico cambiaría el número.

No hay bolsa de palos ni recomendación de juego. El enlace `tel:` del caddie de La Herrería sigue en el hoyo. El área de toque de las fichas de acceso pasa a 48×48.

## Cartografía

La 4.1.4 no publica planos. No hay `holes/`, ni `HOLE_MAP_COURSES`, ni centros para una ortofoto. El marcador no pide imágenes de hoyo.
