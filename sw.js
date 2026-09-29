/* Shell cache: product version with the extra minor zero collapsed. 4.0.11 → 411, 4.1.0 → 410, 4.1.1 → 411, 4.1.2 → 412, 4.1.3 → 413, 4.1.3.1 → 4131, 4.1.4 → 414. */
const SHELL = "fairway-v4-414";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/escorial-monasterio.png",
  "./fairway/js/keys.js",
  "./fairway/js/persistence.js",
  "./fairway/js/idb.js",
  "./fairway/js/persist-boot.js"
];

function isShellUrl(url) {
  if (url.origin !== self.location.origin) return false;
  const file = url.pathname.split("/").pop();
  if (!file) return true;
  if (url.pathname.indexOf("/fairway/js/") !== -1 && /\.js$/.test(file)) return true;
  return file === "index.html"
    || file === "manifest.webmanifest"
    || file === "icon-192.png"
    || file === "icon-512.png"
    || file === "apple-touch-icon.png"
    || file === "escorial-monasterio.png";
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)));
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
  if (!isShellUrl(url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const cached = await cache.match(req);
    const network = fetch(req).then(async (res) => {
      if (res && res.ok) await cache.put(req, res.clone());
      return res;
    }).catch(() => cached || Response.error());
    return cached || network;
  })());
});
