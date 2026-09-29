# Partida compartida

Producto **4.2.5**. El esquema del JSON de copia sigue en **3**. Sin código, Fairway se juega como en la 4.2.4: el marcador lee la ronda de este móvil y no pregunta a nadie. El velo de Inicio de la 4.2.2 sigue. Deslizar la ficha selecciona al jugador, como en la 4.2.4.

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

La unidad es un campo: `jugador|hoyo|campo`. Gana la marca de tiempo más nueva. Si las dos marcas son iguales, se queda la de este móvil.

Un campo que el otro no envía no se borra. Un valor imposible (golpe 99, HTML en la bola) no se aplica. Un valor local que todavía no tenía marca se sella con la hora de este móvil antes de mezclar, para que una sala más vieja no lo pise.

La sala no sustituye la ronda entera. `mergeFairwayBackup` no interviene en estos campos.

## Buzón

El transporte por defecto es un mensaje retenido en el broker público `wss://test.mosquitto.org:8081/mqtt`, tema `fairway/v1/room/{código}`. No hay usuario ni clave. La URL está en `FAIRWAY_ROOM_BROKER` (`fairway/js/shared-mail.js`). No es un secreto: cualquiera con el código puede leer la sala. Los golpes no van cifrados.

`FAIRWAY_ROOM_HTTP` queda vacío. Si se rellena con una base que acepte `GET` y `PUT /{código}` y devuelva el JSON de la sala, se usa eso y no el broker. Tampoco es un sitio para poner una clave.

Si el buzón falla y este móvil ya tiene un token de Drive en memoria, se intenta `Fairway/fairway-room-{código}.json` con el mismo alcance `drive.file`. No se toca `fairway-data.json`. Ese archivo lo ve la cuenta de Google de este móvil, no otra cuenta. Sirve de reserva, no de sala entre amigos.

## WebRTC

Opcional y solo si los dos están en línea. La señalización (oferta, respuesta, ICE) va dentro del mismo JSON de la sala. El STUN es `stun:stun.l.google.com:19302`, público, sin credencial. Si el canal no abre, el buzón sigue. No hace falta tener los dos móviles despiertos a la vez: el que tenga red más tarde recoge el mensaje retenido.

## Módulos

| Archivo | Rol |
| --- | --- |
| `fairway/js/shared-round.js` | Cola, fusión, estado. Sin red y sin DOM |
| `fairway/js/shared-mail.js` | Buzón MQTT o HTTP |
| `fairway/js/shared-rtc.js` | Atajo WebRTC. Si no hay `RTCPeerConnection`, no hace nada |
| `fairway/js/shared-boot.js` | Pantalla en español y el arranque en el navegador |

`tests/shared.mjs` cubre la fusión y la cola con un buzón en memoria. No abre el broker ni Google.
