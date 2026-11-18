// Service worker : le site s'installe comme une application et reste consultable hors connexion.
// - pages : réseau d'abord, cache en secours ;
// - fichiers du site (/_next/static, icônes) : cache d'abord ;
// - photos des candidates : laissées au cache normal du navigateur (fichiers marqués valables un an) ;
// - données (API Supabase) : jamais mises en cache, pour ne pas montrer de pronostic périmé.
const VERSION = "v2";
const PAGES = `pages-${VERSION}`, ASSETS = `assets-${VERSION}`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(ASSETS).then(async (c) => (await c.match(req)) || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))
    );
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); return res; })
        .catch(async () => (await caches.match(req)) || (await caches.match("/")))
    );
  }
});
