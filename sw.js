// Minimal service worker — required for "Add to Home Screen" install prompt
const CACHE_NAME = "tasty-food-point-v1";

self.addEventListener("install", function(event){
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", function(event){
  // Simple network-first strategy so menu/stock updates always show fresh data
  event.respondWith(
    fetch(event.request).catch(function(){
      return caches.match(event.request);
    })
  );
});
