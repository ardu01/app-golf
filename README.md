# Fairway

PWA personal de golf para iPhone (Safari / pantalla de inicio): marcador offline, sin cuenta, WHS, varios jugadores en el mismo teléfono. Publicada en GitHub Pages.

**App:** https://ardu01.github.io/app-golf/  
**Copia de seguridad:** esquema JSON **3** (compatible a lo largo de 3.x / 4.x)  
**Releases:** https://github.com/ardu01/app-golf/releases · [`CHANGELOG.md`](CHANGELOG.md)

---

## Fairway 3.x

La línea **3** consolida el producto como una sola app (`index.html`) pensada para el campo:

- Anotar la vuelta sin cobertura: golpes, putts, bruto, neto, Stableford
- Course / Playing Handicap según WHS (CR, Slope, SI); reparto correcto en 9 y en 18
- Varios jugadores en el mismo dispositivo; tarjeta, clasificación y cierre
- Perfil, historial reabrable, estadísticas
- Service worker cuidadoso: no recarga a mitad de ronda abierta
- Árbitro local (Reglas de Golf) y textos de modalidad
- Copia de seguridad JSON (esquema 3) en el propio teléfono

### Capturas y vídeos del núcleo (recorrido 3.x / base de partida)

Setup y marcador:

<img src="docs/recorrido/partida/campos.webp" alt="Lista de campos" width="200">
<img src="docs/recorrido/partida/tees.webp" alt="Tees con CR y Slope" width="200">
<img src="docs/recorrido/partida/jugadores.webp" alt="Jugadores" width="200">

<img src="docs/recorrido/partida/marcador.webp" alt="Marcador del hoyo" width="200">
<img src="docs/recorrido/partida/tarjeta-bruta.webp" alt="Tarjeta bruta" width="200">
<img src="docs/recorrido/partida/tarjeta-neta.webp" alt="Tarjeta neta" width="200">
<img src="docs/recorrido/partida/clasificacion.webp" alt="Clasificación" width="200">

Perfil, historial y stats:

<img src="docs/recorrido/partida/perfil.webp" alt="Perfil" width="200">
<img src="docs/recorrido/partida/historial.webp" alt="Historial" width="200">
<img src="docs/recorrido/stats/stats_con_vueltas.png" alt="Estadísticas" width="200">

Hándicap y árbitro:

<img src="docs/recorrido/handicap/tee-cr-slope.webp" alt="Tee CR Slope" width="200">
<img src="docs/recorrido/handicap/hoyo-con-golpe.webp" alt="Hoyo con stroke" width="200">
<img src="docs/recorrido/reglas/arbitro-area-roja.webp" alt="Árbitro" width="220">

Vídeos:

- [Elegir campo](docs/recorrido/videos/elegir-campo.mp4)
- [Ajustes, tarjeta y continuar](docs/recorrido/videos/ajustes-tarjeta-continuar.mp4)
- [Paseo por la interfaz](docs/recorrido/videos/recorrido-interfaz.mp4)
- [Stats y perfil](docs/recorrido/videos/stats-perfil.mp4)
- [Hándicap en nueve hoyos](docs/recorrido/videos/handicap-9-hoyos.mp4)
- [Reglas](docs/recorrido/videos/reglas.mp4)
- [Árbitro](docs/recorrido/videos/arbitro.mp4)

---

## Fairway 4.x

La línea **4** mantiene el mismo motor de partida y el mismo esquema de copia. Cambia la presentación y, en 4.1, la capa de plataforma.

**4.0** — UI iPhone-first: tipografía y densidad tipo sistema, materiales glass monocromo, marcador pensado para un dedo. Las iteraciones 4.0.1–4.0.11 afilan cabecera, ficha del jugador y acciones del hoyo **sin** alterar fórmulas de hándicap ni el formato de guardado.

**4.1** — encima de esa piel: datos más robustos (espejo IndexedDB), Drive opcional, gestos atrás de iOS dentro de la app, y limpieza de funciones que no son de Fairway (bolsa / caddie digital).

### Capturas y vídeo 4.1 (producción reciente)

Inicio (versión en cabecera, CTA de partida, tab bar; service worker que no recarga con ronda abierta; en Inicio el historial se ancla para no salir de la PWA):

<img src="docs/recorrido/4.1/inicio.png" alt="Inicio 4.1 — shell PWA" width="280">

Perfil con copia JSON (esquema 3) y Google Drive (`drive.file`, token en memoria, `Fairway/fairway-data.json`):

