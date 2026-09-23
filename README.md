<p align="center">
  <img src="icons/icon-192.png" alt="Fairway" width="88" />
</p>

<h1 align="center">Fairway</h1>

<p align="center">
  El marcador de golf que cabe en una mano.<br>
  Anotas la vuelta en el móvil, con cobertura o sin ella.
</p>

<p align="center">
  <img src="docs/recorrido/partida/inicio.webp" alt="Pantalla de inicio, con la ronda en curso y los accesos" width="280" />
</p>

Fairway es una aplicación web que se instala en el teléfono y se comporta como una app. Sirve para apuntar la partida mientras juegas: golpes, putts, bruto, neto y Stableford, con el hándicap del campo ya repartido. Varias personas pueden anotar en el mismo móvil. Los campos traen su tarjeta, el CR y el slope. Donde hay plano de hoyo, se abre desde el marcador.

No hace falta una cuenta. La vuelta, el historial y el perfil se quedan en ese dispositivo.

## Qué puedes hacer en la vuelta

Abres un campo, eliges tee y jugadores, y el marcador queda en el hoyo. Cada golpe se entra con un toque. La tarjeta enseña bruto y neto. La clasificación sigue los modos que hayas activado, oficiales y sociales, y al cerrar la ronda quedan los ganadores.

El hándicap sigue el sistema mundial (WHS): con el Handicap Index, el Course Rating y el Slope sale el Course Handicap, y de ahí los golpes de cada hoyo. En nueve hoyos el reparto usa el índice de dificultad de esos nueve hoyos, no el de la vuelta de dieciocho.

Si surge una duda de reglamento, Árbitro abre un chat en la propia partida. Cuentas el lie. Si falta un dato, pregunta. Cuando ya puede decidir, aplica las Reglas de Golf (R&A y USGA) y deja la cita al final.

<p align="center">
  <img src="docs/recorrido/partida/marcador.webp" alt="Marcador del hoyo, con golpes y putts" width="220" />
  <img src="docs/recorrido/partida/tarjeta-neta.webp" alt="Tarjeta neta de la vuelta" width="220" />
  <img src="docs/recorrido/partida/clasificacion.webp" alt="Clasificación de la partida" width="220" />
</p>

## Cómo está hecha

Todo vive en el navegador. La interfaz, el marcador y los campos están en una sola página, en JavaScript sin frameworks. Un service worker guarda la aplicación para abrirla sin red. Las partidas se escriben en el almacenamiento del teléfono.

Hay 54 campos, con tarjeta y barras de salida. 22 de ellos tienen mapas de hoyo en la carpeta `holes/`, y se piden cuando abres ese hoyo: no se descargan todos al instalar.

## La partida

<p align="center">
  <img src="docs/recorrido/partida/campos.webp" alt="Lista de campos para empezar la partida" width="220" />
  <img src="docs/recorrido/partida/tees.webp" alt="Barras de salida, con Course Rating y Slope" width="220" />
  <img src="docs/recorrido/partida/jugadores.webp" alt="Jugadores de la partida en un solo móvil" width="220" />
</p>

<p align="center">
  <img src="docs/recorrido/partida/tarjeta-bruta.webp" alt="Tarjeta bruta" width="220" />
  <img src="docs/recorrido/partida/ajustes.webp" alt="Ajustes de la partida en curso" width="220" />
  <img src="docs/recorrido/partida/ajustes-bola.webp" alt="Bola y ajustes del jugador" width="220" />
</p>

<p align="center">
  <img src="docs/recorrido/partida/perfil.webp" alt="Perfil, con nombre y Handicap Index" width="220" />
  <img src="docs/recorrido/partida/historial.webp" alt="Detalle de una vuelta guardada" width="220" />
  <img src="docs/recorrido/partida/continuar.webp" alt="Continuar la ronda desde el inicio" width="220" />
  <img src="docs/recorrido/partida/reabrir.webp" alt="Partida reabierta desde el historial" width="220" />
</p>

## Mapas de hoyo

El plano sale en el hoyo, encima del marcador. Estas capturas recogen campos que ya se ven dentro de la app y el plano del que salen.

