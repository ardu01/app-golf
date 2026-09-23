const SHELL = "fairway-v3-193";
const MAPS = "fairway-maps-v1";
const MAPS_MAX = 120;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

function isMapUrl(url) {
  return url.origin === self.location.origin && url.pathname.indexOf("/holes/") !== -1;
}

function isShellUrl(url) {
  if (url.origin !== self.location.origin) return false;
  const file = url.pathname.split("/").pop();
  if (!file) return true;
  return file === "index.html"
    || file === "manifest.webmanifest"
    || file === "icon-192.png"
    || file === "icon-512.png"
    || file === "apple-touch-icon.png";
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
