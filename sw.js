const CACHE = 'b777-v29';
const ASSETS = ['./', './index.html', './questions.js', './supabase.js', './manifest.json', './icon192.png', './icon512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS.map(function(u){ return new Request(u, {cache:'reload'}); })); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
});

async function cleanResponse(resp){
  if(!resp || !resp.redirected) return resp;
  var body = await resp.blob();
  return new Response(body, { status: 200, statusText: 'OK', headers: resp.headers });
}
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var isNav = e.request.mode === 'navigate' || e.request.url.indexOf('index.html') > -1;
  if(isNav){
    // Offline-first: serve the cached app instantly, refresh it in the background.
    e.respondWith((async function(){
      var cached = await caches.match('./index.html');
      var netPromise = fetch(e.request).then(async function(resp){
        if(resp && resp.ok){
          resp = await cleanResponse(resp);
          var c = await caches.open(CACHE);
          c.put('./index.html', resp.clone());
        }
        return resp;
      }).catch(function(){ return null; });
      if(cached){
        e.waitUntil(netPromise);   // background sync of the newest version
        return await cleanResponse(cached);
      }
      var net = await netPromise;
      return net || new Response('<h1 style="font-family:sans-serif">Offline \u2014 open once with internet to install.</h1>', {headers:{'Content-Type':'text/html'}});
    })());
    return;
  }
  // Everything else: cache-first (fast + offline)
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(resp){
        return caches.open(CACHE).then(function(c){
          c.put(e.request, resp.clone());
          return resp;
        });
      }).catch(function(){});
    })
  );
});
