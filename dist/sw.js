importScripts('pdf-assets.js');
const VERSION='meu-estudo-cfc-20261006-v6';
const SHELL=['./','index.html','style.css','bank.js','core.js','storage.js','app.js','pdf-parser.js','pdf-import.js','pdf-assets.js','pwa.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png',...self.PDF_ASSETS];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('meu-estudo-cfc-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.open(VERSION).then(cache=>cache.match('index.html'))));return;
  }
  event.respondWith(caches.open(VERSION).then(async cache=>{
    const hit=await cache.match(event.request);if(hit)return hit;
    const response=await fetch(event.request);
    if(response.ok && !event.request.headers.has('range'))await cache.put(event.request,response.clone());
    return response;
  }));
});
