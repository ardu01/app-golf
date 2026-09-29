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
