self.importScripts('scripts/version.js');

const storageCacheName = 'globe_' + GlobeVersion;
const expiredCache = 0;
const offlineRequestPause = 1;

//const diffDays = (first, second) => Math.round((second - first) / (1000 * 60 * 60 * 24));
//const diffHours = (first, second) => Math.round((second - first) / (1000 * 60 * 60));
const diffMins = (first, second) => Math.round((second - first) / (1000 * 60));
//const diffSecs = (first, second) => Math.round((second - first) / (1000));

let offlineRequestTime;

self.addEventListener('install', (event) => {
  //console.log('install');
  event.waitUntil(install());
});

self.addEventListener('activate', (event) => {
  //console.log('activate');
  event.waitUntil(deletePrevious());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method != 'GET') {
    return;
  }
  event.respondWith(getResponse(event.request));
});

function install() {
}

async function deletePrevious() {
  var keepers = [storageCacheName];
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => !keepers.includes(name))
      .map(name => caches.delete(name))
  );
}

async function getResponse(request) {
  if (request.url.indexOf(self.origin) != 0 || request.url.indexOf(self.origin + "/data/") == 0) {
    return fetch(request);
  }
  const cachedResponse = await caches.match(request, { cacheName: storageCacheName });
  if (cachedResponse && (!expiredResponse(cachedResponse) || offlinePause())) {
    return cachedResponse;
  }
  try {
    const response = await fetch(request);
    offlineRequestTime = null;
    if (response.ok) {
      const cache = await caches.open(storageCacheName);
      await cache.put(request, response.clone());
    }
    return response;
  }
  catch (fetchError) {
    offlineRequestTime = Date.now();
    if (cachedResponse) {
      return cachedResponse;
    }
  }
}

function expiredResponse(response) {
  const date = new Date(response.headers.get("date"));
  const dateDiff = diffMins(date, Date.now());
  return expiredCache <= dateDiff;
}

function offlinePause(response) {
  if (!offlineRequestTime) {
    return false;
  }
  const dateDiff = diffMins(offlineRequestTime, Date.now());
  return dateDiff < offlineRequestPause;
}
