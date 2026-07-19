const CACHE = 'b777-v19';
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
  var isNav = e.request.mode === 'navigate' || e.request.url.indexOf('index.html') > -1;
  if(isNav){
    // Network-first for the page itself: updates show up on the very next load
    e.respondWith(
      fetch(e.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
        return resp;
      }).catch(function(){ return caches.match('./index.html'); })
    );
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