<p align="center">
  <img src="docs/recorrido/mapas/las-rozas-hoyo-1.webp" alt="Mapa del hoyo 1 de Las Rozas dentro del marcador" width="220" />
  <img src="docs/recorrido/mapas/el-encin-hoyo-1.webp" alt="Mapa del hoyo 1 de El Encín" width="220" />
  <img src="docs/recorrido/mapas/la-herreria-hoyo-1.webp" alt="Mapa del hoyo 1 de La Herrería" width="220" />
</p>

<p align="center">
  <img src="docs/recorrido/mapas/aranjuez-hoyo-1.webp" alt="Hoyo 1 de Aranjuez en la app" width="220" />
  <img src="docs/recorrido/mapas/aranjuez-hoyo-1-plano.webp" alt="Plano del hoyo 1 de Aranjuez" width="220" />
  <img src="docs/recorrido/mapas/la-finca-hoyo-1.webp" alt="Hoyo 1 de La Finca en la app" width="220" />
  <img src="docs/recorrido/mapas/la-finca-hoyo-1-plano.webp" alt="Plano del hoyo 1 de La Finca" width="220" />
</p>

<p align="center">
  <img src="docs/recorrido/mapas/robledal-en-la-app.webp" alt="El Robledal en el marcador" width="220" />
  <img src="docs/recorrido/mapas/robledal-hoyo-1.webp" alt="Hoyo 1 de El Robledal" width="220" />
  <img src="docs/recorrido/mapas/robledal-plano.png" alt="Plano del hoyo 1 de El Robledal" width="280" />
</p>

<p align="center">
  <img src="docs/recorrido/mapas/rshecc-norte-en-la-app.webp" alt="RSHECC Norte en la app" width="220" />
  <img src="docs/recorrido/mapas/rshecc-norte-hoyo-1.webp" alt="Hoyo 1 de RSHECC Norte" width="220" />
  <img src="docs/recorrido/mapas/rshecc-norte-plano.png" alt="Plano de RSHECC Norte" width="280" />
</p>

<p align="center">
  <img src="docs/recorrido/mapas/rshecc-sur-hoyo-1.webp" alt="Hoyo 1 de RSHECC Sur" width="220" />
  <img src="docs/recorrido/mapas/rshecc-sur-vista.png" alt="Vista de RSHECC Sur" width="320" />
</p>

<p align="center">
  <img src="docs/recorrido/mapas/torrejon-en-la-app.webp" alt="Torrejón en la app" width="220" />
  <img src="docs/recorrido/mapas/torrejon-vista.webp" alt="Vista del campo de Torrejón" width="280" />
  <img src="docs/recorrido/mapas/golf-santander-en-la-app.webp" alt="Golf Santander en la app" width="220" />
  <img src="docs/recorrido/mapas/golf-santander-satelite.webp" alt="Vista de Golf Santander" width="280" />
</p>

<p align="center">
  <img src="docs/recorrido/mapas/moraleja-olivar-torrejon.png" alt="Planos de La Moraleja, Olivar de la Hinojosa y Torrejón" width="420" />
</p>

<p align="center">
  <img src="docs/recorrido/mapas/dehesa-escorial.png" alt="Hoyos de La Dehesa y Villa El Escorial" width="420" />
</p>

## Hándicap

El tee guarda Course Rating y Slope. En el hoyo se ve si recibes golpe. En una vuelta de nueve hoyos, el golpe cae en los hoyos de más dificultad de esos nueve.

<p align="center">
  <img src="docs/recorrido/handicap/tee-cr-slope.webp" alt="Tee con Course Rating y Slope" width="220" />
  <img src="docs/recorrido/handicap/hoyo-con-golpe.webp" alt="Hoyo en el que se recibe un golpe" width="220" />
  <img src="docs/recorrido/handicap/hoyo-sin-golpe.webp" alt="Hoyo sin golpe de hándicap" width="220" />
</p>

<p align="center">
  <img src="docs/recorrido/handicap/18-hoyos-ch10.webp" alt="Vuelta de 18 hoyos con Course Handicap 10" width="220" />
  <img src="docs/recorrido/handicap/9-hoyos-hoyo-1.webp" alt="Vuelta de 9 hoyos, hoyo 1" width="220" />
  <img src="docs/recorrido/handicap/9-hoyos-golpe-relativo.webp" alt="Golpe asignado por dificultad relativa en 9 hoyos" width="220" />
  <img src="docs/recorrido/handicap/9-hoyos-sin-golpe.webp" alt="Hoyo de 9 sin golpe recibido" width="220" />
