# Changelog

## 4.1.1

Esquema del JSON de copia: 3. Las copias de la 4.0.11 y de la 4.1.0 siguen entrando.

- Sale la bolsa de palos: la ficha del hoyo, los nombres guardados y `fairway.bag.v1`. No hay recomendación de palo ni de juego conservador o agresivo.
- Siguen el teléfono del caddie de La Herrería, el árbitro, el marcador y la copia de la ronda.
- El service worker pasa a `fairway-v4-411` y no recarga con una ronda abierta.

## 4.1.0

Esquema del JSON de copia: 3. Las copias de la 4.0.11 siguen entrando.

- IndexedDB guarda una copia verificada del historial, la ronda activa y su `.bak`, el roster, el perfil, el creativo, los presets y los punteros de Drive. `localStorage` no se borra al verificar. No se migra el token de OAuth.
- Los workflows que descargaban V3, aplicaban el parche multi-curso, aplicaban tees, ensamblaban `index.html` o decodificaban `.b64` quedan sin dispatch y sin `git push` en esta rama.
- Google Drive sigue sin client id. El panel lo dice. Un conflicto no sustituye la ronda en curso hasta elegir.
- El service worker pasa a `fairway-v4-410` y no recarga con una ronda abierta.
- Las estadísticas separan Gross · 9 y Gross · 18.
- El teléfono del caddie de La Herrería sigue.
- `el-robledal`, `rshecc-norte` y `rshecc-sur` tienen manifiesto de los planos que ya existían, sin nombres de hoyo.
- La fórmula de hándicap no cambia.

## 4.0.11

Cabecera más baja y ficha del jugador al inicio del hueco. Esquema 3.
