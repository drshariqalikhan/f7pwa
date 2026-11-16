const CACHE_NAME = "gemma4-pwa-v7";
const SHELL_ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./ui.js",
    "./config.js",
    "./chatService.js",
    "./app.js",
    "./manifest.webmanifest",
    "./icons/android/mipmap-xxxhdpi/ic_launcher.png",
    "./icons/android/playstore-icon.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    // Bypass Hugging Face .litertlm downloads & external CDNs so OPFS handles the 2.5 GB model alone
    if(event.request.method !== "GET" || url.origin !== self.location.origin){
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((res) => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});
