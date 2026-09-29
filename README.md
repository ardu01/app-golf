# Fairway

PWA personal de golf para anotar la vuelta en el iPhone (Safari / pantalla de inicio). Offline-first, sin cuenta: golpes, putts, bruto, neto y Stableford en el mismo teléfono. Publicada en GitHub Pages.

**App:** https://ardu01.github.io/app-golf/

<img src="docs/recorrido/partida/inicio.webp" alt="Inicio con ronda en curso" width="260">

## Características

- Marcador por hoyo (varios jugadores en el mismo dispositivo)
- Course Handicap / Playing Handicap según WHS (CR, Slope, SI); 9 y 18 hoyos
- Tarjeta bruta y neta, clasificación y cierre con ganadores
- Perfil, historial y estadísticas (filtros 5 / 10 / 20 / temporada / año / todo)
- Árbitro local (Reglas de Golf) y accesos de campo cuando hay destino
- Copia de seguridad JSON (esquema **3**) y Google Drive opcional (`drive.file`, token solo en memoria)
- Gestos atrás de iOS dentro de la app; en Inicio no se sale de la PWA (4.1.3.1)

## Capturas

### Partida

<img src="docs/recorrido/partida/campos.webp" alt="Lista de campos" width="200">
<img src="docs/recorrido/partida/tees.webp" alt="Tees" width="200">
<img src="docs/recorrido/partida/jugadores.webp" alt="Jugadores" width="200">

<img src="docs/recorrido/partida/marcador.webp" alt="Marcador del hoyo" width="200">
<img src="docs/recorrido/partida/tarjeta-bruta.webp" alt="Tarjeta bruta" width="200">
<img src="docs/recorrido/partida/tarjeta-neta.webp" alt="Tarjeta neta" width="200">
<img src="docs/recorrido/partida/clasificacion.webp" alt="Clasificación" width="200">

[Elegir campo](docs/recorrido/videos/elegir-campo.mp4) ·
[Ajustes y tarjeta](docs/recorrido/videos/ajustes-tarjeta-continuar.mp4) ·
[Recorrido de interfaz](docs/recorrido/videos/recorrido-interfaz.mp4)

### Perfil y stats

<img src="docs/recorrido/partida/perfil.webp" alt="Perfil" width="200">
<img src="docs/recorrido/partida/historial.webp" alt="Historial" width="200">
<img src="docs/recorrido/stats/stats_con_vueltas.png" alt="Estadísticas" width="200">

[Stats y perfil](docs/recorrido/videos/stats-perfil.mp4)

### Hándicap

<img src="docs/recorrido/handicap/tee-cr-slope.webp" alt="Tee con CR y Slope" width="200">
<img src="docs/recorrido/handicap/hoyo-con-golpe.webp" alt="Hoyo con golpe" width="200">

[Reparto en nueve hoyos](docs/recorrido/videos/handicap-9-hoyos.mp4)

### Reglas y árbitro

<img src="docs/recorrido/reglas/todos-los-modos.webp" alt="Modos de juego" width="260">
<img src="docs/recorrido/reglas/arbitro-area-roja.webp" alt="Árbitro" width="260">

[Reglas](docs/recorrido/videos/reglas.mp4) ·
[Árbitro](docs/recorrido/videos/arbitro.mp4)

## Versión actual

**4.1.3.1** (shell `fairway-v4-4131`). El esquema de la copia de seguridad sigue en **3**: las copias de 4.0.x / 4.1.x siguen entrando.

| Versión | Resumen |
|--------|---------|
| 4.1.0 | IndexedDB espejo, stats Gross 9/18, PWA/Drive endurecidos |
| 4.1.1 | Sin bolsa de palos ni caddie digital (otra app) |
| 4.1.2 | Google Drive OAuth web (Perfil → Conectar) |
| 4.1.3 | Gesto atrás / historial dentro de la app |
| 4.1.3.1 | En Inicio, atrás no sale de la PWA |

Detalle y assets: [Releases](https://github.com/ardu01/app-golf/releases). Changelog: [`CHANGELOG.md`](CHANGELOG.md).

### Datos y Drive

La partida se guarda primero en el dispositivo. Drive, si se conecta, escribe `Fairway/fairway-data.json` en el Drive del usuario. Sin red se sigue jugando. No hay secreto de cliente en el repositorio.

Las fórmulas de hándicap no se cambian a la ligera; los tests están en `tests/` (`node tests/run.mjs`).

## Desarrollo local

Hace falta servir por HTTP (el service worker no arranca como `file://`).

```bash
python3 -m http.server 8766
```

Abre `http://localhost:8766`. En el móvil: Añadir a pantalla de inicio.

GitHub Pages publica el repositorio tal cual (hay `.nojekyll` en la raíz).

## Marca

<img src="docs/recorrido/marca/logo-f.png" alt="F de Fairway" width="96">
<img src="docs/recorrido/marca/icono-192.png" alt="Icono 192" width="96">
<img src="docs/recorrido/marca/icono-512.png" alt="Icono 512" width="128">
