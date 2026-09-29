# Fairway

PWA personal de golf para anotar la vuelta en el iPhone (Safari / pantalla de inicio). Offline-first, sin cuenta. Publicada en [GitHub Pages](https://ardu01.github.io/app-golf/).

**Versión actual: 4.1.3.1** · [Releases](https://github.com/ardu01/app-golf/releases) · Esquema de copia **3**

<img src="docs/recorrido/partida/inicio.webp" alt="Inicio" width="260">

## Evolución de la app

Fairway pasó de una PWA 3.x a la línea **4.x** (piel Apple / monocromo glass), luego a **4.1** (datos, Drive, gestos).

| Etapa | Qué se ve |
|-------|-----------|
| **3.x → 4.0** | Nueva UI iPhone-first; marcador, tarjeta, perfil |
| **4.0.x** | Refinos de densidad del marcador y cabecera |
| **4.1.0** | IndexedDB espejo; stats Gross 9 / 18 |
| **4.1.1** | Sin bolsa/caddie digital |
| **4.1.2** | Google Drive en Perfil |
| **4.1.3 / 4.1.3.1** | Atrás dentro de la app; Inicio no sale de la PWA |

### Antes / recorrido clásico (docs del repo)

Partida, profile y stats tal como se documentaron en el recorrido:

<img src="docs/recorrido/partida/marcador.webp" alt="Marcador" width="180">
<img src="docs/recorrido/partida/tarjeta-bruta.webp" alt="Tarjeta" width="180">
<img src="docs/recorrido/partida/perfil.webp" alt="Perfil" width="180">
<img src="docs/recorrido/stats/stats_con_vueltas.png" alt="Stats" width="180">

Vídeos: [elegir campo](docs/recorrido/videos/elegir-campo.mp4) · [interfaz](docs/recorrido/videos/recorrido-interfaz.mp4) · [stats](docs/recorrido/videos/stats-perfil.mp4) · [hándicap 9](docs/recorrido/videos/handicap-9-hoyos.mp4)

### 4.1.x en producción

Capturas y tour de la release **v4.1.2** (Drive + UI actual): ver assets en  
https://github.com/ardu01/app-golf/releases/tag/v4.1.2  
(`01-home.png`, `02-perfil-drive.png`, `fairway-4.1-tour.mp4`).

Cada release nueva incluye capturas y vídeo en [Releases](https://github.com/ardu01/app-golf/releases).

## Características

- Marcador por hoyo (varios jugadores en el mismo dispositivo)
- WHS: Course / Playing Handicap (CR, Slope, SI); 9 y 18
- Tarjeta, clasificación, cierre con ganadores
- Historial, estadísticas, árbitro local
- Copia JSON (esquema 3) y Google Drive opcional
- Gestos atrás iOS; en Inicio no se abandona la PWA

## Hándicap, reglas, marca

<img src="docs/recorrido/handicap/tee-cr-slope.webp" alt="Tee CR Slope" width="200">
<img src="docs/recorrido/reglas/arbitro-area-roja.webp" alt="Árbitro" width="200">
<img src="docs/recorrido/marca/icono-512.png" alt="Icono" width="96">

## Desarrollo local

```bash
python3 -m http.server 8766
```

`http://localhost:8766` (HTTP obligatorio para el service worker). Tests: `node tests/run.mjs`.

GitHub Pages publica el repo tal cual (`.nojekyll`). Changelog: [`CHANGELOG.md`](CHANGELOG.md).
