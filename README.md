# Fairway

Fairway es una aplicación web progresiva (PWA) para anotar partidas de golf en el iPhone. Está pensada para usarse en el campo: sin cuentas, sin dependencia de cobertura y con el marcador siempre a un toque. Se instala desde Safari (Añadir a pantalla de inicio) y se publica en GitHub Pages.

**Probar ahora:** https://ardu01.github.io/app-golf/

Versión en producción: **4.1.3.1**. Las copias de seguridad siguen el **esquema 3**, así que el historial de 4.0.x y 4.1.x sigue entrando.

<img src="docs/recorrido/4.1/inicio.png" alt="Fairway 4.1 — Inicio" width="280">

---

## De la 3.x a la 4.1: cómo ha evolucionado

La línea **3.x** consolidó Fairway como una sola app en `index.html`: partida offline, hándicap WHS, varios jugadores en el mismo teléfono, historial y service worker cuidadoso con una ronda abierta. El recorrido clásico del repositorio documenta ese núcleo con capturas y vídeos de campo, tee, marcador, tarjeta y perfil.

Con la **4.0** la app cambió de piel: interfaz iPhone-first, materiales tipo cristal monocromo y un marcador pensado para un solo dedo. Las versiones 4.0.1–4.0.11 fueron iteraciones de densidad, cabecera y ficha del jugador —sin romper fórmulas ni el esquema de datos.

La **4.1** añade la capa de producto sobre esa base:

- **4.1.0** — espejo verificado en IndexedDB (sin borrar `localStorage`), estadísticas Gross 9 y Gross 18 separadas, service worker que no recarga a mitad de ronda.
- **4.1.1** — fuera la bolsa de palos y el caddie digital (pertenecen a otra app); se mantienen teléfono de La Herrería y árbitro.
- **4.1.2** — Google Drive opcional desde Perfil (OAuth web, token solo en memoria, archivo `Fairway/fairway-data.json`).
- **4.1.3 / 4.1.3.1** — el gesto atrás de iOS y el botón Atrás del navegador navegan dentro de la app; en la pantalla de Inicio no se abandona la PWA.

El detalle de cada etiqueta está en [Releases](https://github.com/ardu01/app-golf/releases) y en [`CHANGELOG.md`](CHANGELOG.md). Cada release nueva incluye capturas y un vídeo corto, además de las notas.

---

## Fairway 4.1 hoy

Inicio con cabecera de versión, acceso a Perfil y arranque de partida. La copia local sigue siendo la fuente de verdad; Drive es opcional.

<img src="docs/recorrido/4.1/inicio.png" alt="Inicio 4.1" width="220">
<img src="docs/recorrido/4.1/perfil-drive.png" alt="Perfil y Google Drive" width="220">
<img src="docs/recorrido/4.1/historial.png" alt="Historial" width="220">

[Vídeo: tour Inicio → Perfil → Drive (4.1)](docs/recorrido/4.1/tour-4.1.mp4)

Más assets de esa generación: [release v4.1.2](https://github.com/ardu01/app-golf/releases/tag/v4.1.2).

---

## El recorrido clásico (núcleo de partida)

Estas capturas y vídeos muestran el flujo de anotar la vuelta —campo, tees, jugadores, marcador, tarjeta y clasificación— tal como se documentó en el repo. Siguen siendo la referencia visual del producto, complementadas por las pantallas 4.1 de arriba.

<img src="docs/recorrido/partida/campos.webp" alt="Campos" width="180">
<img src="docs/recorrido/partida/tees.webp" alt="Tees" width="180">
<img src="docs/recorrido/partida/jugadores.webp" alt="Jugadores" width="180">

<img src="docs/recorrido/partida/marcador.webp" alt="Marcador" width="180">
<img src="docs/recorrido/partida/tarjeta-bruta.webp" alt="Tarjeta bruta" width="180">
<img src="docs/recorrido/partida/tarjeta-neta.webp" alt="Tarjeta neta" width="180">
<img src="docs/recorrido/partida/clasificacion.webp" alt="Clasificación" width="180">

<img src="docs/recorrido/partida/perfil.webp" alt="Perfil" width="180">
<img src="docs/recorrido/partida/historial.webp" alt="Historial" width="180">
<img src="docs/recorrido/stats/stats_con_vueltas.png" alt="Estadísticas" width="180">

Vídeos del recorrido:

- [Elegir campo](docs/recorrido/videos/elegir-campo.mp4)
- [Ajustes, tarjeta y continuar](docs/recorrido/videos/ajustes-tarjeta-continuar.mp4)
- [Paseo por la interfaz](docs/recorrido/videos/recorrido-interfaz.mp4)
- [Stats y perfil](docs/recorrido/videos/stats-perfil.mp4)
- [Hándicap en nueve hoyos](docs/recorrido/videos/handicap-9-hoyos.mp4)
- [Reglas](docs/recorrido/videos/reglas.mp4)
- [Árbitro](docs/recorrido/videos/arbitro.mp4)

---

## Qué hace Fairway

En el hoyo, un toque por golpe. La tarjeta se consulta en bruto y en neto. La clasificación respeta cada modalidad marcada y, al cerrar, muestra ganadores (incluidos empates). Varios jugadores pueden anotar en el mismo teléfono. El Course Handicap se reparte por hoyo según WHS (CR, Slope, SI); en nueve hoyos se usa la dificultad de esos nueve.

El perfil guarda nombre e índice. El historial cuelga de ahí. Si se cierra Safari a mitad, la ronda se recupera. Las estadísticas filtran las últimas vueltas, la temporada, el año o todo el historial; Gross de 9 y de 18 no se mezclan en un solo promedio.

Desde Perfil se puede exportar/restaurar JSON o conectar **Google Drive**. Sin red se sigue jugando; con red, la copia remota es el Drive del propio usuario, no un servidor de Fairway. El árbitro aplica Reglas de Golf en el dispositivo, sin llamadas externas.

Las fórmulas de hándicap no se cambian sin tests. La suite está en `tests/` (`node tests/run.mjs`).

---

## Hándicap, reglas y marca

<img src="docs/recorrido/handicap/tee-cr-slope.webp" alt="Tee con CR y Slope" width="200">
<img src="docs/recorrido/handicap/hoyo-con-golpe.webp" alt="Hoyo con golpe" width="200">
<img src="docs/recorrido/reglas/arbitro-area-roja.webp" alt="Árbitro" width="220">

<img src="docs/recorrido/marca/logo-f.png" alt="F" width="72">
<img src="docs/recorrido/marca/icono-192.png" alt="192" width="72">
<img src="docs/recorrido/marca/icono-512.png" alt="512" width="96">

---

## Desarrollo local

El service worker exige HTTP (no `file://`):

```bash
python3 -m http.server 8766
```

Abre `http://localhost:8766` y, en el móvil, Añadir a pantalla de inicio. GitHub Pages publica el repositorio tal cual (incluye `.nojekyll`).

---

## Enlaces

- App: https://ardu01.github.io/app-golf/
- Releases (notas + capturas + vídeo por versión): https://github.com/ardu01/app-golf/releases
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)
