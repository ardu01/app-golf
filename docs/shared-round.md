# Partida compartida

Producto **5.1.0**. El esquema del JSON de copia sigue en **3**. La sala es la de la 5.0.6: esta versión no la amplía. Sin código, Fairway se juega como en la 4.2.4: el marcador lee la ronda de este móvil y no pregunta a nadie. El velo de Inicio de la 4.2.2 sigue. Deslizar la ficha selecciona al jugador, como en la 4.2.4.

En Inicio hay 16px entre la ronda y la ficha de la sala. No van pegadas.

## Qué no cambia

- Sin red se anota igual. El golpe se escribe en `fairway.activeRound.v1` antes de intentar salir.
- Drive personal sigue siendo `Fairway/fairway-data.json`, alcance `drive.file`, client id público de la 4.1.2, token solo en memoria.
- En Perfil, en el alta y en la hoja de hoyos el gesto atrás sigue un paso. En Inicio no sale de la PWA.
- No hay bolsa ni recomendación de palo. El teléfono del caddie de La Herrería sigue.
- No hay servidor de partida ni secreto en el repositorio.

## Qué se añade

En Inicio, en Ajustes y en la hoja de varios móviles: **Crear código** o **Unirme**. El código tiene 6 caracteres del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin 0, 1, I ni O).

Cada cambio de golpes, putts, FIR, GIR, bola o retirado entra en una cola local, `fairway.sharedRound.v1`. Esa clave se espeja en IndexedDB. No entra en el JSON de copia. Una copia vieja de esquema 3 sigue entrando por `validateFairwayBackup`.

Cuando este móvil tiene red, manda la cola. Si no la tiene, el estado dice «Pendiente · sin conexión» y la ronda sigue. Al volver la red se reintenta. Cerrar la ronda intenta un último envío. Si no hubo red, la cola se queda hasta que salga; no se borra el golpe local.

## Fusión

La unidad es un campo: `jugador|hoyo|campo`. El orden es un `seq` de Lamport: el número más alto gana; si empatan, gana el `deviceId` mayor en orden lexicográfico. No es la hora del reloj. Al leer un campo del otro móvil, este móvil sube su contador, así el siguiente golpe local queda por encima.

Un campo que el otro no envía no se borra. Un valor imposible (golpe 99, HTML en la bola) no se aplica. Un golpe local que todavía no tiene `seq` no se sustituye ni se numera al mezclar.

La sala no sustituye la ronda entera. `mergeFairwayBackup` no interviene en estos campos. `POST` en Mantle sí sustituye el JSON entero: si la unión de campos ya es la que hay en la sala, este móvil no vuelve a publicar. Un POST con la foto vieja borraba el hoyo que el otro móvil había escrito. Si el GET de después no trae un campo local, ese campo sigue en la cola.

El documento que se publica, cuando hay algo nuevo, lleva la unión de los campos, no solo los del móvil que escribe. Un jugador que este teléfono todavía no tiene no se borra del JSON.

Quien entra con la tarjeta vacía (sin golpes) adopta el campo, el tee y los jugadores del anfitrión, y pinta sus golpes. Si este móvil ya tenía golpes, no se tiran: se suman los jugadores cuyo id no estaba y se siguen aplicando los campos remotos. Los dos acaban con la misma lista y los mismos golpes. Ids distintos no se pisan; el mismo id es el mismo jugador de la tarjeta.

## Sala

La tarjeta que ven los dos móviles es un JSON público, `https://mantledb.sh/v2/{código}/card` (`FAIRWAY_ROOM_STORE` en `fairway/js/shared-mail.js`). El código de 6 caracteres es el namespace. La entrada se llama `card`. `GET` lee y `POST` sustituye el documento entero. No hay cuenta, ni cabecera de clave, ni llamada para reclamar el namespace: reclamarlo devolvería una clave de escritura y esa clave no puede estar en el repositorio.

CORS permite el origen de la PWA (`access-control-allow-origin: *`). El `fetch` pide `cache: no-store` para que Safari no se quede con una tarjeta vieja. Quien conoce el código puede leer y escribir los golpes. No van cifrados. El servicio borra un namespace sin escrituras a los 30 días. Cada entrada cabe en 64 KB; si la señal WebRTC no entra, se reintenta sin ella. Pasado el cupo diario el servicio responde 429 y este móvil guarda la cola.

Eso es un buzón público, no un servidor de Fairway. Puede caerse, cambiar de sitio o borrar la sala. Mientras responda, dos teléfonos con el mismo código convergen en el mismo documento.

## MQTT

`wss://test.mosquitto.org:8081/mqtt`, tema `fairway/v1/room/{código}`, subprotocolo `mqtt`, mensaje retenido. La URL está en `FAIRWAY_ROOM_BROKER`. No es un secreto.

En la 4.2.5 ese broker era el único buzón. Desde un ordenador el protocolo conecta y el mensaje retenido vuelve. Desde Safari a menudo no: iOS con Private Relay envía `CONNECT` en lugar del cambio a WebSocket, y el propio broker de prueba avisa de que WebSocket y TLS se caen. El código no espera a ese socket. Si abre, republica el mismo JSON para quien esté suscrito. Si no abre, la sala HTTPS sigue.

`FAIRWAY_ROOM_HTTP` queda vacío. Si se rellena con una base que acepte `GET` y `PUT /{código}` y devuelva el JSON de la sala, se usa eso y no Mantle ni el broker. Tampoco es un sitio para poner una clave.

Si la sala HTTPS falla y este móvil ya tiene un token de Drive en memoria, se intenta `Fairway/fairway-room-{código}.json` con el mismo alcance `drive.file`. No se toca `fairway-data.json`. Ese archivo lo ve la cuenta de Google de este móvil, no otra cuenta. No es la tarjeta compartida entre dos teléfonos.

## WebRTC

Opcional y solo si los dos están en línea. La señalización (oferta, respuesta, ICE) va dentro del mismo JSON de la sala. El STUN es `stun:stun.l.google.com:19302`, público, sin credencial. Si el canal no abre, la sala HTTPS sigue. No hace falta tener los dos móviles despiertos a la vez: el que tenga red más tarde lee el documento.

## Módulos

| Archivo | Rol |
| --- | --- |
| `fairway/js/shared-round.js` | Cola, fusión, estado. Sin red y sin DOM |
| `fairway/js/shared-mail.js` | Sala HTTPS. MQTT solo si el socket abre |
| `fairway/js/shared-rtc.js` | Atajo WebRTC. Si no hay `RTCPeerConnection`, no hace nada |
| `fairway/js/shared-boot.js` | Pantalla en español y el arranque en el navegador |

`tests/shared.mjs` cubre la fusión y la cola con un buzón en memoria. No abre el broker ni Google.
