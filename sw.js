const CACHE = 'b777-v12';
const ASSETS = ['./', './index.html', './questions.js', './supabase.js', './manifest.json', './icon192.png', './icon512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
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

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(resp){
        return caches.open(CACHE).then(function(c){
          c.put(e.request, resp.clone());
          return resp;
        });
      }).catch(function(){
        // Offline navigation (e.g. opening the app root) → app shell
        if(e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
