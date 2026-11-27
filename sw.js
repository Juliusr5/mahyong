// Service worker: simpan semua file agar game bisa dimainkan offline.
// Naikkan VERSION setiap kali file berubah agar HP mengambil versi baru.
const VERSION = 'mjz-v4';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.json',
  'js/main.js', 'js/ui.js', 'js/art.js', 'js/tiles.js', 'js/hand.js', 'js/rules.js', 'js/scoring.js',
  'js/storage.js', 'js/sound.js', 'js/help.js', 'js/bot/brain.js', 'js/bot/danger.js', 'js/bot/worker.js',
  'fonts/CormorantGaramond-SemiBold.woff2', 'fonts/CormorantGaramond-SemiBoldItalic.woff2', 'fonts/Inter-Variable.woff2',
  'icons/icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Jaringan dulu (selalu dapat versi terbaru saat online), cache kalau offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((r) => {
      if (r.ok && new URL(e.request.url).origin === location.origin) {
        const copy = r.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
