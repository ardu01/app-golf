# Pruebas

La puerta de la app sigue siendo:

```bash
node tests/run.mjs
```

No hace falta npm para jugar ni para esa suite. Node 22 sirve. El orden es scoring, backup, maps, referee, drive, persist, migration, pwa, stats, security.

`tests/persist.mjs` imprime un `QuotaExceededError` a propósito: el almacenamiento de mentira lanza cuota y la suite comprueba el aviso. El proceso sigue y termina en `persist ok`.

## Qué fija cada suite

| Suite | Qué no puede romperse |
| --- | --- |
| `scoring.mjs` | Hándicap: HI 10, slope 125, CR 71.5, par 72 → CH 11. La fórmula sigue `hi * (Number(tee.slope) / 113)` |
| `backup.mjs` | Esquema 3, saneado de HTML hostil, tope de historial |
| `maps.mjs` | 54 campos y los mismos largos. Cero planos: no hay `holes/`, ni botón Mapa, ni caché `fairway-maps`. El único workflow es `test-fairway.yml` |
| `referee.mjs` | Frases del árbitro ya cubiertas |
| `drive.mjs` | Plan de sync, merge, etiquetas, client id público de la 4.1.2, sin secreto |
| `persist.mjs` | Ronda activa, `.bak`, cuota, no pisar una ronda protegida |
| `migration.mjs` | Round-trip a IndexedDB, JSON corrupto, cuota, interrupción, no borrar `localStorage` |
| `pwa.mjs` | No hay `SKIP_WAITING` en install. No recarga con ronda, cierre o pantallas de juego |
| `stats.mjs` | Gross de 9 y de 18 no se promedian juntos |
| `security.mjs` | `clipStr` y `escapeHtml`, backup hostil, ningún workflow de esta rama hace `git push`. El `tel:` de La Herrería sigue. No hay bolsa ni `caddie.js` |

## Navegador

`node tests/e2e.mjs` abre el hoyo en Chrome con Playwright, comprueba que no hay bolsa, que el `tel:` del caddie de La Herrería sigue y que el pie del hoyo mide al menos 48px. No entra en `node tests/run.mjs`.

Hace falta el paquete y un Chrome:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --prefix /tmp/fairway-pw @playwright/test
PLAYWRIGHT_MODULE=/tmp/fairway-pw/node_modules/playwright/index.mjs \
  CHROME_PATH=/usr/local/bin/google-chrome \
  node tests/e2e.mjs
```

En esta máquina (Chrome del sistema, viewport 390×844) salió `e2e ok` con el pie a 50px.

## CI

`.github/workflows/test-fairway.yml` es el único workflow del repo. Lanza `node tests/run.mjs` en push a `main` y en cada pull request, con `contents: read`. No instala Playwright y no despliega.

Ese job no arranca en GitHub mientras la cuenta siga bloqueada por facturación («The job was not started because your account is locked due to a billing issue.»). El verde local no se refleja en el check.

Pages sigue en modo legacy (`build_type: legacy`, rama `main`, path `/`). Publica aunque el test esté rojo. No se añade `deploy-pages` al lado: publicaría dos veces. El rearme está en `docs/rearme-4.1.4.md`.
