/* Shell cache: product version with the extra minor zero collapsed. 4.0.11 → 411, 4.1.0 → 410, 4.1.1 → 411, 4.1.2 → 412, 4.1.3 → 413, 4.1.3.1 → 4131, 4.2.1 → 421, 4.2.2 → 422, 4.2.3 → 423, 4.2.4 → 424, 4.2.5 → 425, 4.2.6 → 426, 5.0.0 → 500, 5.0.1 → 501, 5.0.2 → 502, 5.0.3 → 503, 5.0.4 → 504, 5.0.5 → 505. */
const SHELL = "fairway-v5-505";
const MAPS = "fairway-maps-v1";
const MAPS_MAX = 120;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./fairway/js/keys.js",
  "./fairway/js/persistence.js",
  "./fairway/js/idb.js",
  "./fairway/js/persist-boot.js",
  "./fairway/js/shared-round.js",
  "./fairway/js/shared-mail.js",
  "./fairway/js/shared-rtc.js",
  "./fairway/js/shared-boot.js",
  "./fairway/js/courses.js",
  "./fairway/js/scoring-boot.js",
  "./fairway/js/scoring.js",
  "./fairway/js/rounds-boot.js",
  "./fairway/js/rounds.js",
  "./fairway/css/fairway.css"
];

function isMapUrl(url) {
  return url.origin === self.location.origin && url.pathname.indexOf("/holes/") !== -1;
}

function isShellUrl(url) {
  if (url.origin !== self.location.origin) return false;
  const file = url.pathname.split("/").pop();
  if (!file) return true;
  if (url.pathname.indexOf("/fairway/js/") !== -1 && /\.js$/.test(file)) return true;
  if (url.pathname.indexOf("/fairway/css/") !== -1 && /\.css$/.test(file)) return true;
  return file === "index.html"
    || file === "manifest.webmanifest"
    || file === "icon-192.png"
    || file === "icon-512.png"
    || file === "apple-touch-icon.png"
    // Not precached. Fetched only when the La Herrería plaque is drawn.
    || file === "escorial-monasterio.png";
}

async function trimMaps(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAPS_MAX) return;
  await Promise.all(keys.slice(0, keys.length - MAPS_MAX).map((req) => cache.delete(req)));
}

async function migrateHoleMaps() {
  const names = await caches.keys();
  const maps = await caches.open(MAPS);
  for (const name of names) {
    if (name === SHELL || name === MAPS) continue;
    const old = await caches.open(name);
    const keys = await old.keys();
    for (const req of keys) {
      let url;
      try { url = new URL(req.url); } catch (e) { continue; }
      if (!isMapUrl(url)) continue;
      const res = await old.match(req);
      if (res) await maps.put(req, res);
    }
  }
  await trimMaps(maps);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await migrateHoleMaps();
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL && k !== MAPS).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event && event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  const host = url.hostname;
  if (host === "accounts.google.com" || host === "oauth2.googleapis.com" || host.endsWith(".googleapis.com") || host.endsWith(".google.com") || host === "google.com") return;
  const map = isMapUrl(url);
  const shell = !map && isShellUrl(url);
  if (!map && !shell) return;
  event.respondWith((async () => {
    const cache = await caches.open(map ? MAPS : SHELL);
    const cached = await cache.match(req);
    const network = fetch(req).then(async (res) => {
      if (res && res.ok) {
        if (map) await cache.delete(req);
        await cache.put(req, res.clone());
        if (map) await trimMaps(cache);
      }
      return res;
    }).catch(() => cached || Response.error());
    return cached || network;
  })());
});
