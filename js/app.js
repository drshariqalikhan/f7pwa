// Start Framework7

var app = new Framework7({
    name: 'MyPWA',
    theme: 'auto'
});

// Register Service Worker

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js');
    });
}