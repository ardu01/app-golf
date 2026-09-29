# Fairway 4.1 — Fase 1: auditoría e inventario

Fecha de la auditoría: 2026-09-29.

**Versión de partida y de producción: Fairway 4.0.11.** Confirmada como baseline. No es una 4.0.x anterior. El árbol auditado es `main` en `7bbfee7474dbc11b1874b1c707cd98763a63965e`, mensaje `Fairway 4.0.11 — top fino y ficha arriba del hueco (#44)`. Cualquier mención de 4.0.1–4.0.10 en este documento es historia dentro de ese README o un run antiguo, no la versión desde la que sale esta fase.

Esta fase no modulariza `index.html`, no introduce IndexedDB y no cambia fórmulas, mapas ni datos.

## Identidad de partida

| Dato | Valor | Dónde se ve |
| --- | --- | --- |
| Versión de producto (baseline) | **4.0.11** | `index.html` (`appVersion: "4.0.11"` en `collectFairwayBackup`), `manifest.webmanifest` (`description`), `README.md` (párrafo de la 4.0.11), `sw.js` (`SHELL = "fairway-v4-411"`) |
| Esquema de la copia | **3** | Número de esquema, no de producto. `collectFairwayBackup` escribe `version: 3` y `appVersion: "4.0.11"`. `validateFairwayBackup` marca `newer` si `version > 3` y sigue importando las partidas que reconoce |
| Commit de partida | `7bbfee7474dbc11b1874b1c707cd98763a63965e` | El de la 4.0.11 en `main`. La fase no parte de un commit anterior |
| Rama de trabajo | `release/fairway-4.1` | Creada desde ese commit. No se ha empujado a `main` |
| Runtime de la app | Un solo `index.html` (10419 líneas, 543366 bytes, 316 `function` y 13 `async function`) más `sw.js` y `manifest.webmanifest` | Sin `package.json` y sin bundler |
| Node usado para tests | v22.14.0 | Solo la suite. Jugar no usa npm |

El README abre la sección de versión con «Esto es la 3.0». El texto de producto dentro del JSON y el manifiesto ya dicen 4.0.11. Es deriva de documentación, no una versión distinta en el código de la app.

## Resultado real de `node tests/run.mjs`

Ejecutado en la raíz del repo, sobre ese commit, el 2026-09-29. Código de salida **0**. Seis suites, **0 suites fallidas**. El runner (`tests/run.mjs`) lanza `scoring.mjs`, `backup.mjs`, `maps.mjs`, `referee.mjs`, `drive.mjs`, `persist.mjs` y sale 1 solo si algún hijo no devuelve 0.

```
scoring ok
backup ok
maps ok { courses: 54, perHole: 22, overview: 4, images: 404 }
referee ok
drive ok
storageSetItem fairway.activeRound.v1 Error [QuotaExceededError]: quota
    at Object.setItem (file:///workspace/tests/persist.mjs:90:21)
    at storageSetItem (eval at load (file:///workspace/tests/persist.mjs:57:14), <anonymous>:65:18)
    at Object.persistActiveRound (eval at load (file:///workspace/tests/persist.mjs:57:14), <anonymous>:150:10)
    at file:///workspace/tests/persist.mjs:256:28
    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:578:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:116:5)
persist ok
all tests ok
```

El `QuotaExceededError` no es un fallo de suite. `tests/persist.mjs` (bloque que asigna `memoryStorage("throw")` y llama `persistActiveRound`) fuerza esa excepción. `storageSetItem` la registra con `console.warn` y devuelve `false`. La aserción espera `persistActiveRound() === false` y un toast «No se pudo guardar». Después se imprime `persist ok`.

Lo que la suite cubre, y lo que no: hándicap y Stableford con campos de prueba; saneado e importación del JSON (incluye tope 99999 y rechazo a 100000); inventario de 54 campos y 404 imágenes; un subconjunto de citas del árbitro; plan de sync de Drive con dobles en memoria; persistencia de la ronda activa con almacenamiento simulado (cuota, escritura que no queda, JSON corrupto, copia `.bak`). No hay navegador, no hay Google real, no hay cuota real de `localStorage`.

## Inventario de funciones (lo que hay hoy)

Todo vive en `index.html` salvo el service worker. No hay módulos `fairway/js/*`.

- Partida en un solo teléfono: campo, tee, 9 o 18 hoyos, varios jugadores, golpes, putts, FIR, GIR, bruto, neto, Stableford, cierre con ganadores y placas (La Herrería usa `icons/escorial-monasterio.png`).
- Modalidades oficiales: Stroke Play, Stableford. Sociales: Putting King, GIR King, Birdie Hunt, Chaos Golf, Rey del Hoyo, Back Nine Brawl, Last Call, No Bogey Club, Creativo (reglas y puntos definidos en la partida; presets locales).
- Árbitro: chat en el dispositivo, Reglas de Golf 2023 (R&A / USGA), sin red. Pantalla `arbitro` y catálogo de reglas.
- Mapas: inventario contado en la sección Cartografía. No se ha inventado cartografía en esta fase.
- Caddie y restaurante, hoy: enlaces `tel:` solo para `la-herreria` (`CLUB_CONTACTS`). No hay un caddie de palos o de estrategia. El árbitro menciona al caddie en las reglas 10.2a y 10.2b(4).
- Stats: últimas 5, 10 o 20, temporada (desde enero), último año, o todo. La media de golpes brutos no mezcla largos distintos (el README lo describe; esta auditoría no ha reejecutado esa rama en un navegador).
- Perfil (nombre e Handicap Index), roster de jugadores guardados, historial, reabrir una vuelta, ajustes a mitad de ronda.
- Copia JSON manual (compartir archivo o descarga) y restauración desde un `.json`.
- Google Drive: código presente, identificador vacío (detalle abajo).
- PWA: `manifest.webmanifest`, iconos en `icons/` (192, 512, 512 maskable, apple-touch, svg, 180, monasterio), `.nojekyll`. GitHub Pages publica el repo tal cual. El despliegue `pages-build-deployment` del commit de partida terminó en success (run `36531237675`).
- Offline: el service worker precachea el shell y guarda planos vistos en `fairway-maps-v1`, con tope 120. No cachea hosts de Google.

