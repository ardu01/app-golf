# Fairway — arquitectura

Producto **5.1.0**. Esquema del JSON de copia: **3**. No es un rediseño de la app. La release publicada sigue siendo **v5.0.6** (2026-10-04T16:46:13Z, `d08b685299e2069226ae218eed4cbcca1ef74e36`) hasta que Lider publique la 5.1.0.

## Qué es la fuente de la partida

La ronda en memoria (`state`, `PLAYERS`) y `localStorage` son la copia que lee el marcador. Hay un solo escritor de `fairway.activeRound.v1`: `fairway/js/rounds.js`.

- El marcador no asigna golpes, putts, FIR, GIR ni totales por su cuenta. Llama a `commitActiveScore`, `adjustActiveScore`, `commitActivePutts`, `adjustActivePutts`, `commitActiveMark` y `commitActiveTotal`. Esas funciones mutan la tarjeta y llaman a `persistActiveRound`.
- `persistActiveRound`, `restoreActiveRound` y `recoverActiveRoundFromBackup` escriben la clave con `storageSetItem`. `persistActiveRound` es quien actualiza `fairway.activeRound.bak.v1` cuando la tarjeta nueva conserva las marcas de la última tarjeta buena.
- Importar un JSON (`mergeFairwayBackup`) y aplicar Drive (`driveApplyResolved`) no hacen `localStorage.setItem` de la ronda activa. Llaman a `writeStoredActiveRound`, que usa el mismo `storageSetItem` y no mueve la `.bak`.
- Ajustes, si edita una vuelta del historial, guarda con `saveEditingRoundDraft`. No hay una segunda copia de ese registro en la página.
- `rounds-boot.js` publica esas funciones en `window`.

Las fórmulas de hándicap viven en `fairway/js/scoring.js` (`courseHandicapFor`: `hi * slope / 113`). `collectFairwayBackup` escribe `version: 3` y `appVersion: "5.1.0"`. La cola `fairway.sharedRound.v1` no entra en ese JSON.

IndexedDB es una copia verificada de esas claves, no un segundo marcador. Importar un JSON o aplicar Drive sigue pasando por `mergeFairwayBackup` y `driveApplyResolved`, que no pisan una ronda local protegida. La migración no es un import remoto: copia lo que ya está en este dispositivo.

## Módulos

Sin bundler. GitHub Pages sirve los archivos tal cual. `index.html` carga `fairway/js/courses.js` (script clásico) y, al final, los módulos:

`scoring-boot.js` → `scoring.js`. `rounds-boot.js` → `rounds.js`. `persist-boot.js` → `persistence.js` + `idb.js` + `keys.js`. `shared-boot.js` → `shared-round.js` + `shared-mail.js` + `shared-rtc.js`.

| Archivo | Rol |
| --- | --- |
| `fairway/js/keys.js` | Nombres de clave, `APP_VERSION` 5.1.0 y esquema 3. No incluye `fairway.drive.clientId` ni el token de OAuth. `fairway.bag.v1` está en `RETIRED_KEYS` |
| `fairway/js/courses.js` | Catálogo (`let COURSES`). Script clásico |
| `fairway/css/fairway.css` | Estilos. El `<head>` de `index.html` lo enlaza |
| `fairway/js/scoring.js` | Tanteo en vivo: CH, golpes recibidos, Stableford, clasificación. `scoring-boot.js` lo publica en `window` |
| `fairway/js/rounds.js` | Historial y ronda en curso. Único escritor de `fairway.activeRound.v1` |
| `fairway/js/persistence.js` | Migración, verificación, recuperación, espejo. Funciones puras sobre un adaptador |
| `fairway/js/idb.js` | `indexedDB.open("fairway", 1)`, almacén `kv` |
| `fairway/js/persist-boot.js` | Arranque del espejo en el navegador |
| `fairway/js/shared-round.js` | Sala opcional. No es el marcador |
| `fairway/js/shared-mail.js` | Buzón HTTPS de la sala |
| `fairway/js/shared-rtc.js` | Atajo opcional. No hace falta para jugar |
| `fairway/js/shared-boot.js` | Arranque de la sala en el navegador |

El service worker precachea esos archivos y los trata como shell (`/fairway/js/` y `/fairway/css/`). El nombre de caché del shell es `fairway-v5-510` (5.1.0).

## Migración

Antes de copiar, el arranque borra `fairway.bag.v1` de `localStorage` y de IndexedDB si queda de una versión anterior. Esa clave no entra en la lista.

