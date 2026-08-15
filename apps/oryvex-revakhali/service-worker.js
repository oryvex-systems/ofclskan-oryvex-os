const CACHE='oryvex-santiye-shell-v3';
const SHELL=['/giris.html','/global-nav.js','/activity-nav.js','/access-ui.js','/session-watch.js','/runtime-fixes.js','/pwa.js','/manifest.webmanifest','/oryvex-santiye-icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
async function networkOnlyNavigation(req){try{return await fetch(req,{cache:'no-store'})}catch{return caches.match('/giris.html')}}
async function networkFirstStatic(req,fallback){try{const res=await fetch(req);if(res&&res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{})}return res}catch{const hit=await caches.match(req);return hit||caches.match(fallback)}}
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;if(req.mode==='navigate'){event.respondWith(networkOnlyNavigation(req));return}if(/\.(?:js|css|svg|webmanifest)$/.test(url.pathname)){event.respondWith(networkFirstStatic(req,'/giris.html'));return}});