Pantallas: `home`, `setup`, `lobby`, `hole`, `scorecard`, `leader`, `reglas`, `arbitro`, `close`, `perfil`, `historial`, `detalle`, `ajustes`, `stats`.

Hándicap, sin cambiarlo: `courseHandicapFor` hace `round(HI * slope/113 + (CR − par))` cuando el tee trae slope y CR; si no, redondea el HI. Nueve hoyos de un campo de dieciocho usan `round(CH18 / 2)` (`scaleHandicapForRound`). `refreshPlayerHandicaps` copia ese CH a `ph` («playing handicap = CH, 100% allowance»). Los tests de `tests/scoring.mjs` fijan el caso HI 10, slope 125, CR 71.5, par 72 → CH 11, y el reparto de golpes incluidos los plus. `clampHcp` recorta a −10…54 (el test lo comprueba).

## Cartografía

Contado en el árbol de la 4.0.11 (`COURSES` en `index.html`, `HOLE_MAP_COURSES`, directorios bajo `holes/`). Los mismos totales salen en `node tests/run.mjs`: `maps ok { courses: 54, perHole: 22, overview: 4, images: 404 }`. Las 404 imágenes son archivos `.webp`. En `holes/` no hay png ni jpeg; los otros 19 archivos de esas carpetas son `manifest.json`. Ninguna carpeta de `holes/` queda fuera de `HOLE_MAP_COURSES`.

| Hecho | Número |
| --- | --- |
| Campos en `COURSES` | 54 |
| Carpetas `holes/` | 26 |
| `.webp` bajo `holes/` | 404 |
| Con `manifest.json` (18 hoyos en el manifiesto, archivos citados presentes) | 19 |
| Carpeta de hoyos sin `manifest.json` | 3 |
| `overviewOnly: true` | 4 |
| Campos sin carpeta en `holes/` | 28 |

19 + 3 + 4 = 26 carpetas. 54 − 26 = 28 sin carpeta.

**Referencia: La Herrería** (`la-herreria`). Es el campo por defecto de la app. `holes/la-herreria/manifest.json` lista 18 hoyos y `01.webp`–`18.webp` están en la carpeta. `COURSES` también tiene 18 hoyos para ese id. El comentario de `HOLE_MAP_COURSES` dice que La Herrería además tiene embeds. No se ha añadido ningún plano.

Los otros 18 con manifiesto, mismos criterios (manifiesto de 18, `course.holes` de 18, ningún archivo citado ausente): `centro-nacional-de-golf`, `olivar-de-la-hinojosa`, `real-club-de-campo-villa-de-madrid`, `real-club-la-moraleja`, `las-rozas`, `lomas-bosque`, `retamares`, `el-encin`, `olivar-hinojosa-pitch-putt`, `villa-de-madrid-amarillo`, `aranjuez`, `lafinca-golf`, `torrejon`, `moraleja-campo-2`, `moraleja-campo-3`, `moraleja-campo-4`, `moraleja-pitch-putt`, `olivar-hinojosa-rec-2`.

**Sin manifiesto en la 4.0.11**, y el test de entonces los aceptaba así: `el-robledal`, `rshecc-norte`, `rshecc-sur`. No les faltaban los planos numerados: los tres tienen `01.webp`–`18.webp`. `rshecc-norte` y `rshecc-sur` tienen además `overview.webp`. `el-robledal` no.

**Fase 5.** Esos tres ya tienen `manifest.json`. Cada hoyo es solo `n` y `file`. No hay `name`: no se han inventado nombres de hoyo. `overview.webp` no entra como hoyo. Siguen 404 webp y 28 campos sin carpeta. El test ya no perdona un manifiesto ausente en un campo con planos numerados.

**`overviewOnly`**, un solo `overview.webp` cada uno: `forus-las-rejas-pares-3`, `forus-las-rejas-pitch-putt`, `centro-tecnificacion-golf-madrid`, `centro-tecnificacion-pitch-putt`.

La suma de los 404 webp es: 342 numerados de los 19 con manifiesto, más `overview.webp` en La Moraleja y en Torrejón (344), más 56 en los tres sin manifiesto (18 + 19 + 19), más 4 overview (404).

**28 sin carpeta**, incluida Puerta de Hierro. No están en `HOLE_MAP_COURSES`. Sí están ya como claves de `COURSE_GEO` (ortofoto PNOA). Esta fase no crea carpetas ni mueve coordenadas. Los que el objeto marca `approx: true` siguen marcados así.

Puerta de Hierro: `real-club-puerta-de-hierro`, `puerta-de-hierro-abajo`, `puerta-de-hierro-buenavista`, `puerta-de-hierro-buenavista-rci`, `puerta-de-hierro-buenavista-pp`.

El resto sin carpeta: `villa-de-madrid-pitch-putt`, `barberan-y-collar`, `race-jarama`, `race-pares-3`, `race-pitch-putt`, `lomas-bosque-pares-3`, `lomas-bosque-pitch-putt`, `encinas-boadilla-pitch-putt`, `rshecc-pitch-putt`, `green-paddock`, `golf-park`, `forus-las-rejas`, `negralejo-pitch-putt`, `negralejo`, `la-dehesa`, `aranjuez-pitch-putt`, `pozuelo`, `villa-el-escorial-pitch-putt`, `villa-el-escorial`, `cdscm-la-dehesa`, `golf-santander`, `el-encin-pitch-putt`, `mistral-samaranch`.