<img src="docs/recorrido/4.1/perfil-drive.png" alt="Perfil — copia y Drive" width="280">

Historial alimentado desde el dispositivo (localStorage + espejo IndexedDB):

<img src="docs/recorrido/4.1/historial.png" alt="Historial" width="280">

[Vídeo: Inicio → Perfil → Drive](docs/recorrido/4.1/tour-4.1.mp4)

---

## Detalle por versión (4.0 a 4.2)

### 4.0.x

Piel monocromo glass; refinados sucesivos del marcador (golpes/putts, fichas de acceso, cabecera). Esquema de copia **3**. Las partidas de 3.x siguen entrando.

### 4.1.0

IndexedDB como copia verificada del historial y estado; `localStorage` no se borra. Stats Gross · 9 y Gross · 18 separados. Workflows peligrosos del repo desactivados en esa línea. Drive aún sin client id. Shell `fairway-v4-410`.

### 4.1.1

Eliminados bolsa de palos y recomendaciones de caddie digital (otra app). Se mantienen tel. Herrería, árbitro, mapas y marcador. Shell `fairway-v4-411`.

### 4.1.2

Client id OAuth web de Google Drive para `https://ardu01.github.io` / `app-golf`. Sin secreto en el repo. Perfil → Conectar Google Drive. Shell `fairway-v4-412`. Media en [v4.1.2](https://github.com/ardu01/app-golf/releases/tag/v4.1.2).

### 4.1.3

History API: gesto atrás / botón Atrás cierra hoja de hoyo y pantallas dentro de la app; con ronda abierta no se pierden golpes. Shell `fairway-v4-413`.

### 4.1.3.1

Ancla de historial en **Inicio** (intento inicial). Shell `fairway-v4-4131`. Media en [v4.1.3.1](https://github.com/ardu01/app-golf/releases/tag/v4.1.3.1).

### 5.0.0

La versión de producto pasa a 5.0.0 (cabecera, perfil, manifiesto y `appVersion`). El service worker es `fairway-v5-500`. No hace `skipWaiting` al instalar y no recarga con una ronda abierta. Esquema 3. Fórmulas, catálogo, navegación, partida compartida y Drive siguen igual.

### 4.2.6

La ficha de la sala en Inicio deja 16px con la ronda. Dos móviles con el mismo código leen y escriben el mismo JSON público (`mantledb.sh`, sin clave). El MQTT de prueba sigue como aviso si Safari abre el socket; si no, la sala HTTPS converge igual. Drive no comparte la tarjeta entre cuentas. Quien entra vacío adopta la tarjeta del anfitrión. Shell `fairway-v4-426`. Esquema 3.

### 4.2.5

Partida compartida, opcional: sin código se anota igual; con código, cada golpe se encola y sale cuando hay red. En Inicio el toque del borde no crea historia antes de cancelar el swipe. Deslizar la ficha del hoyo sigue seleccionando al jugador. Shell `fairway-v4-425`. Esquema 3.

### 4.2.4

En el marcador, deslizar hasta otra ficha selecciona a ese jugador (golpes, putts, FIR y GIR), igual que tocarla. Un solo jugador no cambia. Shell `fairway-v4-424`. Esquema 3.

### 4.2.3

Salen los workflows que descargaban otra app o hacían `git push` (`publish-fairway-v3`, multicourse, tees, assemble, decode). Queda `test-fairway.yml` con `contents: read`; Pages no se toca. Los mapas de `holes/` y la ficha Mapa siguen. Shell `fairway-v4-423`. Esquema 3.

### 4.2.2

En **Inicio** el swipe desde el borde izquierdo no se arma (velo + `preventDefault` en `touchstart`, solo en esa pantalla). El colchón de la 4.2.1 sigue como red por si el gesto se cuela: el `popstate` no cambia la vista. Pantallas anidadas, un paso. Shell `fairway-v4-422`. Esquema 3.

### 4.2.1

Colchón de sentinels más robusto para iOS Safari/PWA en Inicio (`pushState` diferido; hashes `#b=…`). Un swipe = un paso en pantallas anidadas. Shell `fairway-v4-421`. Media: [v4.2.1](https://github.com/ardu01/app-golf/releases/tag/v4.2.1).

---

## Datos, Drive y desarrollo

La partida vive primero en el teléfono. Drive, si se conecta, es el Drive del usuario. La partida compartida no usa ese JSON: es un buzón aparte. Tests: `node tests/run.mjs`.


```bash
python3 -m http.server 8766
```

HTTP obligatorio para el service worker. Pages usa `.nojekyll`.

## Marca

<img src="docs/recorrido/marca/logo-f.png" alt="F" width="72">
<img src="docs/recorrido/marca/icono-192.png" alt="192" width="72">
<img src="docs/recorrido/marca/icono-512.png" alt="512" width="96">

---

## Fairway 5.x

En `main` (`3bf8568`) la versión de producto es **5.0.0**: `APP_VERSION` en `fairway/js/keys.js`, la cabecera de Inicio, el perfil («Fairway 5.0.0»), el manifiesto («Marcador de golf personal · 5.0.0») y `appVersion` del JSON de copia. El shell es `fairway-v5-500`. El esquema de copia sigue en **3** (`BACKUP_SCHEMA` y `version: 3` en el JSON). La release publicada es [v5.0.0](https://github.com/ardu01/app-golf/releases/tag/v5.0.0), «Fairway 5.0.0», el 2026-10-03T21:21:47Z, sobre `3bf85688470e001c607830a61bf48ae6d512d183`. No es borrador ni prerelease. Las capturas de `docs/recorrido/cursor/` se tomaron cuando la cabecera decía 4.2.6. No son de la app 5.0.0.

En `main`, `docs/fairway-5.0/` sigue siendo la nota escrita sobre la 4.2.6: [`BASELINE.md`](docs/fairway-5.0/BASELINE.md) congela `6ceef03`, [`AUDIT.md`](docs/fairway-5.0/AUDIT.md) es la auditoría de ese árbol, [`ADR-001.md`](docs/fairway-5.0/ADR-001.md) es el orden de la sala que el `56a2662` dejó en el código. El 3 oct 2026 el PR #57 quedó en `main` con ese commit. El mensaje dice «Fairway 5.0 baseline». Esos markdown no se han reescrito: siguen describiendo la 4.2.6 y el commit `6ceef03`. En el código, la cabecera, el perfil, el manifiesto y `APP_VERSION` son 5.0.0, y la release publicada es [v5.0.0](https://github.com/ardu01/app-golf/releases/tag/v5.0.0). [v4.2.6](https://github.com/ardu01/app-golf/releases/tag/v4.2.6) (29 sep 2026) queda en el historial.

El corte del `index.html` único está en `main`. Sin bundler, sin React, Vue ni Angular. El esquema del JSON sigue en 3. Los PR #58 y #59 siguen abiertos; en esas ramas `APP_VERSION` sigue en 4.2.6.

- [PR #60](https://github.com/ardu01/app-golf/pull/60) (`cursor/scoring-module-e67a`). Fusionado en `main` el 2026-10-03T21:09:44Z (`dcf7aef`). El tanteo en vivo está en `fairway/js/scoring.js`, módulo ES. `fairway/js/scoring-boot.js` publica en `window` las mismas funciones (`courseHandicapFor`, `liveStandings`, `stablefordHole`, …). `window.go` y `window.setScore` se quedan en el script clásico. Ese squash trae `tests/golden.mjs`. `sw.js` lista `scoring-boot.js` y `scoring.js` en el precache de instalación.
- [PR #59](https://github.com/ardu01/app-golf/pull/59) (`cursor/golden-card-tests-0946`). Sigue abierto. Su commit no está en `main`. Añade `tests/golden.mjs` y lo da de alta en `tests/run.mjs` sobre `56a2662`. El `tests/golden.mjs` de `main` llegó con el #60 y no es el mismo archivo.
- [PR #61](https://github.com/ardu01/app-golf/pull/61) (`cursor/rounds-module-214c`). Fusionado el 2026-10-03T21:09:22Z en la rama del #60. En `main` entra con el squash `dcf7aef`: la persistencia está en `fairway/js/rounds.js`. `rounds-boot.js` publica `saveRounds`, `persistActiveRound`, `reopenRound` y el resto. `localStorage` sigue siendo la tarjeta. IndexedDB sigue de espejo. `sw.js` precarga `rounds-boot.js` y `rounds.js` al instalar. El esquema sigue en 3.
- [PR #62](https://github.com/ardu01/app-golf/pull/62) (`cursor/courses-css-split-6b38`). Fusionado en `main` el 2026-10-03T21:13:14Z (`15a45f1`). El catálogo (`let COURSES`, 54 campos) está en `fairway/js/courses.js`, script clásico, no módulo. `index.html` sigue filtrando `club-ejemplo-norte`. El CSS está en `fairway/css/fairway.css` y el `<head>` lo enlaza. Ese squash dejó el shell en `fairway-v4-426`; el commit `3bf8568` lo dejó en `fairway-v5-500`. El precache incluye `courses.js` y `fairway.css`.
- [PR #63](https://github.com/ardu01/app-golf/pull/63) (`cursor/course-hole-preload-1422`). Fusionado el 2026-10-03T21:09:00Z en la rama del #62. En `main` entra con el squash `15a45f1`: al empezar la ronda precarga como mucho 18 planos de ese campo, no todo `holes/`. `icons/escorial-monasterio.png` no está en el precache y solo se pide al pintar la placa de La Herrería.
- [PR #58](https://github.com/ardu01/app-golf/pull/58) (`cursor/fairway-data-guard-9c4b`). Sigue abierto. Parte de `6ceef03` (la 4.2.6 del 29 sep, antes del #57) y no incluye el #57. No está en la pila 60–63. En esa rama `APP_VERSION` sigue en 4.2.6 y el esquema en 3. La fusión de Drive por hoyo, el `fairway.host.v1` que no se escribe con ronda protegida o pantalla de juego, y la clave local en blanco que no borra IndexedDB, ya están en `main` por el [PR #66](https://github.com/ardu01/app-golf/pull/66) (`83c7b19`).

El marcador (PR #60) y las rondas (PR #61) no dejaron captura ni vídeo en `docs/recorrido/cursor/`. Las fotos de 4.0.x que ya están más arriba no son esos dos cambios.

### Catálogo y CSS (PR #62)

El código está en `main`. Las fotos y el vídeo de `docs/recorrido/cursor/` se tomaron cuando la cabecera decía 4.2.6. No son capturas de la app 5.0.0.

Inicio. La cabecera dice 4.2.6. «Buenas noches, Ana», ronda en curso en La Herrería (hoyo 18), Continuar, Ajustes, Cerrar ronda, y el campo del código de la partida compartida.

<img src="docs/recorrido/cursor/home_la_herreria.png" alt="Inicio 4.2.6, La Herrería, partida compartida" width="200">

Paso Campo. La Herrería está seleccionada, Centro Nacional de Golf queda encima, y Siguiente está abajo.

<img src="docs/recorrido/cursor/course_list.png" alt="Lista de campos, La Herrería seleccionada" width="200">

Tarjeta bruta de La Herrería, 18 hoyos, tee Amarillas. La ida va al par: OUT 35, TOT 71, course handicap 13.

<img src="docs/recorrido/cursor/scorecard_la_herreria.png" alt="Tarjeta bruta, La Herrería, 71" width="200">

[De la lista de campos a la tarjeta](docs/recorrido/cursor/course_list_and_scorecard.mp4). El paseo de ese paso Campo (La Herrería elegida) hasta la tarjeta bruta de La Herrería. En los tramos que se ven, la lista y luego la tarjeta con OUT 35 y TOT 71.

### Precarga del plano (PR #63)

El código está en `main`. Chrome de escritorio en `127.0.0.1`. Estas capturas se tomaron cuando la cabecera decía 4.2.6. No son de la app 5.0.0. Al empezar se abre el plano de un solo campo, no el de todos.

Inicio sin nombre todavía. La cabecera dice 4.2.6. La Herrería figura como tu campo. La partida compartida ofrece Crear código y Unirme.

<img src="docs/recorrido/cursor/home_version_4_2_6.webp" alt="Inicio 4.2.6 en el escritorio" width="280">

El mismo escritorio, paso Campo, con Centro Nacional de Golf seleccionado.

<img src="docs/recorrido/cursor/course_centro_nacional.webp" alt="Centro Nacional de Golf seleccionado" width="280">

Hoyo 1 de Centro Nacional dentro de la app: par 5, 476 m, y las yardas escritas en el plano.

<img src="docs/recorrido/cursor/hole_map_centro_nacional.webp" alt="Plano del hoyo 1 de Centro Nacional" width="280">

[Empezar la ronda y abrir el plano](docs/recorrido/cursor/start_round_centro_nacional_map.mp4). Arranca en el paso Campo con Centro Nacional seleccionado y llega al plano del hoyo 1 (par 5, 476 m).

## Capturas y vídeos que no estaban arriba

Estos archivos ya estaban en `docs/` y `assets/`. No son de una 5.x.

Inicio con una ronda a medias (La Herrería, 3/18) y el botón de continuar. En esta captura la cabecera marca 4.0.11.

<img src="docs/recorrido/partida/inicio.webp" alt="Inicio con ronda en curso" width="200">

Ajustes de la ronda abierta: campo, tee, hoyos y la bola de cada jugador. Abajo, cerrar la ronda.

<img src="docs/recorrido/partida/ajustes.webp" alt="Ajustes de la ronda" width="200">

La hoja de la bola, encima del marcador: se elige la bola del jugador que está en la ficha.

<img src="docs/recorrido/partida/ajustes-bola.webp" alt="Hoja de la bola" width="200">

Al volver a Inicio con la ronda todavía abierta, la pastilla ofrece seguir o cerrar.

<img src="docs/recorrido/partida/continuar.webp" alt="Continuar la ronda" width="200">

Reabrir una vuelta del historial: la hoja pide confirmar antes de cargar esa tarjeta.

<img src="docs/recorrido/partida/reabrir.webp" alt="Reabrir una partida" width="200">

Los tres iconos del perfil (exportar, importar, borrar) vistos de cerca.

<img src="docs/recorrido/stats/perfil_iconos.png" alt="Iconos de la copia en el perfil" width="200">

La pantalla de stats con el filtro de temporada (este año, el anterior, todas).

<img src="docs/recorrido/stats/stats_temporada.png" alt="Estadísticas por temporada" width="200">

El hoyo 2 de una vuelta de 18 con course handicap 10, sin punto: ahí no toca golpe. El hoyo 1 de esa misma serie ya está más arriba.

<img src="docs/recorrido/handicap/hoyo-sin-golpe.webp" alt="Hoyo sin stroke" width="200">

La misma salida recortada a 9 hoyos. El hándicap de campo baja (en la captura, de 10 a 5) y el hoyo 1 sigue llevando golpe.

<img src="docs/recorrido/handicap/9-hoyos-hoyo-1.webp" alt="Nueve hoyos, hoyo 1 con golpe" width="200">

En 9 hoyos, un hoyo que en 18 recibía golpe puede quedarse sin él. La captura es el hoyo 2, par 4, sin punto.

<img src="docs/recorrido/handicap/9-hoyos-sin-golpe.webp" alt="Nueve hoyos, hoyo sin golpe" width="200">

El reparto de 9 no es «los hoyos 1 a 9». El golpe va al índice de dificultad relativo de esos nueve. Aquí el hoyo 6, el más fácil de ese tramo, lleva el punto.

<img src="docs/recorrido/handicap/9-hoyos-golpe-relativo.webp" alt="Golpe en el índice relativo de nueve hoyos" width="200">

Vuelta de 18 con course handicap 10, vista en el marcador: diez hoyos con punto y el resto sin él.

<img src="docs/recorrido/handicap/18-hoyos-ch10.webp" alt="Dieciocho hoyos, course handicap 10" width="200">

La ficha Árbitro en el marcador del hoyo, junto a Hoyos y Mapa. Árbitro abre esa pantalla.

<img src="docs/recorrido/reglas/boton-en-marcador.webp" alt="Ficha Árbitro en el marcador" width="200">

El mismo acceso desde la clasificación: el botón Árbitro en la barra de arriba.

<img src="docs/recorrido/reglas/boton-en-clasificacion.webp" alt="Botón Árbitro en la clasificación" width="200">

Lista de modalidades. Stableford y Stroke Play van como oficiales; el resto, como juegos de la partida.

<img src="docs/recorrido/reglas/todos-los-modos.webp" alt="Modalidades oficiales y sociales" width="200">

La ficha Mapa del hoyo sigue en la app publicada. Los planos que carga están en `holes/`. Las fotos de abajo son las de `docs/recorrido/mapas/`: unas son la ficha dentro de la app, otras el plano o la foto del hoyo.

La Herrería, hoyo 1, dentro de la ficha Mapa: el plano del hoyo a pantalla, con Marcador para volver.

<img src="docs/recorrido/mapas/la-herreria-hoyo-1.webp" alt="Mapa del hoyo 1 de La Herrería" width="200">

Las Rozas, hoyo 1, la misma ficha.

<img src="docs/recorrido/mapas/las-rozas-hoyo-1.webp" alt="Mapa del hoyo 1 de Las Rozas en la app" width="200">

[Mapas de Las Rozas](docs/recorrido/videos/mapas-las-rozas.mp4). La ficha Mapa del hoyo 1 (La Encina) y, en otro tramo, la tarjeta de esa vuelta.

El Robledal, hoyo 1, ficha Mapa en la app. La cabecera de la captura es 4.0.11.

<img src="docs/recorrido/mapas/robledal-en-la-app.webp" alt="El Robledal, mapa en la app" width="200">

Foto del mismo hoyo 1, calle y green, aparte del plano.

<img src="docs/recorrido/mapas/robledal-hoyo-1.webp" alt="Foto del hoyo 1 de El Robledal" width="280">

Plano de trazo del Robledal, hoyo 1: salida, calle, green y la distancia de la barra de arriba.

<img src="docs/recorrido/mapas/robledal-plano.png" alt="Plano del hoyo 1 de El Robledal" width="280">

Golf Santander, ficha Mapa del hoyo 1 en la app.

<img src="docs/recorrido/mapas/golf-santander-en-la-app.webp" alt="Golf Santander, mapa en la app" width="200">

La foto de satélite de ese hoyo 1, la que la ficha enseña.

<img src="docs/recorrido/mapas/golf-santander-satelite.webp" alt="Satélite del hoyo 1 de Golf Santander" width="280">

Torrejón, hoyo 1, ficha Mapa en la app.

<img src="docs/recorrido/mapas/torrejon-en-la-app.webp" alt="Torrejón, mapa en la app" width="200">

Vista del hoyo 1 de Torrejón, green y bandera.

<img src="docs/recorrido/mapas/torrejon-vista.webp" alt="Vista del hoyo 1 de Torrejón" width="280">

RSHECC Norte, hoyo 1, ficha Mapa en la app.

<img src="docs/recorrido/mapas/rshecc-norte-en-la-app.webp" alt="RSHECC Norte, mapa en la app" width="200">

Foto aérea del hoyo 1 Norte.

<img src="docs/recorrido/mapas/rshecc-norte-hoyo-1.webp" alt="Foto del hoyo 1 de RSHECC Norte" width="280">

Plano del hoyo 1 Norte, con la distancia en el margen.

<img src="docs/recorrido/mapas/rshecc-norte-plano.png" alt="Plano del hoyo 1 de RSHECC Norte" width="280">

RSHECC Sur, foto del hoyo 1.

<img src="docs/recorrido/mapas/rshecc-sur-hoyo-1.webp" alt="Foto del hoyo 1 de RSHECC Sur" width="280">

Otra vista del Sur, calle hacia el green.

<img src="docs/recorrido/mapas/rshecc-sur-vista.png" alt="Vista de un hoyo de RSHECC Sur" width="280">

Aranjuez, hoyo 1: la foto de la calle.

<img src="docs/recorrido/mapas/aranjuez-hoyo-1.webp" alt="Foto del hoyo 1 de Aranjuez" width="280">

El plano de trazo de ese hoyo: salida, calle y green.

<img src="docs/recorrido/mapas/aranjuez-hoyo-1-plano.webp" alt="Plano del hoyo 1 de Aranjuez" width="280">

La Finca, hoyo 1, foto de la calle.

<img src="docs/recorrido/mapas/la-finca-hoyo-1.webp" alt="Foto del hoyo 1 de La Finca" width="280">

Plano del mismo hoyo de La Finca.

<img src="docs/recorrido/mapas/la-finca-hoyo-1-plano.webp" alt="Plano del hoyo 1 de La Finca" width="280">

El Encín, hoyo 1, foto aérea de la calle.

<img src="docs/recorrido/mapas/el-encin-hoyo-1.webp" alt="Foto del hoyo 1 de El Encín" width="280">

Hoja de referencia con el hoyo 1 de La Dehesa del Escorial (par, hándicap, metros por tee). No es una captura de la ficha Mapa.

<img src="docs/recorrido/mapas/dehesa-escorial.png" alt="Hoyo 1 de La Dehesa del Escorial" width="280">

Tres campos en una hoja: La Moraleja, Olivar de la Hinojosa y Torrejón. Tampoco es la ficha de la app.

<img src="docs/recorrido/mapas/moraleja-olivar-torrejon.png" alt="La Moraleja, Olivar y Torrejón" width="280">

Foto de la que sale la F de la marca: calle, hierba y la letra recortada. Está en `assets/`, no en la PWA.

<img src="assets/fairway-icon-source.jpg" alt="Foto de origen del icono" width="200">
