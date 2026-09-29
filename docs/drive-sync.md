# Google Drive

Fairway puede copiar el JSON de la partida al Drive de cada jugador. No hay servidor de Fairway ni secreto de cliente en el repositorio.

## Qué hay hoy

La **4.1.2** lleva el client id público de OAuth web ya registrado para `https://ardu01.github.io` y `https://ardu01.github.io/app-golf/`. Está en `FAIRWAY_DRIVE_CLIENT_ID` en `index.html`. Es un identificador público, no un secreto. No hay client secret, ni JSON de cuenta de servicio, ni token en el repositorio.

El alcance es `https://www.googleapis.com/auth/drive.file`. El archivo es `Fairway/fairway-data.json`. El access token vive solo en memoria (`_driveToken`). `fairway.drive.meta` guarda banderas y sellos, no el token. La migración a IndexedDB copia esa meta sin `access_token`, `refresh_token`, `id_token` ni `token`.

El esquema del JSON sigue en 3.

Si el client id estuviera vacío, `driveConnect()` avisaría «Esta copia de Fairway todavía no tiene Google Drive configurado.» y no llamaría a Google. Con el id de esta versión ese aviso no sale por falta de id.

## Cómo se ve en la app

`driveUiState` distingue, en este orden: conflicto, reconexión, conectando, sin configurar (solo si `configured === false`), no conectado, sincronizando, sin conexión, cambios pendientes, sincronizado.

Si el client id está vacío, el panel dice **Sin configurar**. Un conflicto sigue ganando a esa etiqueta.

Si hay conflicto, los botones siguen siendo «Usar este dispositivo» y «Usar Google Drive». El texto dice que la ronda en curso no se sustituye hasta que el jugador elija. Elegir Drive no pisa una ronda protegida ni una pantalla de juego: eso ya lo hace `driveApplyResolved`. El perfil (`fairway.host.v1`) sí se escribe con la copia que se aplica. No se ha cambiado esa fusión.

## Client id de producción

El cliente OAuth de tipo aplicación web ya está dado de alta para el origen `https://ardu01.github.io`. Esta copia solo guarda ese client id público. No hace falta client secret para el flujo que usa la app (GIS, token en memoria), y no se commitea ninguno.

El alcance que pide el código es `drive.file`. El shell de esta versión es `fairway-v4-412`, para que el teléfono coja el `index.html` nuevo. No recarga a mitad de ronda: `fairwayShouldHoldUpdate` lo impide.

Una sesión silenciosa de varias semanas necesitaría un backend. Esta copia no lo finge.

## Lo que no se puede probar aquí

No hay credenciales de Google en CI. `tests/drive.mjs` cubre el plan, el merge y el saneado con datos ficticios, y que el client id público está en el código y no hay `client_secret`. No abre una sesión real contra Drive y no afirma un E2E. `tests/pwa.mjs` cubre que la actualización esperando no recarga el hoyo, la tarjeta, el cierre ni una ronda armada.

## 4.2.2

La partida compartida no usa `fairway-data.json`. Si Drive ya está conectado en este móvil y el buzón público no responde, el mismo alcance `drive.file` puede guardar `Fairway/fairway-room-CÓDIGO.json`. Ese archivo lo ve esta cuenta de Google, no un amigo con otra cuenta. El client id sigue siendo el público de la 4.1.2. No hay secreto nuevo. El detalle está en `docs/shared-round.md`.
