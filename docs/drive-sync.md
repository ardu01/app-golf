# Google Drive

Fairway puede copiar el JSON de la partida al Drive de cada jugador. No hay servidor de Fairway ni secreto de cliente en el repositorio.

## Qué hay hoy

`FAIRWAY_DRIVE_CLIENT_ID` en `index.html` está vacío a propósito. No se inventa un client id. Sin ese valor, `driveConnect()` avisa «Esta copia de Fairway todavía no tiene Google Drive configurado.» y no llama a Google.

El alcance es `https://www.googleapis.com/auth/drive.file`. El archivo es `Fairway/fairway-data.json`. El access token vive solo en memoria (`_driveToken`). `fairway.drive.meta` guarda banderas y sellos, no el token. La migración a IndexedDB copia esa meta sin `access_token`, `refresh_token`, `id_token` ni `token`.

El esquema del JSON sigue en 3.

## Cómo se ve en la app

`driveUiState` distingue, en este orden: conflicto, reconexión, conectando, sin configurar (solo si `configured === false`), no conectado, sincronizando, sin conexión, cambios pendientes, sincronizado.

Si el client id está vacío, el panel dice **Sin configurar**. Un conflicto sigue ganando a esa etiqueta.

Si hay conflicto, los botones siguen siendo «Usar este dispositivo» y «Usar Google Drive». El texto dice que la ronda en curso no se sustituye hasta que el jugador elija. Elegir Drive no pisa una ronda protegida ni una pantalla de juego: eso ya lo hace `driveApplyResolved`. El perfil (`fairway.host.v1`) sí se escribe con la copia que se aplica. No se ha cambiado esa fusión.

## Registrar el client id (cuando Miguel o Bob lo tengan)

1. En Google Cloud, crear un cliente OAuth de tipo **aplicación web**. No hace falta client secret para el flujo que usa esta copia (GIS, token en memoria).
2. Origen JavaScript autorizado: `https://ardu01.github.io`.
3. El alcance que pide el código es `drive.file`.
4. Pegar solo el client id público en `FAIRWAY_DRIVE_CLIENT_ID`. No commitear tokens, ni un refresh token, ni un secreto.
5. Subir la versión del shell (`sw.js`) en el mismo cambio de producto, para que el teléfono coja el `index.html` nuevo. No recarga a mitad de ronda: `fairwayShouldHoldUpdate` lo impide.

Una sesión silenciosa de varias semanas necesitaría un backend. Esta copia no lo finge.

## Lo que no se puede probar aquí

Sin un client id registrado para el origen de Pages, el sync real contra Google sigue bloqueado. `tests/drive.mjs` cubre el plan, el merge y el saneado con datos ficticios. `tests/pwa.mjs` cubre que la actualización esperando no recarga el hoyo, la tarjeta, el cierre ni una ronda armada.
