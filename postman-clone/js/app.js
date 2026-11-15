// postman-clone/js/app.js

/**
 * Postman Clone Application
 * Main entry point for the application
 */

class App {
    constructor() {
        this.app = null;
        this.requestBuilder = null;
        this.currentRequest = null;
        this.collections = [];
        this.environments = [];
        
        this.init();
    }

    init() {
        console.log('Initializing Postman Clone...');
        
        // Initialize Framework7 App
        this.app = new Framework7({
            el: '#app',
            name: 'Postman Clone',
            logo: null,
            darkMode: true,
            theme: 'dark',
            routing: {
                type: 'url',
                routes: [
                    { path: '/', action: () => this.showHome() },
                    { path: '/collections/:id', action: () => this.showCollection() },
                    { path: '/requests/:id', action: () => this.showRequest() }
                ]
            },
            notifications: {
                closeTime: 3000,
                modal: true
            }
        });

        // Initialize Request Builder
        this.requestBuilder = new RequestBuilder('request-builder-container');

        // Load saved data
        this.loadSavedData();

        // Setup global event handlers
        this.setupGlobalHandlers();

        console.log('App initialized successfully');
    }

    loadSavedData() {
        // Load collections from localStorage
        const savedCollections = localStorage.getItem('collections');
        if (savedCollections) {
            this.collections = JSON.parse(savedCollections);
        } else {
            // Default collection
            this.collections = [{
                id: '1',
                name: 'My Collections',
                requests: []
            }];
        }

        // Load environments
        const savedEnvironments = localStorage.getItem('environments');
        if (savedEnvironments) {
            this.environments = JSON.parse(savedEnvironments);
        } else {
            this.environments = [
                { id: '1', name: 'Development', variables: { BASE_URL: 'http://localhost:3000' } },
                { id: '2', name: 'Production', variables: { BASE_URL: 'https://api.example.com' } }
            ];
        }

        console.log('Loaded collections:', this.collections.length);
        console.log('Loaded environments:', this.environments.length);
    }