</p>

## Reglas y árbitro

Las reglas de cada modo se pueden leer en cualquier momento: desde el inicio, desde el marcador y desde la clasificación. Árbitro es el chat de la ronda. Una bola en área de penalización roja termina con la cita de la Regla 17.1d(3).

<p align="center">
  <img src="docs/recorrido/reglas/boton-en-marcador.webp" alt="Botón de reglas en el marcador" width="220" />
  <img src="docs/recorrido/reglas/boton-en-clasificacion.webp" alt="Botón de reglas en la clasificación" width="220" />
</p>

<p align="center">
  <img src="docs/recorrido/reglas/todos-los-modos.webp" alt="Lista de reglas de todos los modos" width="280" />
  <img src="docs/recorrido/reglas/arbitro-area-roja.webp" alt="Árbitro citando el alivio lateral de un área roja" width="280" />
</p>

## Vídeos

En GitHub, la imagen abre el vídeo.

<p align="center">
  <a href="docs/recorrido/videos/recorrido-interfaz.mp4"><img src="docs/recorrido/partida/inicio.webp" alt="Vídeo: recorrido por la interfaz" width="220" /></a>
  <a href="docs/recorrido/videos/elegir-campo.mp4"><img src="docs/recorrido/partida/campos.webp" alt="Vídeo: elegir campo" width="220" /></a>
  <a href="docs/recorrido/videos/ajustes-tarjeta-continuar.mp4"><img src="docs/recorrido/partida/ajustes.webp" alt="Vídeo: ajustes, tarjeta y continuar la ronda" width="220" /></a>
</p>

<p align="center">
  <a href="docs/recorrido/videos/mapas-las-rozas.mp4"><img src="docs/recorrido/mapas/las-rozas-hoyo-1.webp" alt="Vídeo: mapas de hoyo en Las Rozas" width="220" /></a>
  <a href="docs/recorrido/videos/handicap-9-hoyos.mp4"><img src="docs/recorrido/handicap/9-hoyos-golpe-relativo.webp" alt="Vídeo: golpes de hándicap en 9 hoyos" width="220" /></a>
  <a href="docs/recorrido/videos/reglas.mp4"><img src="docs/recorrido/reglas/todos-los-modos.webp" alt="Vídeo: reglas desde inicio, marcador y clasificación" width="220" /></a>
  <a href="docs/recorrido/videos/arbitro.mp4"><img src="docs/recorrido/reglas/arbitro-area-roja.webp" alt="Vídeo: árbitro y cita del área de penalización roja" width="220" /></a>
</p>

- [Recorrido por la interfaz](docs/recorrido/videos/recorrido-interfaz.mp4)
- [Elegir campo](docs/recorrido/videos/elegir-campo.mp4)
- [Ajustes, tarjeta y continuar](docs/recorrido/videos/ajustes-tarjeta-continuar.mp4)
- [Mapas de Las Rozas](docs/recorrido/videos/mapas-las-rozas.mp4)
- [Hándicap en nueve hoyos](docs/recorrido/videos/handicap-9-hoyos.mp4)
- [Reglas de los modos](docs/recorrido/videos/reglas.mp4)
- [Árbitro, con la cita al final](docs/recorrido/videos/arbitro.mp4)

## La marca

<p align="center">
  <img src="docs/recorrido/marca/logo-f.png" alt="Logotipo F de Fairway" width="120" />
  <img src="docs/recorrido/marca/icono-192.png" alt="Icono de la aplicación a 192 píxeles" width="96" />
  <img src="docs/recorrido/marca/icono-512.png" alt="Icono de la aplicación a 512 píxeles" width="128" />
</p>

## Abrirla

Hace falta un servidor, porque la instalación y el modo sin red usan un service worker.

```bash
python3 -m http.server 8766
```

Abre `http://localhost:8766` en el móvil o en el navegador. Desde el menú del navegador se puede añadir a la pantalla de inicio.
