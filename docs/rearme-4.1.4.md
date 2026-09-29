# Rearme 4.1.4

Producto **4.1.4**. Esquema del JSON **3**. No se inventan secretos ni client ids. No se fusiona `main` desde esta rama.

Partida: `main` en 4.1.3.1 (`ac51107`, gesto atrás quieto en Inicio). No hay una 4.2 fusionada. Esta limpieza sube el parche a **4.1.4**.

## Qué se quita de Actions

En `main` esos cinco archivos ya no descargaban ni empujaban: el job llevaba `if: false` y el disparo era un push a una rama que no existe. Seguían dados de alta como workflows activos. Al desbloquearse la facturación, un push a ese nombre de rama o un revert del YAML volvía a dejar el botón o el `git push` a un paso de distancia.

Se borran del árbol, para que al fusionar GitHub deje de leerlos en la rama por defecto:

| Archivo | Qué hacía cuando estaba vivo |
| --- | --- |
| `publish-fairway-v3.yml` | Descargaba `index.html` de `ardu01/app-golf-v3` y hacía `git push` |
| `apply-fairway-multicourse.yml` | Copiaba un `sw.js` con `skipWaiting` y hacía `git push` |
| `apply-player-tees.yml` | Aplicaba `patches/player-tees.patch` y hacía `git push` |
| `assemble-fairway-index.yml` | Reescribía `index.html` desde partes y hacía `git push` |
| `decode-fairway-binaries.yml` | Decodificaba `*.b64` y hacía `git push` |

También salen las cargas que esos workflows aplicaban: `ops/fairway-multicourse-patch/` (el `sw.js` de la caché `fairway-v159`) y `patches/player-tees.patch`. Sin el YAML y sin el parche, no hay nada que volver a enganchar copiando un archivo.

No se añaden secretos, ni `workflow_dispatch`, ni `curl`, ni `contents: write`.

## Qué se queda

`test-fairway.yml` es el único workflow del repositorio.

- Se dispara en push a `main` y en cada pull request.
- Permiso: `contents: read`.
- Un paso: `node tests/run.mjs`.
- No despliega y no empuja.

Pages no cambia de sitio. Sigue el publicador legacy de GitHub (`pages-build-deployment`, `build_type: legacy`, rama `main`, path `/`, sitio `https://ardu01.github.io/app-golf/`). Ese workflow no vive en el repo. Publica el árbol que ya está en `main`. No descarga V3 y no hace `git push`.

No se añade `actions/deploy-pages` al lado. Con el legado encendido, un segundo publicador desplegaría otra vez y gastaría minutos. Cambiar el origen de Pages a Actions es un ajuste del repositorio, en la misma ventana en que el YAML ya esté en `main`, y no forma parte de este cambio.

Mientras la cuenta no arranque runners, `test-fairway` sigue en rojo por facturación. Pages legacy publica igual. Eso ya estaba así. Este rearme no lo empeora y quita los workflows que, al volver los minutos, podían escribir en la rama.
