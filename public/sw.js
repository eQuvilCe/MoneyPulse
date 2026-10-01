/* MoneyPulse SW — production only; never cache Next.js chunks */
const CACHE = "moneypulse-shell-v2";
const PRECACHE = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache API or Next JS/CSS chunks
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("webpack") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin && req.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
