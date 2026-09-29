# Fairway 4.1.2

> Notas de la 4.1.2. La release de esta limpieza es `docs/release-4.1.4.md`.

Producto **4.1.2**. Esquema del JSON **3**. Partida de la rama: 4.0.11 en `7bbfee7474dbc11b1874b1c707cd98763a63965e`. La fusión a `main` la hacen Miguel o Bob. Esta rama no se fusiona sola.

La 4.1.1 quitó la bolsa de palos y `fairway/js/caddie.js`. No hay recomendación de palo ni de juego. El `tel:` de La Herrería y el árbitro siguen. La 4.1.2 deja eso y pone el client id público de Drive para `https://ardu01.github.io` y `https://ardu01.github.io/app-golf/`. El shell es `fairway-v4-412`.

## Qué entra

- IndexedDB como copia verificada. `localStorage` sigue siendo la fuente del marcador y no se borra al verificar. Ver `docs/data-migration.md`.
- Cinco workflows que hacían `git push` quedan sin dispatch en esta rama: V3, multi-curso, tees, ensamblado y decode. En `main` siguen hasta la fusión.
- Drive: client id público de OAuth web para `https://ardu01.github.io` y `https://ardu01.github.io/app-golf/`. Sin secreto. El token sigue en memoria. Detalle en `docs/drive-sync.md`. Un conflicto no sustituye la ronda en curso hasta que el jugador elige.
- El service worker es `fairway-v4-412`. No hace `skipWaiting` al instalar. Con ronda, cierre o pantalla de juego no recarga.
- Stats: Gross · 9 y Gross · 18 por separado. La fórmula de hándicap no cambia (`tests/scoring.mjs`).
- El `tel:` de La Herrería sigue. No hay bolsa de palos.
- Manifiestos de `el-robledal`, `rshecc-norte` y `rshecc-sur` sobre los webp que ya estaban, sin nombres de hoyo. No hay planos nuevos.
- Pruebas: `node tests/run.mjs`. Recorrido del hoyo en Chrome: `docs/testing.md`.

## Qué no entra

- No hay secreto de OAuth ni credenciales de Google en CI. Los tests no abren una sesión real contra Drive.
- No hay mapas de los 28 campos sin carpeta, Puerta de Hierro incluida.
- `PH` sigue igual que `CH`.
- La puntuación no se ha extraído de `index.html`.
- Pages no espera a los tests. Sigue el despliegue legacy de `main`.

## CI, sin tocar el publicador

`test-fairway.yml` lanza `node tests/run.mjs` en cada pull request y en push a `main`. El job no arranca mientras la cuenta siga bloqueada por facturación. Un verde local no pone el check en verde.

Pages (`pages-build-deployment`, `build_type: legacy`) publica `main` aunque ese check falle. Eso quedó demostrado en la 4.0.11 (runs `36531237675` y `36531238573`). No se añade `actions/deploy-pages` al lado del legado.

Cuando se quiera que los tests cierren la publicación, en una sola ventana y ya con el YAML en `main`:

1. Aceptar que, mientras el runner no arranque, Pages tampoco publicará.
2. Un workflow cuyo deploy tenga `needs` del mismo `node tests/run.mjs`, artefacto la raíz del repo (`holes/`, `icons/`, `index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, `fairway/`).
3. Cambiar el origen de Pages de legacy a GitHub Actions.
4. Comprobar que `pages-build-deployment` ya no corre.

## Para fusionar

Revisar el diff de `release/fairway-4.1` contra `main`. No hace falta reescribir fórmulas ni mapas. Después de fusionar, el botón de los workflows viejos desaparece de Actions porque GitHub los lee de la rama por defecto. El teléfono coge `fairway-v4-412` al volver a Inicio, no a mitad de ronda.
