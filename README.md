# Fairway

Fairway es una PWA de golf para iPhone (Safari / Añadir a pantalla de inicio): marcador offline-first, sin cuenta, WHS, varios jugadores en el mismo dispositivo. Hosting: GitHub Pages.

**App en producción:** https://ardu01.github.io/app-golf/ · **Versión:** 4.1.3.1 (`fairway-v4-4131`) · **Esquema de copia JSON:** 3

---

## Capturas 4.1.3.1 (producción)

### Inicio — shell PWA y entrada a partida

Cabecera con versión de producto, acceso a Perfil, CTA `Nueva partida`, tarjeta del campo por defecto (rating/tees/par) y barra inferior (`Inicio` / `Hoyo` / `Tarjeta` / `Clasif.`). El service worker `fairway-v4-4131` no recarga con ronda abierta; en Inicio el historial del navegador está anclado para que el gesto atrás de iOS no descargue la PWA.

<img src="docs/recorrido/4.1/inicio.png" alt="Inicio 4.1.3.1: versión, Nueva partida, campo y tab bar" width="280">

### Perfil — identidad, copia local y Drive

Formulario de nombre / Handicap Index, accesos a historial y stats, bloque de copia de seguridad (export/import JSON esquema 3) y tarjeta Google Drive: OAuth web (`drive.file`), token solo en memoria, destino `Fairway/fairway-data.json`. Sin client secret en el repositorio.

<img src="docs/recorrido/4.1/perfil-drive.png" alt="Perfil: copia JSON y Conectar Google Drive" width="280">

### Historial — vueltas persistidas

Lista vacía o poblada desde `localStorage` + espejo IndexedDB (desde 4.1.0). Restaurar / hacer copia sin pasar por un backend propio.

<img src="docs/recorrido/4.1/historial.png" alt="Historial Mis vueltas" width="280">

### Vídeo — tour 4.1.3.1

[Inicio → Perfil → scroll hasta Drive (~15 s)](docs/recorrido/4.1/tour-4.1.mp4)

También en la release: https://github.com/ardu01/app-golf/releases/tag/v4.1.3.1

---

## Evolución técnica (3.x → 4.1)

La **3.x** fijó el núcleo en un solo `index.html`: scorecard, WHS, SW y esquema de copia 3. La **4.0** cambió presentación (glass monocromo, densidad del marcador) sin tocar fórmulas ni claves de guardado. La **4.1** añade capa de datos y plataforma: IndexedDB espejo (4.1.0), retirada de bolsa/caddie digital (4.1.1), Drive OAuth (4.1.2), History API para gestos atrás (4.1.3) y ancla en Inicio (4.1.3.1). Releases con notas y media: https://github.com/ardu01/app-golf/releases · [`CHANGELOG.md`](CHANGELOG.md).

---

## Recorrido de partida (núcleo)

### Setup — campo, tee, jugadores

Selector de recorridos, tee con Course Rating / Slope, roster en el mismo teléfono.

<img src="docs/recorrido/partida/campos.webp" alt="Lista de campos" width="200">
<img src="docs/recorrido/partida/tees.webp" alt="Tees CR Slope" width="200">
<img src="docs/recorrido/partida/jugadores.webp" alt="Jugadores" width="200">

[Vídeo: elegir campo](docs/recorrido/videos/elegir-campo.mp4)

### Hoyo — entrada de golpes

Controles de golpes/putts, FIR/GIR según modalidad, navegación de hoyos; penales y ajustes sin perder la ronda en curso.

<img src="docs/recorrido/partida/marcador.webp" alt="Marcador del hoyo" width="200">
<img src="docs/recorrido/partida/ajustes.webp" alt="Ajustes de partida" width="200">

### Tarjeta y clasificación

Vistas bruta/neta; clasificación por modalidades; cierre con ganadores (empates incluidos).

<img src="docs/recorrido/partida/tarjeta-bruta.webp" alt="Tarjeta bruta" width="200">
<img src="docs/recorrido/partida/tarjeta-neta.webp" alt="Tarjeta neta" width="200">
<img src="docs/recorrido/partida/clasificacion.webp" alt="Clasificación" width="200">

[Vídeo: ajustes, tarjeta y continuar](docs/recorrido/videos/ajustes-tarjeta-continuar.mp4) ·
[Vídeo: paseo por la interfaz](docs/recorrido/videos/recorrido-interfaz.mp4)

### Perfil clásico y estadísticas

Historial reabrable; stats con filtros 5/10/20/temporada/año/todo; medias Gross 9 y Gross 18 separadas (4.1.0+).

<img src="docs/recorrido/partida/perfil.webp" alt="Perfil clásico" width="200">
<img src="docs/recorrido/partida/historial.webp" alt="Historial con vueltas" width="200">
<img src="docs/recorrido/stats/stats_con_vueltas.png" alt="Stats con vueltas" width="200">

[Vídeo: stats y perfil](docs/recorrido/videos/stats-perfil.mp4)

---

## Hándicap WHS

Course Handicap desde Index + CR + Slope; strokes por hoyo vía SI. En 9 hoyos el reparto usa la dificultad de esos nueve, no la vuelta de 18.

<img src="docs/recorrido/handicap/tee-cr-slope.webp" alt="Tee CR Slope" width="200">
<img src="docs/recorrido/handicap/hoyo-con-golpe.webp" alt="Hoyo con stroke" width="200">
<img src="docs/recorrido/handicap/18-hoyos-ch10.webp" alt="18 hoyos CH 10" width="200">

[Vídeo: reparto en nueve hoyos](docs/recorrido/videos/handicap-9-hoyos.mp4)

---

## Reglas y árbitro

Textos de modalidad desde marcador/clasificación; árbitro local (lie → Reglas de Golf + cita), sin red.

<img src="docs/recorrido/reglas/todos-los-modos.webp" alt="Modos" width="240">
<img src="docs/recorrido/reglas/arbitro-area-roja.webp" alt="Árbitro área roja" width="240">

[Vídeo: reglas](docs/recorrido/videos/reglas.mp4) ·
[Vídeo: árbitro](docs/recorrido/videos/arbitro.mp4)

---

## Datos, Drive y tests

Partida primero en dispositivo (`localStorage`; espejo IndexedDB desde 4.1.0). Drive opcional: Perfil → Conectar, scope `drive.file`, sin secreto en repo. Tests: `node tests/run.mjs`.

## Desarrollo local

```bash
python3 -m http.server 8766
```

HTTP obligatorio para el service worker. Pages publica el repo con `.nojekyll`.

## Marca

<img src="docs/recorrido/marca/logo-f.png" alt="F" width="72">
<img src="docs/recorrido/marca/icono-192.png" alt="192" width="72">
<img src="docs/recorrido/marca/icono-512.png" alt="512" width="96">