## Dependencias

- App en el navegador: APIs de plataforma (`localStorage`, `sessionStorage`, IndexedDB a partir de la fase 2, Cache / service worker, canvas, Web Share, `File`). Cero paquetes npm.
- Red opcional: `https://accounts.google.com/gsi/client` (solo al conectar Drive), `https://www.googleapis.com/drive/v3/` y upload multipart, WMS del IGN. El service worker no intercepta esos hosts.
- Tests: módulos nativos de Node (`assert`, `fs`, `child_process`, `url`, `path`). `tests/extract.mjs` recorta funciones del HTML por llaves.
- CI: `actions/checkout@v4` en `test-fairway.yml`. Pages es el workflow dinámico de GitHub, no un YAML del repo.

## Claves de almacenamiento

En el árbol 4.0.11 de partida la persistencia era solo `localStorage`, más una clave de `sessionStorage`. La fase 2 de esta rama añade IndexedDB como copia verificada (`docs/architecture.md`). No borra estas claves.

| Clave | Rol | ¿Entra en el JSON de copia? |
| --- | --- | --- |
| `fairway.rounds.v1` | Historial. Tope `ROUNDS_MAX = 99999` | Sí, como `rounds` |
| `fairway.rounds.bak.v1` | Copia anterior del historial si el principal no se lee | No. Es red de seguridad local |
| `fairway.activeRound.v1` | Ronda en curso | Sí, como `activeRound`. Al exportar, si el principal no tiene jugadores, se usa el `.bak` |
| `fairway.activeRound.bak.v1` | Copia anterior de la ronda en curso | Solo como respaldo de lectura, no como campo propio |
| `fairway.savedPlayers.v1` | Roster | Sí, como `roster` |
| `fairway.host.v1` | Nombre e HI del anfitrión | Sí, como `host` |
| `fairway.dataUpdatedAt` | Sello ISO para el plan de sync | Sí, como `updatedAt` (el valor, no el nombre de la clave) |
| `fairway.creative.v1` | Borrador de la modalidad Creativo | No como clave. Puede ir dentro de `activeRound.setup.creative` o de una partida cerrada |
| `fairway.creativePresets.v1` | Presets con nombre | **No** |
| `fairway.drive.fileId` | Id del `fairway-data.json` en Drive | No (puntero local) |
| `fairway.drive.folderId` | Id de la carpeta `Fairway` | No |
| `fairway.drive.meta` | Estado de sync (conectado, sellos, conflicto, pendiente). No guarda el access token | No |
| `fairway.drive.clientId` | Solo se borra en `driveDisconnect`. `getDriveClientId()` no la lee | No |
| `fairway.swReload` (`sessionStorage`) | Evita recargas del service worker en menos de 10 s | No |

En memoria, y se pierden al recargar: el access token de Drive (`_driveToken`), `state.deletedRounds`, `state.visibilityOverride`. `deleteRound` sí llama a `deleteSavedRound` y reescribe `fairway.rounds.v1`. `softDeleteDetalle` y `cycleDetalleVisibility` no tienen ningún llamador en el HTML; no son un borrado o una visibilidad que el usuario pueda pulsar hoy.

## Esquema JSON (exportar, restaurar, importar, Drive)

Un solo documento. Lo construye `collectFairwayBackup`. Lo acepta `validateFairwayBackup` (también `driveAcceptRemote`). Lo aplica `mergeFairwayBackup` (importación manual) y, con el plan de sync, `driveApplyResolved`.

Nombre de archivo manual: `fairway-data-AAAA-MM-DD.json`. En Drive: carpeta `Fairway`, archivo `fairway-data.json`. Scope OAuth: `https://www.googleapis.com/auth/drive.file`.

Campos de primer nivel que **escribe** la exportación:

- `version` (número, hoy 3), `app` (`"Fairway"`), `appVersion` (texto, hoy `"4.0.11"`), `exportedAt`, `updatedAt`
- `includes`: lista descriptiva, no se valida al importar
- `rounds[]`, `activeRound`, `roster[]`, `host`, `setup`

`setup` de primer nivel (courseId, tee, holes, modalities) **se exporta y no se restaura**. `validateFairwayBackup` no lo copia al objeto saneado. La ronda en curso viaja en `activeRound`, que sí lleva su `setup`.

`validateFairwayBackup` exige un objeto con `rounds` array. Rechaza más de 99999 partidas (`reason: "Demasiadas partidas en la copia"`). `version` ausente pasa a 1. `version > 3` pone `newer: true` y el import avisa y sigue con lo reconocible. No es un rechazo.

Partida (`sanitizeImportedRound`), campos que sobreviven al import:

- `id` (obligatorio tras recortar; si queda vacío, la partida se descarta), `dateISO`, `updatedAt`, `date`, `club`, `courseId`, `layout`, `tee`, `par`, `holes` (1–18), `holesPlayed` (0–18), `modalities` (máx. 12), `creative`, `official`, `players` (máx. 8), `me`, `winners` (máx. 12), `standings` (máx. 8)
- El texto pierde caracteres de control y `<>` (`clipStr`)

Jugador importado: `id`, `name`, `short`, `initials`, `hcp` (o null; si hay número, `clampHcp`), `ch` y `ph` redondeados a −18…54, `guest`, `ball`, `withdrawn`, `scores` (hoyos 1–18, valor 0–30), `putts` (0–15), `fir` (`hit`/`miss`/`na`), `gir` (`yes`/`no`/`na`), `totalsGross`, `totalsPutts`, `creativePts`, `creativeLog` (máx. 80).

