// CN Balance offline cache. Bump VERSION on every deploy so phones fetch the new files.
const VERSION = 'cnbalance-2026-1020m';
const FILES = ['./', './index.html', './manifest.webmanifest', './cnbalance-icon.svg', './cnbalance-icon-192.png', './cnbalance-icon-512.png', './cnbalance-icon-180.png'];
const WAIT_MS = 3500; // weak orchard signal: after this, use the saved copy if there is one
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first so updates show up when online; saved copy when offline or very slow.
// Only this site's own files are handled; WhatsApp and reference links go straight to the network.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  const fromCache = () => caches.match(req, { ignoreSearch: true })
    .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
  const net = fetch(req).then(r => {
    if (r.ok && r.type === 'basic') {
      const copy = r.clone();
      return caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {}).then(() => r);
    }
    return r;
  });
  e.waitUntil(net.catch(() => {}));
  const slow = new Promise(res => setTimeout(res, WAIT_MS)).then(fromCache).then(c => c || net);
  e.respondWith(
    Promise.race([net, slow]).catch(() => fromCache().then(c => c || Response.error()))
  );
});
