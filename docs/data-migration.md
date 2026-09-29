# Migración de datos

El marcador sigue leyendo `localStorage`. IndexedDB (`fairway`, versión 1, almacén `kv`) es una copia verificada de las mismas claves. No es un segundo marcador.

El JSON de copia sigue en **esquema 3**. `appVersion` dentro de ese JSON es el texto de producto (`4.1.2`). Una copia de la 4.0.11, de la 4.1.0 o de la 4.1.1, que también eran esquema 3, entra por `validateFairwayBackup`.

## Claves que se copian

- `fairway.rounds.v1` y `fairway.rounds.bak.v1`
- `fairway.activeRound.v1` y `fairway.activeRound.bak.v1`
- `fairway.savedPlayers.v1`
- `fairway.host.v1`
- `fairway.dataUpdatedAt`
- `fairway.creative.v1` y `fairway.creativePresets.v1`
- `fairway.drive.fileId`, `fairway.drive.folderId`, `fairway.drive.meta`

No se copian `fairway.drive.clientId` ni el access token. `drive.meta` se guarda sin `access_token`, `refresh_token`, `id_token` ni `token`.

`fairway.bag.v1` ya no se copia. Si todavía estaba en el teléfono, el arranque la borra. La ronda activa no entra en ese borrado.

## Pasos

1. Foto de esas claves.
2. Esa foto se escribe en `fairway.migration.backup` **antes** que los datos.
3. `fairway.migration.v1` pasa a `in_progress`. Si la pestaña se cierra, Safari suspende la página o falla una escritura, el siguiente arranque reanuda. Los originales siguen en `localStorage`.
4. Un JSON ilegible no pisa un valor bueno que ya estuviera en IndexedDB.
5. Cuota o fallo de escritura: se para. `deletedLocal` queda en false.
6. Se lee de vuelta y se compara. Solo entonces el estado es `verified`.
7. No se borra `localStorage` después de verificar. Un segundo arranque con los mismos bytes no reescribe.

Si `localStorage` llega vacío y IndexedDB ya tiene datos, no se vacía IndexedDB. La recuperación rellena solo las claves que faltan. Una ronda activa presente, o una ronda activa corrupta, no se sustituye. Si existe la `.bak` de la ronda activa, no se reescribe la clave principal desde IndexedDB.

Quitar solo la ronda activa, con el historial todavía en el dispositivo, sí quita esa clave de IndexedDB. Un borrado total de las claves locales no vacía IndexedDB: el siguiente arranque puede recuperarlas.
