const CACHE_NAME = 'elis-poudel-v5';
const OFFLINE_URLS = [
  './',
  './index.html',
  './app/dashboard.html',
  './app/admin-panel.html',
  './app/class-detail.html',
  './app/pdf-viewer.html',
  './app/login.html',
  './assets/css/style.css',
  './assets/js/main.js',
  './assets/js/drive-service.js',
  './assets/manifest.json'
];

function normalizeUrl(url) {
  const parsed = new URL(url, self.location.href);
  if (parsed.origin === self.location.origin) {
    return parsed.pathname.replace(/\/+$/, '') || '/';
  }
  return parsed.href;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const normalizedUrl = normalizeUrl(request.url);
  const cached = await cache.match(normalizedUrl);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(normalizedUrl, networkResponse.clone());
  }
  return networkResponse;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const normalizedUrl = normalizeUrl(request.url);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(normalizedUrl, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return cache.match(normalizedUrl) || cache.match('./index.html') || cache.match('/index.html');
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|json|pdf)$/i.test(url.pathname);
  const isHtmlPage = isSameOrigin && (url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.includes('/app/'));

  if (isStaticAsset) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (isHtmlPage) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