`me` y cada fila de `standings`: agregados numéricos (`gross`, `net`, `toPar`, `sf`, `thru`, `ch`, `strokesUsed`, putts, birdies, FIR/GIR, etc.). Un número no finito pasa a `null`.

`activeRound` saneado: `v: 1`, `hole` 1–18, `activePlayer`, `editingRoundId`, `dataTier`, `scNine` (`in` u `out`), `scCard` (`net` o `gross`), `club`, `setup` (incluye `writeMode` forzado a `"single_device"` y `creative` saneado), `players`, `setupPlayers`.

`roster`: máx. 80, exige `id` y `name`, `hcp` por defecto 18 si no es finito.

`host`: `name` y `hcp` (null si viene vacío).

Creativo: `rulesText` (máx. 2000) y hasta 30 acciones (`id`, `trigger`, `label`, `pts` −20…20).

Fusión de partidas (`driveMergeRounds`): por `id`, gana el `updatedAt` o, si no hay, el `dateISO` más reciente (comparación de cadenas `>=`). Las que solo están en un lado se conservan. El resultado se corta a 99999.

Protección de la ronda local, leída en el código y cubierta en parte por tests: `localActiveRoundIsProtected`, `drivePickActiveRound`, `driveSyncPlan` con `keepLocalActive`. Importar no sustituye la ronda local si está sucia, si la pantalla es de juego, o si la protección local está activa; en ese caso hay un toast «La ronda en curso de este dispositivo se mantiene». `driveAuthFailure` devuelve `wipeLocal: false` en 401, 403 y 500. No hay `localStorage.clear` ni `client_secret` en `index.html` (el test de Drive lo afirma).

El toast de importación usa `data.rounds.length` del JSON crudo, no el número de partidas que quedan tras sanear. Si alguna partida se descarta por `id` vacío, el mensaje puede contar de más. No se ha reproducido con un archivo de usuario; el código hace eso.

`mergeFairwayBackup` escribe `remote.host` encima de `fairway.host.v1` siempre que el JSON traiga `host`, también cuando conserva la ronda local. No compara sellos del perfil. Es un comportamiento del código, no una pérdida observada en un dispositivo.

## Google Drive

`FAIRWAY_DRIVE_CLIENT_ID` en `index.html` es el client id público de OAuth web registrado para `https://ardu01.github.io` y `https://ardu01.github.io/app-golf/` (4.1.2). No es un secreto. `getDriveClientId()` devuelve solo esa constante. `driveConnect()` si estuviera vacía mostraría «Esta copia de Fairway todavía no tiene Google Drive configurado.» y no llamaría a Google.

No hay client secret en el repo. El access token vive en memoria. `fairway.drive.meta` guarda banderas y sellos (`connected`, `lastSync`, `lastSyncUpdatedAt`, `lastSyncRemoteModifiedTime`, `lastSyncedHash`, `pending`, `status`, `needsReconnect`, `conflict`, `conflictChoice`), no el token.

Estados de UI ya implementados en `driveUiState`: No conectado, Conectando…, Sincronizando…, Sin conexión, Cambios pendientes, Necesita reconexión, Conflicto, Sincronizado. Debounce 4000 ms. El cierre de ronda y el sync manual piden envío inmediato (`driveSyncImmediate`).

La 4.1.2 ya lleva el client id público del origen de Pages. No hay credenciales de Google en CI, así que los tests no abren una sesión real. `tests/drive.mjs` cubre el plan, el merge y el saneado con datos ficticios. No cubre GIS ni la API real, y no afirma un E2E.

## Workflows

| Workflow | Disparo | Qué haría si un runner arranca | Estado en esta fase |
| --- | --- | --- | --- |
| `test-fairway.yml` | push a `main`, y todo pull request | `node tests/run.mjs`. No despliega y no tiene `needs` que Pages pueda esperar | Se deja. Hoy no llega a ejecutarse (ver defectos). Un comentario en el YAML remite a esta página: no es la puerta de Pages |
| `publish-fairway-v3.yml` | En `main` sigue `workflow_dispatch` + `contents: write`. En esta rama ya no | En `main`: curl de `index.html` desde `ardu01/app-golf-v3` y `git push` de la rama elegida (el botón usa `main` por defecto) | **Neutralizado en esta rama.** Sin `workflow_dispatch`, sin `contents: write`, sin curl, sin commit y sin `git push`. El job lleva `if: false` y `contents: read`. El botón de Actions lo sigue sirviendo `main` hasta que este PR se fusione. Esta fase no fusiona |
| `apply-fairway-multicourse.yml` | En `main`: `workflow_dispatch` y push de `ops/fairway-multicourse-patch/**`. En esta rama ya no | En `main`: `apply.py`, copia `ops/fairway-multicourse-patch/sw.js` (caché `fairway-v159`, `skipWaiting`, borra el resto de cachés, mapas incluidos) y `git push` | **Neutralizado en esta rama**, igual que el de V3: sin dispatch, sin copia de `sw.js`, sin push, `if: false`, `contents: read`. En `main` sigue hasta fusionar |
| `apply-player-tees.yml` | En `main`: `workflow_dispatch` y push del parche o del propio YAML, `contents: write`. En esta rama ya no | En `main`: si `index.html` no contiene `function setPlayerTee`, aplica `patches/player-tees.patch`, commit y `git push` | **Neutralizado en esta rama.** Sin dispatch, sin `git apply`, sin push, `if: false`, `contents: read`. El parche sigue sin aplicar (`index.html:1884`). En `main` el botón sigue hasta fusionar |
| `assemble-fairway-index.yml` | En `main`: `workflow_dispatch`, `contents: write`. En esta rama ya no | En `main`: si existe `index.parts/`, reemplaza `index.html`, decodifica `*.b64` y `git push` si hay diff | **Neutralizado en esta rama.** Sin dispatch, sin ensamblado, sin push, `if: false`, `contents: read`. No hay `index.parts` ni `*.b64` |
| `decode-fairway-binaries.yml` | En `main`: `workflow_dispatch`, `contents: write`. En esta rama ya no | En `main`: decodifica `*.b64`, exige `count > 0`, commit y `git push` | **Neutralizado en esta rama.** Sin dispatch, sin decode, sin push, `if: false`, `contents: read` |

