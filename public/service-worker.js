// Service worker mínimo: solo lo justo para que Chrome/Android considere la app
// instalable como PWA. Cachea el "cascarón" de la app para que abra más rápido
// en visitas siguientes; los datos siempre viven en localStorage, no aquí.
const CACHE_NAME = "escandallo-app-v1";
const CORE_ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // No cachear nunca las llamadas a la API de Anthropic.
  if (event.request.url.includes("api.anthropic.com")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
