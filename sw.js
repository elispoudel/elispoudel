const CACHE_NAME = 'elis-poudel-v8';
const OFFLINE_URLS = [
  './',
  './index.html',
  './app/dashboard.html',
  './app/admin-panel.html',
  './app/class-detail.html',
  './app/pdf-viewer.html',
  './app/login.html',
  './assets/css/style.css',
  './assets/css/dashain.css',
  './assets/js/dashain.js',
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

// JSON data (chapters, classes) changes when the admin edits it, so always try the network first
async function networkFirstData(request) {
  const cache = await caches.open(CACHE_NAME);
  const normalizedUrl = normalizeUrl(request.url);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(normalizedUrl, networkResponse.clone());
      return networkResponse;
    }
    return (await cache.match(normalizedUrl)) || networkResponse;
  } catch (error) {
    const cached = await cache.match(normalizedUrl);
    if (cached) return cached;
    throw error;
  }
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

  // Let Google Apps Script / Drive requests go straight to the network (no service-worker involvement)
  if (/(^|\.)(script\.google\.com|script\.googleusercontent\.com|drive\.google\.com|docs\.google\.com|googleusercontent\.com)$/i.test(url.hostname)) {
    return;
  }

  if (isSameOrigin && /\.json$/i.test(url.pathname)) {
    event.respondWith(networkFirstData(event.request));
    return;
  }
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

  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(event.request)) || Response.error())
  );
});