Historial consultado con `gh` (solo lectura):

- `test-fairway`: los runs recientes, incluido el del commit de partida `36531238573`, están en failure. La anotación del check es «The job was not started because your account is locked due to a billing issue.» La consulta de runs con `status=success` de ese workflow devuelve total 0. No es un fallo de aserción: el job no arranca. El mismo texto de facturación aparece en un run anterior, de cuando el producto era 4.0.2 (`36463852053`). Ese run no es el baseline. El baseline sigue siendo la 4.0.11.
- `Publish Fairway V3`: dos `workflow_dispatch` sobre `main` el 2026-09-23 (runs `35834656865` y `35834594078`). Los dos en failure con la misma anotación de facturación. No hay evidencia de que llegaran a escribir `index.html`. En `main` el YAML sigue activo (`workflow_dispatch` y `contents: write`). El cambio que quita el botón está solo en `release/fairway-4.1`. GitHub ofrece `workflow_dispatch` desde la rama por defecto, así que el botón de producción sigue ahí hasta fusionar. No se fusiona en esta fase.
- El apply multi-course, el de tees y el decode también tienen runs en failure con esa anotación. Assemble no tiene runs en el listado pedido.

### Pages publica sin mirar los tests

Demostrado en el mismo commit de `main`, app 4.0.11, SHA `7bbfee7474dbc11b1874b1c707cd98763a63965e`:

