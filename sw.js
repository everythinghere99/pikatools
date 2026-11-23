const CACHE_NAME = 'pikatools-v10';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './legal.css',
  './privacy.html',
  './terms.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './tools/image-compressor.html',
  './tools/image-compressor.css',
  './tools/image-compressor.js',
  './tools/image-resizer.html',
  './tools/image-resizer.css',
  './tools/image-resizer.js',
  './tools/image-cropper.html',
  './tools/image-cropper.css',
  './tools/image-cropper.js',
  './tools/image-converter.html',
  './tools/image-converter.css',
  './tools/image-converter.js',
  './tools/pdf-compressor.html',
  './tools/pdf-compressor.css',
  './tools/pdf-compressor.js',
  './tools/pdf-merger.html',
  './tools/pdf-merger.css',
  './tools/pdf-merger.js',
  './tools/pdf-organize.html',
  './tools/pdf-organize.css',
  './tools/pdf-organize.js',
  './tools/pdf-splitter.html',
  './tools/pdf-splitter.css',
  './tools/pdf-splitter.js',
  './tools/pdf-rotate.html',
  './tools/pdf-rotate.css',
  './tools/pdf-rotate.js',
  './tools/pdf-page-numbers.html',
  './tools/pdf-page-numbers.css',
  './tools/pdf-page-numbers.js',
  './tools/pdf-password.html',
  './tools/pdf-password.css',
  './tools/pdf-password.js',
  './tools/pdf-unlock.html',
  './tools/pdf-unlock.css',
  './tools/pdf-unlock.js',
  './tools/pdf-watermark.html',
  './tools/pdf-watermark.css',
  './tools/pdf-watermark.js',
  './tools/pdf-signature.html',
  './tools/pdf-signature.css',
  './tools/pdf-signature.js',
  './tools/pdf-to-jpg.html',
  './tools/pdf-to-jpg.css',
  './tools/pdf-to-jpg.js',
  './tools/jpg-to-pdf.html',
  './tools/jpg-to-pdf.css',
  './tools/jpg-to-pdf.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.hostname.includes('blitz.cloud')) return;

  /* Network-First: Always fetch latest update when online, fallback to cache offline */
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
