/* Commune Prête : fonctionnement hors ligne.
   Page et bibliothèques : réseau d'abord, copie locale si le réseau manque.
   Fonds de carte déjà consultés : copie locale d'abord (400 tuiles au plus).
   Bases publiques (lecture) : réseau d'abord, dernière réponse connue sinon. */
const CORE = "cp-core-v3", TILES = "cp-tiles", DATA = "cp-data";
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./favicon.svg", "./apple-touch-icon.png",
  "./fonts/polices.css", "./fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2", "./fonts/source-serif-4-latin-opsz-normal.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CORE).then(c => Promise.allSettled(PRECACHE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![CORE, TILES, DATA].includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  try {
    const r = await fetch(req);
    if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone());
    return r;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: req.mode === "navigate" });
    if (hit) return hit;
    if (req.mode === "navigate") { const idx = await c.match("./index.html"); if (idx) return idx; }
    throw err;
  }
}
async function tileFirst(req) {
  const c = await caches.open(TILES);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && (r.ok || r.type === "opaque")) {
    await c.put(req, r.clone());
    const keys = await c.keys();
    if (keys.length > 400) await Promise.all(keys.slice(0, keys.length - 400).map(k => c.delete(k)));
  }
  return r;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (/(^|\.)tile\.openstreetmap\.org$/.test(u.hostname)) { e.respondWith(tileFirst(req)); return; }
  if (/geo\.api\.gouv\.fr|georisques\.gouv\.fr|data\.education\.gouv\.fr/.test(u.hostname)) { e.respondWith(networkFirst(req, DATA)); return; }
  if (u.origin === self.location.origin || /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) { e.respondWith(networkFirst(req, CORE)); }
});