| | Pages | Tests |
| --- | --- | --- |
| Workflow | `pages-build-deployment` | `test-fairway` |
| Ruta | `dynamic/pages/pages-build-deployment` (no está en el repo) | `.github/workflows/test-fairway.yml` |
| Run | [`36531237675`](https://github.com/ardu01/app-golf/actions/runs/36531237675) | [`36531238573`](https://github.com/ardu01/app-golf/actions/runs/36531238573) |
| Evento | `dynamic` | `push` |
| Creado | 2026-09-29T06:28:26Z | 2026-09-29T06:28:27Z |
| Conclusion | **success** (cerrado 06:28:52Z) | **failure** (cerrado 06:28:30Z) |
| Id de workflow | 362688059 | 365529253 |

La API del sitio (`GET /repos/ardu01/app-golf/pages`) devuelve `build_type: "legacy"`, `source.branch: "main"`, `source.path: "/"`, `status: "built"`, `https://ardu01.github.io/app-golf/`. Cada push a `main` despliega la raíz del repo por ese camino. `test-fairway.yml` solo lanza `node tests/run.mjs`. No hay `needs` entre los dos. Pages no hace `git push` de vuelta; publica el árbol que ya está en `main`.

El fallo del test en ese run es el bloqueo de facturación (el job no arrancó), no una aserción rota. El defecto de CI es otro: **el éxito de Pages no depende del check de tests.** Con el test en rojo, la 4.0.11 quedó publicada.

### Seguimiento para que los tests cierren la publicación

No se puede añadir `needs: test` al workflow dinámico. Tampoco se añade en este PR un `actions/deploy-pages` con `on: push`. Mientras `build_type` siga en `legacy`, ese archivo no sustituye al despliegue de rama: o falla al margen, o publica **además** del legado. Cambiar el origen de Pages es un ajuste del repositorio, no un archivo, y hecho antes de que el workflow esté en `main` dejaría el sitio sin publicador. Esta fase no llama a la API de Pages y no fusiona.

Hacerlo en una sola ventana, en este orden:

1. Confirmar que se acepta una pausa de Pages mientras el runner no arranque. Hoy `test-fairway` no obtiene máquina (facturación). Un deploy que dependa de ese test **no publicará** hasta que el job pueda empezar y `node tests/run.mjs` salga 0. En local la suite ya sale 0; el rojo de GitHub no es una aserción.
2. Poner en `main` un workflow nuevo, por ejemplo `.github/workflows/pages.yml`, cuyo job de deploy tenga `needs: test` y el test sea el mismo comando (`node tests/run.mjs`). Permisos: `contents: read`, `pages: write`, `id-token: write`. El artefacto es la raíz del repo (tiene que seguir incluyendo `holes/`, `icons/`, `index.html`, `sw.js`, `manifest.webmanifest` y `.nojekyll`). No activar el `on: push` de ese archivo mientras el legado siga desplegando.
3. En la misma ventana, cambiar el origen de Pages de «Deploy from a branch» (`legacy`, rama `main`, path `/`) a «GitHub Actions» y elegir ese workflow. La API de hoy es `build_type: "legacy"` y `source: {branch: "main", path: "/"}`. El reemplazo es `build_type: "workflow"`.
4. Comprobar en el push siguiente que `pages-build-deployment` ya no corre y que el job de deploy no empieza si el test no termina en success.
5. No dejar los dos publicadores encendidos. No cambiar el ajuste antes de que el YAML esté en la rama por defecto.

`test-fairway.yml` puede seguir como check de pull request. No basta una regla de rama: el caso demostrado es un commit que **ya está** en `main` y Pages lo publica igual.

### Workflows que empujan la rama del checkout (incluido `main`)

Confirmado leyendo el YAML. Ninguno escribe `git push origin main` a mano. Todos hacen `git push` sin refspec después de `actions/checkout@v4`, que deja la rama del evento. En `workflow_dispatch` la UI elige rama y el valor por defecto es la rama por defecto (`main`). En un `push` a `main` que cumpla el filtro de paths, el checkout también es `main`. Con `contents: write`, el `GITHUB_TOKEN` puede actualizar esa rama si el remoto lo acepta. La protección de rama de `main` no se pudo leer (la API respondió 403), así que no se afirma que no haya protección.

| Workflow | ¿`git push`? | ¿Puede ser `main`? |
| --- | --- | --- |
| `publish-fairway-v3.yml` en `main` | Sí, tras sustituir `index.html` | Sí. Es el caso de los dos dispatch ya registrados, que no llegaron a ejecutar pasos |
| `publish-fairway-v3.yml` en esta rama | No. El paso no hace push y el permiso es `contents: read` | El archivo de esta rama no ofrece dispatch |
| `apply-fairway-multicourse.yml` en `main` | Sí, `index.html` y `sw.js`, si hay diff | Sí, por dispatch o por un push a `main` dentro de `ops/fairway-multicourse-patch/**` |
| `apply-fairway-multicourse.yml` en esta rama | No | El archivo de esta rama no ofrece dispatch ni el push por carpeta |
| `apply-player-tees.yml` en `main` | Sí, `index.html`, si el parche se aplica | Sí, por dispatch o por un push a `main` del parche o del YAML. Hoy el parche no aplica |
| `apply-player-tees.yml` en esta rama | No | El archivo de esta rama no ofrece dispatch |
| `assemble-fairway-index.yml` en `main` | Sí, `git add -A`, si hay diff | Sí, si se dispara eligiendo `main` |
| `assemble-fairway-index.yml` en esta rama | No | El archivo de esta rama no ofrece dispatch |
| `decode-fairway-binaries.yml` en `main` | Sí, `git add -A`, si hay `*.b64` | Sí, si se dispara eligiendo `main` |
| `decode-fairway-binaries.yml` en esta rama | No | El archivo de esta rama no ofrece dispatch |
| `test-fairway.yml` | No | No escribe en el repo |

En esta rama quedan cortados V3, multi-curso, tees, ensamblado y decode. En `main` siguen hasta la fusión. Ningún YAML de esta rama hace `git push`.

## Defectos demostrados

1. **El check `test-fairway` está rojo en `main` y el job no llega a ejecutar tests.** En el commit `7bbfee7474dbc11b1874b1c707cd98763a63965e`, run `36531238573`, job `109285172078`: conclusion failure, steps vacíos, anotación de facturación citada arriba. La suite, en esta máquina, termina en `all tests ok`. No se presenta el rojo de GitHub como un fallo de hándicap, mapas o persistencia.

2. **Pages publica con el check de tests en rojo.** En ese mismo SHA (app 4.0.11), `pages-build-deployment` run `36531237675` terminó en success a las 06:28:52Z, después de que `test-fairway` run `36531238573` ya hubiera fallado (06:28:30Z). El sitio es despliegue legacy de la rama `main` (`build_type: legacy`, path `/`). El workflow de Pages no está en el repositorio y no espera a `test-fairway.yml`. El defecto es de acoplamiento de CI, no una aserción de la suite. El seguimiento para cerrarlo está en la sección de workflows. Este PR no cambia el publicador: encender `deploy-pages` al lado del legado no lo apaga.

3. **No se ha reproducido un defecto de lógica de la app** en las seis suites ni leyendo los caminos de guardado que esas suites extraen. La traza `QuotaExceededError` del log es el caso de prueba de cuota, y la suite la da por buena.

## Riesgos potenciales

No son bugs confirmados en un dispositivo. Son capacidades o huecos leídos en el código o en los workflows.

1. **`publish-fairway-v3.yml` en `main` sigue pudiendo sustituir la app.** Ese archivo, el que Actions usa hoy, tiene `workflow_dispatch`, `contents: write`, descarga `index.html` de `app-golf-v3` y hace `git push`. Los dos dispatch de septiembre no llegaron a ejecutarse por la facturación. En `release/fairway-4.1` ese camino ya no está: no hay botón en el YAML, no hay escritura ni curl. El botón real desaparece al fusionar el PR, no antes. Revertir este archivo lo devolvería.
2. **`apply-fairway-multicourse.yml` en `main` sigue pudiendo pisar `sw.js`.** El YAML de `main` copia la variante v159 (`skipWaiting` y borrado del resto de cachés, mapas incluidos) y empuja `index.html`. En `release/fairway-4.1` ese camino ya no está. El botón y el push por carpeta desaparecen al fusionar, no antes.
3. **Al desbloquearse la facturación se reactivan a la vez** el test y todos los workflows con `contents: write`, no solo el test.
4. **Presets creativos (`fairway.creativePresets.v1`) no viajan** en el JSON ni en Drive. Un cambio de teléfono los deja atrás. No hay constancia en el repo de que un usuario los esté usando.
5. **El perfil (`host`) del JSON remoto pisa el local** en `mergeFairwayBackup` y en `driveApplyResolved` sin comparar fechas, aunque la ronda en curso se conserve.
6. **`setup` de primer nivel se exporta y se tira al validar.** La ronda viva va en `activeRound`. Quien dependa del `setup` suelto del JSON no lo recupera.
7. **Historial hasta 99999 partidas contra la cuota de `localStorage`.** El código responde a `QuotaExceededError` (test de memoria) y no migra a IndexedDB. No se ha medido el tamaño real en Safari ni en Chrome.
8. **Service worker cache-first del shell.** `fairwayShouldHoldUpdate` evita `SKIP_WAITING` y el reload con ronda, cierre o pantallas de juego, y `fairway.swReload` corta recargas a menos de 10 s. Un `index.html` nuevo con el mismo `sw.js` se sirve primero desde caché y se actualiza en segundo plano. El README de esta 4.0.11, en el párrafo que cuenta la 4.0.7, dice que a veces hace falta borrar datos del sitio para coger el worker nuevo. No se ha medido en un teléfono en esta fase.
9. **Drive de punta a punta no se ejecuta en CI.** La 4.1.2 pone el client id público. No hay credenciales de Google en el repositorio ni en el job de tests. El plan de conflicto está testeado con dobles, no contra Google. No se inventan credenciales ni se afirma un E2E.
10. **Centros `COURSE_GEO` con `approx: true`** son aproximados por marca del propio código. Tratarlos como levantamiento no está justificado. Esta fase no los mueve.
11. **El parche de tee por jugador no entra en el `index.html` actual.** Si más adelante el contexto vuelve a coincidir, el workflow lo aplicaría y haría push. Hoy `git apply --check` falla.

## Deuda técnica

- Un solo `index.html` de 10419 líneas (CSS, marcado y JS). Los tests dependen de extraer funciones por texto. Partirlo es la fase 2, no esta.
- No hay `package.json`, ni changelog, ni `docs/architecture.md`. `docs/` ya existía para `docs/recorrido/` (capturas y vídeos del README).
- El README sigue presentando «Versión 3.0» mientras el producto es 4.0.11. El esquema de copia, a propósito, sigue en 3.
- `softDeleteDetalle` y `cycleDetalleVisibility` no se llaman. `fairway.drive.clientId` se borra y no se lee.
- `ops/fairway-multicourse-patch/sw.js` y `patches/player-tees.patch` no describen el árbol 4.0.11.
- `icons/icon-512-maskable.png` está en el manifiesto y en disco. El precache del service worker no lo incluye (sí incluye 192, 512, apple-touch y el monasterio). El maskable se pide al instalar la PWA, no al precachear el shell.
- `PH` se guarda igual que `CH`. Es el comportamiento actual comentado en `refreshPlayerHandicaps`, no una corrección pendiente de esta auditoría. No se toca la fórmula.

## Mejoras funcionales

Previstas por la misión 4.1 y **no empezadas** aquí. No son defectos demostrados.

- Migración a IndexedDB idempotente, con copia previa y sin borrar `localStorage` hasta verificar. Hace falta antes de subir el volumen del historial con seguridad.
- Módulos (`css/` y `js/` de la misión) sin cambiar el comportamiento ni exigir un build para abrir la app. El README dice que la partida real depende del archivo único.
- Drive usa el client id público de la 4.1.2 para el origen de Pages, con los estados que el código ya nombra. Sigue sin backend y sin refresh token de larga duración; el propio README lo dice. No hay sesión real contra Google en CI.
- Incluir en la copia los presets creativos, si se decide que son datos de usuario que deben sobrevivir a un cambio de aparato.
- Tee de salida por jugador: existe como parche que no aplica, no como función en 4.0.11. El producto actual tiene un tee de partida.
- Caddie de juego (palos, estrategia): no está. Lo que hay es la llamada al caddie master de La Herrería y las reglas sobre el caddie.
- Stats y cartografía nuevas solo con datos ya existentes. No inventar planos.

## Pruebas pendientes

- Volver a lanzar `test-fairway` en GitHub cuando la cuenta pueda arrancar runners. Hasta entonces el verde local no se refleja en el check.
- Recorrido manual de la PWA: actualizar el service worker con una ronda abierta, offline, y un plano ya visto dentro del tope de 120. Esta fase no abrió el navegador contra un servidor.
- Importar un JSON real de un usuario (no hay muestras de partidas en el repo) y comprobar el conteo del toast frente a las partidas que el saneado conserva.
- Cuota real de `localStorage` con un historial grande, en Safari y en Chrome.
- Drive contra Google: el client id público ya está en la 4.1.2. No hay credenciales en CI, así que esta lista no da el sync real por hecho.
- Modalidades sociales una a una (Chaos, Rey, Back Nine, Last Call, No Bogey, Creativo). `tests/scoring.mjs` fija hándicap, reparto y Stableford, no cada modo social.
- Árbitro: la suite cubre un conjunto de frases (agua, árbol, divot, búnker, injugable). No es una cobertura de las Reglas completas.
- Migración IndexedDB: no hay implementación que probar.
- Que un dispatch en `main` no pueda pisar `index.html` o `sw.js`. En esta rama V3, multi-curso, tees, ensamblado y decode ya no tienen dispatch ni `git push`. En `main` esos botones siguen hasta la fusión. Esta fase no fusiona.

## Orden recomendado para las fases 2–7

El orden sale de lo que está demostrado arriba, no de reescribir la app en abstracto.

1. **Fase 2 — contrato de datos, luego módulos.** En esta rama ya está la migración a IndexedDB descrita en `docs/architecture.md`: idempotente, con foto previa, sin borrar `localStorage`, con tests de round-trip, JSON corrupto, cuota e interrupción. El esquema del JSON sigue en 3. El corte grande de `index.html` (puntuación, pantallas, CSS) sigue pendiente: la suite extrae funciones por texto y un extract roto la dejaría ciega. Los workflows que hacían `git push` quedan neutralizados en esta rama.
2. **Fase 3 — Drive y service worker, sin credenciales inventadas.** El plan pedía no inventar un client id. La 4.1.2 pone el id público ya registrado; el sync real sigue sin probarse en CI. Se puede endurecer el versionado del `SHELL` ligado al release y la espera de reload con ronda activa. Conflictos: el plan ya existe en tests; falta el caso de perfil (`host`) que hoy se pisa.
3. **Fase 4 — puntuación, stats, caddie.** No cambiar `courseHandicapFor` ni `strokesOnHole` sin un test que fije el número anterior. Separar CH y PH solo si hay una regla nueva y tests; hoy son el mismo valor a propósito. El caddie nuevo no sustituye el `tel:` de La Herrería ni al árbitro.
4. **Fase 5 — cartografía y UX.** Partir del inventario contado: 54 campos, 26 carpetas, 404 webp, 19 con manifiesto (referencia La Herrería), 3 sin manifiesto, 4 `overviewOnly`, 28 sin carpeta (Puerta de Hierro incluida, ya en `COURSE_GEO`). No crear planos ni recolocar los `approx: true`. La piel de partida es la de la 4.0.11. Los párrafos 4.0.1–4.0.10 del README son el camino hasta esa piel, no otra versión de partida. Esta fase no la rediseña.
5. **Fase 6 — tests y seguridad.** Dos huecos distintos: el runner no arranca (facturación) y, aunque arrancara, Pages legacy no lo espera. El cierre de publicación es el seguimiento de la sección de workflows (un solo publicador, `needs: test`), no un `deploy-pages` añadido al lado del legado. Revisar que ningún workflow con `contents: write` pueda publicar otro `index.html`. El saneado de importación ya quita `<>` y está testeado; no relajarlo al partir el archivo.
6. **Fase 7 — 4.1.0.** Subir la versión de producto, el texto del manifiesto y el nombre de caché del shell juntos. Dejar `version: 3` del JSON salvo que la migración tenga tests y un lector de las copias viejas. No marcar estable mientras el check de tests no pueda arrancar, o mientras un workflow pueda sustituir `index.html` por V3.

## Fuera de la fase 1, a propósito

La fase 1 no partió `index.html`, no cambió fórmulas ni mapas, no inventó un client id y no fusionó `main`.

## Fase 2 en esta rama

IndexedDB guarda una copia verificada de las claves de la auditoría (historial, ronda activa y `.bak`, roster, host, creativo, presets, punteros de Drive). No guarda el token OAuth ni `fairway.drive.clientId`. `localStorage` sigue siendo la copia que lee el marcador y no se borra al verificar. El esquema del JSON sigue en 3. Los módulos nuevos están en `fairway/js/`. El CSS y la puntuación no se han extraído. Los cinco workflows que hacían `git push` (V3, multi-curso, tees, ensamblado, decode) quedan sin dispatch y sin push en esta rama. `main` no se ha fusionado.

## Fase 3 en esta rama

En la fase 3 el client id de Drive seguía vacío. La 4.1.2 lo rellena; el detalle está en `docs/drive-sync.md` (cliente OAuth web, origen `https://ardu01.github.io`, alcance `drive.file`, sin secreto y sin refresh token). Si no hay id, la etiqueta es «Sin configurar»; un conflicto sigue siendo «Conflicto». El aviso de conflicto dice que la ronda en curso no se sustituye hasta elegir. El perfil sigue escribiéndose con la copia aplicada: no se ha cambiado `mergeFairwayBackup`. El shell sigue en `fairway-v4-411` hasta la 4.1.0. `tests/pwa.mjs` cubre que no hay reload a mitad de ronda. No se ha añadido `deploy-pages` al lado del Pages legado.

## Fase 4 en esta rama

Stats muestra Gross · 9 y Gross · 18 por separado. Una vuelta de 9 y otra de 18 ya no se quedan sin media de gross: cada largo tiene la suya y no se mezclan. La fórmula de hándicap no se ha movido ni extraído. La 4.1.1 quita la bolsa de palos y cualquier recomendación de juego. El `tel:` de La Herrería sigue. `PH` sigue igual que `CH`.

## Fase 5 en esta rama

Manifiestos nuevos, sin nombres, para `el-robledal`, `rshecc-norte` y `rshecc-sur`, apuntando a los webp que ya existían. `tests/maps.mjs` comprueba que cada `file` existe y que esos tres no llevan `name` ni `overview` como hoyo. No hay planos nuevos. Las fichas de acceso del hoyo tienen área de toque 48×48; el pie del hoyo ya era 50px y el − / + de golpes 52×52. No se ha rediseñado la piel de la 4.0.11.

## Fase 6 en esta rama

`tests/security.mjs` cubre `clipStr`, `escapeHtml`, un backup con etiquetas, el client id público de la 4.1.2 (sin secreto) y que ningún workflow de esta rama (fuera de comentarios) hace `git push`. `tests/e2e.mjs` abre el hoyo en Chrome con Playwright, comprueba que no hay bolsa, que el `tel:` de La Herrería sigue y que el pie del hoyo mide 50px en un viewport de 390×844. Esa prueba no está dentro de `node tests/run.mjs` y GitHub no la corre: el job de tests no arranca por facturación y la suite unitaria no depende de npm. El detalle está en `docs/testing.md`.

## Fase 7 en esta rama

El producto de esta rama es **4.1.2**: cabecera, perfil, `appVersion` del JSON, `manifest.webmanifest` y `APP_VERSION` en `fairway/js/keys.js`. El shell es `fairway-v4-412`. `FAIRWAY_DRIVE_CLIENT_ID` es el client id público de `https://ardu01.github.io`. El esquema del JSON sigue en 3. La partida documentada arriba sigue siendo la 4.0.11 de `main`. Documentos: `docs/architecture.md`, `docs/data-migration.md`, `docs/drive-sync.md`, `docs/testing.md`, `docs/release-4.1.md`, `CHANGELOG.md`. `test-fairway.yml` sigue siendo el check del PR y no publica. No se ha fusionado `main`.
