const CACHE_NAME = 'greenfield-landscaping-v7.0';
const urlsToCache = [
  './',
  './index.html',
  './team.html',
  './admin.html',
  './style.css',
  './script.js',
  './sw.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Cache addAll error:', err))
  );
  self.skipWaiting();
});

// Fetch resources - CACHE FIRST, NETWORK FALLBACK STRATEGY
self.addEventListener('fetch', event => {
  // Don't cache Firebase URLs dynamically
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('gstatic.com/firebase') ||
      event.request.url.includes('asia-southeast1.firebasedatabase.app')) {
    return fetch(event.request)
      .catch(() => {
        // If network fails, return offline page
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the new response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // If both cache and network fail
            if (event.request.mode === 'navigate') {
              if (event.request.url.includes('admin.html')) {
                return caches.match('./admin.html');
              } else if (event.request.url.includes('team.html')) {
                return caches.match('./team.html');
              }
              return caches.match('./index.html');
            }
            
            // For other requests, return offline response
            return caches.match(event.request)
              .then(cachedResponse => {
                if (cachedResponse) {
                  return cachedResponse;
                }
                
                // Return generic offline response
                return new Response('You are offline. Data is saved locally.', {
                  headers: { 'Content-Type': 'text/plain' }
                });
              });
          });
      })
  );
});

// Update service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim clients
  self.clients.claim();
});

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});