const CACHE_NAME = "mesa-directiva-v1";
const ASSETS = [
  "/apps/mesa/login.html",
  "/apps/mesa/home.html",
  "/apps/mesa/registro-vecino.html",
  "/apps/mesa/login.js",
  "/apps/mesa/registro-vecino.js",
  "/apps/mesa/supabaseClient.js",
  "/shared/supabase.js",
  "/apps/mesa/manifest.webmanifest",
  "/apps/mesa/icons/app-icon.svg",
  "/apps/mesa/icons/app-icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
