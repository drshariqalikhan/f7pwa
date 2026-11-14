// app.js - Main Framework 7/Vue application
const app = new Framework7({
    el: '#app',
    router: {
        type: 'view'
    },
    theme: 'dark',
    modules: ['views', 'pages', 'modals'],
    
    views: [
        {
            route: '/',
            template: `
                <div class="page page-main">
                    <div class="page-content">
                        <h1>Welcome to My PWA</h1>
                        <p>This is a single-file Progressive Web App built with Framework 7.</p>
                        
                        <div class="block block-large">
                            <p><strong>Features:</strong></p>
                            <ul>
                                <li>✅ Works offline</li>
                                <li>✅ Installable on mobile</li>
                                <li>✅ Fast loading</li>
                                <li>✅ Native-like experience</li>
                            </ul>
                        </div>
                        
                        <button class="button button-large button-primary" onclick="alert('Button clicked!')">
                            Click Me
                        </button>
                    </div>
                </div>
            `
        }
    ]
});

// Initialize app
app.init();
