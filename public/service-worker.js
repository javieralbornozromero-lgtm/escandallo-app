// Service worker mínimo, solo para que Chrome/Android considere la app instalable
// como PWA. Usa estrategia "red primero": siempre intenta traer la versión más
// reciente de internet, y solo usa la copia guardada si no hay conexión. Así, cada
// vez que se actualiza la app, se ve la versión nueva de inmediato (sin pantallas
// en blanco por quedarse con una copia vieja en caché).
const CACHE_NAME = "escandallo-app-v2";

self.addEventListener("install", (event) => {
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
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
