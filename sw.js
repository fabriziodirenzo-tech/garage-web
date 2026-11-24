// Service worker della webapp (come Offerte): tiene in cache i file dell'app di questa versione, cosi' l'app parte
// anche senza rete. I dati (api.github.com) e le tessere della mappa non passano mai da qui: i dati hanno l'ETag e la
// copia nell'archivio. build.mjs sostituisce i due segnaposti qui sotto (versione ed elenco dei file).
//
// Una versione nuova non si attiva da sola: l'app mostra "Versione nuova pronta" e, al tocco, manda
// { tipo: 'attiva' }. Senza tocco si attiva quando tutte le finestre dell'app sono state chiuse.

const VERSIONE = "0.1.5";
const FILE = ["./","app.js","caratteri/bricolage-grotesque-latin-600-normal.woff2","caratteri/bricolage-grotesque-latin-800-normal.woff2","caratteri/figtree-latin-400-normal.woff2","caratteri/figtree-latin-600-normal.woff2","caratteri/figtree-latin-700-normal.woff2","icone/apple-touch-icon.png","icone/icona-192.png","icone/icona-512.png","icone/icona-maskable-512.png","index.html","leaflet.css","manifest.webmanifest","stile.css"];
const CACHE = `garage-${VERSIONE}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('message', (e) => {
  if (e.data?.tipo === 'attiva') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // si tengono la cache nuova e la precedente, perche' una finestra ancora vecchia non resti senza i suoi file
    const daTenere = new Set([CACHE, ...(await precedente())]);
    const nomi = (await caches.keys()).filter((n) => n.startsWith('garage-') && !daTenere.has(n));
    await Promise.all(nomi.map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// La cache della versione attiva prima di questa: il suo nome sta in "registro-garage".
async function precedente() {
  const c = await caches.open('registro-garage');
  const r = await c.match('ultima');
  const vecchia = r ? await r.text() : null;
  await c.put('ultima', new Response(CACHE));
  return vecchia && vecchia !== CACHE ? [vecchia] : [];
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (e.request.mode === 'navigate') {
      return (await c.match('./')) || (await c.match('index.html')) || fetch(e.request);
    }
    return (await c.match(e.request, { ignoreSearch: true })) || fetch(e.request);
  })());
});
