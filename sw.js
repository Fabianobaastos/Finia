// Finia Service Worker — com Web Share Target
const CACHE = 'finia-v2';

// ── INSTALL & CACHE ──────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH (cache-first para o HTML, network-first para o resto) ───────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Interceptar share target — POST para /share-comprovante
  if(url.pathname === '/share-comprovante' && e.request.method === 'POST'){
    e.respondWith(handleShare(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── SHARE TARGET HANDLER ─────────────────────────────────────────────────────
async function handleShare(request){
  try {
    const formData = await request.formData();
    const file = formData.get('comprovante'); // nome definido no manifest

    if(file){
      // Converter arquivo para base64 e armazenar no cache temporário
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), '')
      );
      // Notificar a janela ativa via postMessage
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if(clients.length > 0){
        clients[0].postMessage({
          type: 'SHARE_COMPROVANTE',
          file: { base64, mediaType: file.type, name: file.name }
        });
        clients[0].focus();
      } else {
        // App não estava aberto — salvar no cache para ler ao abrir
        const cache = await caches.open(CACHE);
        await cache.put('/__share_pending', new Response(JSON.stringify({
          base64, mediaType: file.type, name: file.name
        })));
      }
    }
  } catch(err) {
    console.error('Share handler error:', err);
  }

  // Redirecionar de volta para o app (aba Importar)
  return Response.redirect('/?tab=imp&share=1', 303);
}