    setupGlobalHandlers() {
        // Keyboard shortcut for sending request (Ctrl/Cmd + Enter)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.sendCurrentRequest();
            }
        });

        // Setup Framework7 router
        this.app.router.init();
    }

    showHome() {
        const view = this.app.views.main;
        
        // Clear current content
        const container = document.querySelector('.view-main .page-content');
        if (container) {
            container.innerHTML = `
                <div class="page-content">
                    <div class="header-bar">
                        <h1>Dashboard</h1>
                    </div>

                    <!-- Collections Section -->
                    <div style="padding: 20px;">
                        <h2 style="color: #fff; margin-bottom: 15px;">Collections</h2>
                        <div id="collections-list" class="collection-list"></div>
                        
                        <button id="create-collection-btn" class="btn btn-primary" style="margin-top: 20px; width: 100%;">
                            + Create New Collection
                        </button>
                    </div>

                    <!-- Environments Section -->
                    <div style="padding: 20px; background-color: #252526; border-radius: 8px; margin-top: 20px;">
                        <h3 style="color: #fff; margin-bottom: 15px;">Environments</h3>
                        <div id="environments-list" class="environment-list"></div>
                    </div>

                    <!-- Quick Stats -->
                    <div style="padding: 20px; background-color: #252526; border-radius: 8px; margin-top: 20px;">
                        <h3 style="color: #fff; margin-bottom: 15px;">Quick Stats</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                            <div style="background-color: #1e1e1e; padding: 15px; border-radius: 6px; text-align: center;">
                                <div style="color: #888; font-size: 12px;">Total Requests</div>
                                <div id="total-requests" style="color: #fff; font-size: 24px; font-weight: bold;">0</div>
                            </div>
                            <div style="background-color: #1e1e1e; padding: 15px; border-radius: 6px; text-align: center;">
                                <div style="color: #888; font-size: 12px;">Collections</div>
                                <div id="total-collections" style="color: #fff; font-size: 24px; font-weight: bold;">0</div>
                            </div>
                            <div style="background-color: #1e1e1e; padding: 15px; border-radius: 6px; text-align: center;">
                                <div style="color: #888; font-size: 12px;">Environments</div>
                                <div id="total-environments" style="color: #fff; font-size: 24px; font-weight: bold;">0</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Render collections
            this.renderCollections();

            // Render environments
            this.renderEnvironments();

            // Update stats
            this.updateStats();

            // Create collection button handler
            const createBtn = document.getElementById('create-collection-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.createCollection());
            }
        }
    }

    renderCollections() {
        const container = document.getElementById('collections-list');
        if (!container) return;

        if (this.collections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Collections Yet</h3>
                    <p>Create your first collection to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.collections.map(collection => `
            <div class="collection-item" data-collection-id="${collection.id}">
                <h4>${collection.name}</h4>
                <p>${collection.requests.length} requests</p>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.collection-item').forEach(item => {
            item.addEventListener('click', () => {
                const collectionId = item.dataset.collectionId;
                this.showCollection(collectionId);
            });
        });
    }

    renderEnvironments() {
        const container = document.getElementById('environments-list');
        if (!container) return;

        container.innerHTML = this.environments.map(env => `
            <div style="background-color: #1e1e1e; padding: 15px; border-radius: 6px; margin-bottom: 10px; cursor: pointer;" data-env-id="${env.id}">
                <strong>${env.name}</strong>
                <div style="color: #888; font-size: 13px; margin-top: 5px;">
                    ${Object.entries(env.variables).map(([key, value]) => 
                        `${key}: ${value}`
                    ).join(', ')}
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('[data-env-id]').forEach(item => {
            item.addEventListener('click', () => {
                const envId = item.dataset.envId;
                this.selectEnvironment(envId);
            });
        });
    }

    updateStats() {
        document.getElementById('total-requests').textContent = 
            this.collections.reduce((sum, c) => sum + c.requests.length, 0);
        document.getElementById('total-collections').textContent = this.collections.length;
        document.getElementById('total-environments').textContent = this.environments.length;
    }

    createCollection() {
        const name = prompt('Enter collection name:');
        if (name) {
            const newCollection = {
                id: Date.now().toString(),
                name: name,
                requests: []
            };
            this.collections.push(newCollection);
            localStorage.setItem('collections', JSON.stringify(this.collections));
            
            // Re-render
            this.showHome();
            
            this.app.dialogs.create({
                title: 'Success',
                text: `Collection "${name}" created successfully!`,
                close: () => {}
            });
        }
    }

    showCollection(collectionId) {
        const collection = this.collections.find(c => c.id === collectionId);
        if (!collection) return;

        const view = this.app.views.main;
        
        // Clear current content
        const container = document.querySelector('.view-main .page-content');
        if (container) {
            container.innerHTML = `
                <div class="page-content">
                    <div class="header-bar">
                        <h1>${collection.name}</h1>
                    </div>

                    <!-- Request Builder -->
                    <div id="request-builder-container"></div>

                    <!-- Saved Requests in Collection -->
                    <div style="padding: 20px;">
                        <h2 style="color: #fff; margin-bottom: 15px;">Saved Requests</h2>
                        <div id="collection-requests-list" class="request-list"></div>
                        
                        <button id="add-request-btn" class="btn btn-primary" style="margin-top: 20px; width: 100%;">
                            + Add New Request
                        </button>
                    </div>
                </div>
            `;

            // Re-initialize request builder
            this.requestBuilder = new RequestBuilder('request-builder-container');

            // Render saved requests
            this.renderCollectionRequests(collectionId);

            // Add request button handler
            const addBtn = document.getElementById('add-request-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.addNewRequest(collectionId));
            }
        }
    }

    renderCollectionRequests(collectionId) {
        const collection = this.collections.find(c => c.id === collectionId);
        const container = document.getElementById('collection-requests-list');
        
        if (!container || !collection) return;

        if (collection.requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Saved Requests</h3>
                    <p>Add requests to this collection or create new ones</p>
                </div>
            `;
            return;
        }

        container.innerHTML = collection.requests.map(request => `
            <div class="request-item" data-request-id="${request.id}">
                <span class="request-method ${request.method.toLowerCase()}">${request.method}</span>
                <strong>${request.url}</strong>
                <div style="color: #888; font-size: 13px; margin-top: 5px;">
                    ${this.truncateUrl(request.url)}
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.request-item').forEach(item => {
            item.addEventListener('click', () => {
                const requestId = item.dataset.requestId;
                this.loadRequest(requestId);
            });
        });
    }

    truncateUrl(url, maxLength = 50) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }

    addNewRequest(collectionId) {
        // Create a new request entry
        const newRequest = {
            id: Date.now().toString(),
            method: 'GET',
            url: '',
            headers: [],
            body: null,
            savedAt: new Date().toISOString()
        };

        const collection = this.collections.find(c => c.id === collectionId);
        if (collection) {
            collection.requests.push(newRequest);
            localStorage.setItem('collections', JSON.stringify(this.collections));
            
            // Re-render
            this.showCollection(collectionId);
            
            this.app.dialogs.create({
                title: 'New Request Created',
                text: 'You can now configure the request in the builder above.',
                close: () => {}
            });
        }
    }

    loadRequest(requestId) {
        // Find request in all collections
        let request = null;
        let collection = null;
        
        for (const c of this.collections) {
            const req = c.requests.find(r => r.id === requestId);
            if (req) {
                request = req;
                collection = c;
                break;
            }
        }

        if (!request || !collection) {
            this.app.dialogs.create({
                title: 'Error',
                text: 'Request not found',
                close: () => {}
            });
            return;
        }

        // Load request into builder
        this.loadRequestIntoBuilder(request);
    }

    loadRequestIntoBuilder(request) {
        const methodSelect = document.getElementById('request-method');
        const urlInput = document.getElementById('request-url');
        
        if (methodSelect) methodSelect.value = request.method;
        if (urlInput) urlInput.value = request.url;

        // Load headers
        this.loadHeaders(request.headers);

        // Store current request reference
        this.currentRequest = request;
    }

    loadHeaders(headers) {
        const container = document.getElementById('headers-container');
        if (!container) return;

        if (headers && headers.length > 0) {
            container.innerHTML = headers.map(header => `
                <div class="header-item" id="${header.id || 'header-' + Date.now()}">
                    <input type="text" class="header-key" value="${header.key}" placeholder="Key">
                    <input type="text" class="header-value" value="${header.value}" placeholder="Value">
                    <button class="btn btn-small btn-remove-header" data-id="${header.id || 'header-' + Date.now()}">×</button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '';
        }

        // Re-bind remove handlers
        container.querySelectorAll('.btn-remove-header').forEach(btn => {
            btn.addEventListener('click', (e) => this.removeHeader(e));
        });
    }

    removeHeader(e) {
        const headerItem = e.target.closest('.header-item');
        if (headerItem) {
            headerItem.remove();
        }
    }

    sendCurrentRequest() {
        if (!this.currentRequest) {
            this.app.dialogs.create({
                title: 'Error',
                text: 'No request to send. Please configure a request first.',
                close: () => {}
            });
            return;
        }

        const method = document.getElementById('request-method').value;
        const url = document.getElementById('request-url').value;
        const body = this.requestBuilder.getBodyContent();

        // Prepare headers
        const headers = [];
        const headerItems = document.querySelectorAll('.header-item');
        headerItems.forEach(item => {
            const key = item.querySelector('.header-key').value;
            const value = item.querySelector('.header-value').value;
            if (key && value) {
                headers.push({ key, value });
            }
        });

        // Prepare request object
        const requestObj = {
            method,
            url,
            headers,
            body
        };

        console.log('Sending request:', JSON.stringify(requestObj, null, 2));

        // Show loading indicator
        this.showLoading();

        // Simulate API call (replace with actual fetch)
        setTimeout(() => {
            this.hideLoading();
            
            // Mock response
            const response = {
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                data: {
                    message: 'Request sent successfully!',
                    method: method,
                    url: url,
                    timestamp: new Date().toISOString()
                }
            };

            this.displayResponse(response);

            // Save request to collection
            this.saveRequest(requestObj);
        }, 1000);
    }

    showLoading() {
        const responseOutput = document.getElementById('response-output');
        if (responseOutput) {
            responseOutput.innerHTML = '<div class="loading-spinner"></div>';
        }
    }

    hideLoading() {
        const responseOutput = document.getElementById('response-output');
        if (responseOutput) {
            responseOutput.textContent = '';
        }
    }

    displayResponse(response) {
        const responseOutput = document.getElementById('response-output');
        if (responseOutput) {
            responseOutput.textContent = JSON.stringify(response, null, 2);
            
            // Scroll to response
            responseOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    saveRequest(request) {
        // Find which collection is currently active (simplified - could be improved)
        const activeCollection = this.collections[0]; // TODO: Track active collection
        
        if (activeCollection) {
            // Check if request already exists
            const existingIndex = activeCollection.requests.findIndex(r => 
                r.url === request.url && r.method === request.method
            );

            if (existingIndex >= 0) {
                // Update existing request
                activeCollection.requests[existingIndex] = {
                    ...activeCollection.requests[existingIndex],
                    ...request,
                    savedAt: new Date().toISOString()
                };
            } else {
                // Add new request
                activeCollection.requests.push({
                    ...request,
                    id: Date.now().toString(),
                    savedAt: new Date().toISOString()
                });
            }

            localStorage.setItem('collections', JSON.stringify(this.collections));
            
            this.app.dialogs.create({
                title: 'Success',
                text: 'Request saved to collection!',
                close: () => {}
            });
        }
    }

    selectEnvironment(envId) {
        const env = this.environments.find(e => e.id === envId);
        if (env) {
            // Apply environment variables to URL
            let url = document.getElementById('request-url').value;
            
            Object.entries(env.variables).forEach(([key, value]) => {
                const regex = new RegExp(`\\{${key}\\}`, 'g');
                url = url.replace(regex, value);
            });

            if (url) {
                document.getElementById('request-url').value = url;
                
                this.app.dialogs.create({
                    title: 'Environment Applied',
                    text: `Environment "${env.name}" variables applied to URL.`,
                    close: () => {}
                });
            }
        }
    }

    showRequest(requestId) {
        // Similar to loadRequest but for viewing
        this.loadRequest(requestId);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});