1. Lee las claves vivas de `localStorage` (historial, `.bak`, ronda activa y su `.bak`, roster, host, sello, creativo, presets, `drive.fileId`, `drive.folderId`, `drive.meta`).
2. Guarda esa foto en IndexedDB (`fairway.migration.backup`) **antes** de escribir los datos.
3. Marca `fairway.migration.v1` como `in_progress`. Si la pestaña se cierra, Safari suspende la página o falla una escritura, el siguiente arranque ve esa marca y reanuda. Los originales no se han borrado.
4. El JSON ilegible no se escribe encima de un valor bueno que ya estuviera en IndexedDB. Se anota en `skipped`.
5. Cuota o fallo de escritura: se para, `deletedLocal: false`, estado no verificado.
6. Lee de vuelta y compara. Solo entonces el estado pasa a `verified`.
7. No borra `localStorage` después de verificar. Un segundo arranque con los mismos bytes es un no-op.

Si `localStorage` llega vacío y IndexedDB ya tiene datos verificados (o queda la foto de respaldo), no se vacía IndexedDB. Una clave local vacía, con otras claves todavía en el dispositivo, tampoco borra la copia buena de IndexedDB. `recoverMissingLocal` rellena solo las claves que faltan. Una ronda activa que ya está en el dispositivo, o una ronda activa corrupta, no se sustituye. Si existe `fairway.activeRound.bak.v1`, no se reescribe la clave principal desde IndexedDB: sigue valiendo la recuperación que ya tenía la app.

`drive.meta` se copia sin `access_token`, `refresh_token`, `id_token` ni `token`. El access token de la sesión sigue solo en memoria.

## Workflows

Desde la 4.2.3 el único workflow del repo es `test-fairway.yml`: lanza `node tests/run.mjs` con `contents: read`. No hay `git push`. Los cinco que descargaban otra app o empujaban la rama (`publish-fairway-v3`, multicourse, tees, assemble, decode) no están y esta rama no los vuelve a crear. Los planos de `holes/` siguen.

## Drive y el service worker

`FAIRWAY_DRIVE_CLIENT_ID` es el client id público de OAuth web para `https://ardu01.github.io` y `https://ardu01.github.io/app-golf/`. El detalle está en `docs/drive-sync.md`. El panel dice «Sin configurar» cuando el id no está. Un conflicto sigue mostrando «Conflicto» y no sustituye la ronda en curso hasta que el jugador elige.

El nombre de caché del shell es `fairway-v5-510`. El `install` no llama a `skipWaiting`. `fairwayShouldHoldUpdate` impide `SKIP_WAITING` y el reload mientras la pantalla es de juego, de cierre, o hay ronda armada. `tests/pwa.mjs` lo fija. El colchón de Inicio de la 4.2.1 sigue.

## Stats

`statsGrossByLayout` separa el gross de 9 y el de 18. No los promedia juntos. La media dentro de cada largo es la misma media aritmética de `me.gross` que ya había. `courseHandicapFor` está en `fairway/js/scoring.js` (`hi * slope / 113`).

No hay bolsa de palos ni recomendación de juego. El enlace `tel:` del caddie de La Herrería sigue en el hoyo.

## Cartografía

`el-robledal`, `rshecc-norte` y `rshecc-sur` tienen manifiesto de los `01.webp`–`18.webp` que ya estaban. Sin nombres de hoyo. No se han creado planos ni se han movido coordenadas `approx: true`. Los campos sin carpeta, Puerta de Hierro incluida, siguen sin carpeta.

## Partida compartida

El detalle está en `docs/shared-round.md`. El marcador no la necesita: sin código, la ronda sigue solo en este móvil. Con código, cada cambio de golpe, putt, FIR, GIR, bola o retirado se encola en `fairway.sharedRound.v1` y sale cuando hay red. La fusión es por campo: gana el `seq` más alto (al ver el del otro móvil, el siguiente golpe de este queda por encima) y, si empatan, el `deviceId` mayor. Un hoyo que el otro móvil no manda no se borra. Si ese mapa ya es el de la sala, este móvil no hace POST: el POST sustituye el documento entero y una foto vieja borraba los hoyos del otro. Esta rama no amplía esa sala.

Esa cola no entra en el JSON de esquema 3. Las copias de la 4.0.11 a la 5.0.6 siguen entrando. El documento común es `https://mantledb.sh/v2/{código}/card`, sin clave. El MQTT público es solo un aviso si el socket abre; en Safari a menudo no abre, y Drive no sirve para dos cuentas distintas. El shell es `fairway-v5-510`. El velo de Inicio de la 4.2.2 sigue, y el toque del borde no crea historia antes de cancelarse. Deslizar la ficha del hoyo sigue seleccionando al jugador, como en la 4.2.4. Drive de la 4.1.2 sigue siendo la copia personal `Fairway/fairway-data.json`. No hay bolsa ni caddie. Los workflows que hacían `git push` no vuelven.
