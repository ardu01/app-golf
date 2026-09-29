# Fairway — arquitectura (inicio, fase 2)

Baseline de producto: **4.0.11**. Esquema del JSON de copia: **3**. Este documento describe solo lo que esta rama añade. No es un rediseño de la app.

## Qué sigue siendo la fuente de la partida

La ronda en memoria (`state`, `PLAYERS`) y `localStorage` siguen siendo la copia que lee el marcador. Las fórmulas de hándicap no se han movido de `index.html`. `collectFairwayBackup` sigue escribiendo `version: 3` y `appVersion: "4.0.11"`.

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

El service worker precachea esos cuatro archivos y los trata como shell (`/fairway/js/`). El nombre de caché del shell sigue siendo `fairway-v4-411` para no fingir un release 4.1.0. El CSS no se ha partido.

## Migración

1. Lee las claves vivas de `localStorage` (historial, `.bak`, ronda activa y su `.bak`, roster, host, sello, creativo, presets, `drive.fileId`, `drive.folderId`, `drive.meta`).
2. Guarda esa foto en IndexedDB (`fairway.migration.backup`) **antes** de escribir los datos.
3. Marca `fairway.migration.v1` como `in_progress`. Si la pestaña se cierra, Safari suspende la página o falla una escritura, el siguiente arranque ve esa marca y reanuda. Los originales no se han borrado.
4. El JSON ilegible no se escribe encima de un valor bueno que ya estuviera en IndexedDB. Se anota en `skipped`.
5. Cuota o fallo de escritura: se para, `deletedLocal: false`, estado no verificado.
6. Lee de vuelta y compara. Solo entonces el estado pasa a `verified`.
7. No borra `localStorage` después de verificar. Un segundo arranque con los mismos bytes es un no-op.

Si `localStorage` llega vacío y IndexedDB ya tiene datos verificados (o queda la foto de respaldo), no se vacía IndexedDB. `recoverMissingLocal` rellena solo las claves que faltan. Una ronda activa que ya está en el dispositivo, o una ronda activa corrupta, no se sustituye. Si existe `fairway.activeRound.bak.v1`, no se reescribe la clave principal desde IndexedDB: sigue valiendo la recuperación que ya tenía la app.

`drive.meta` se copia sin `access_token`, `refresh_token`, `id_token` ni `token`. El access token de la sesión sigue solo en memoria.

## Workflow multi-curso

En esta rama `apply-fairway-multicourse.yml` no tiene `workflow_dispatch`, no copia `sw.js` y no hace `git push`. En `main`, hasta que esto se fusione, el archivo viejo sigue pudiendo pisar `index.html` y `sw.js`. No se fusiona desde esta fase.
