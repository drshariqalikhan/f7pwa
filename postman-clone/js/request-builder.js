// postman-clone/js/request-builder.js

/**
 * RequestBuilder - Handles request composition UI
 */
class RequestBuilder {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.methodSelector = null;
        this.urlInput = null;
        this.bodyEditor = null;
        this.headersContainer = null;
        
        this.methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
        this.init();
    }

    init() {
        // Create request builder container
        this.container.innerHTML = `
            <div class="request-builder">
                <!-- Method Selector -->
                <div class="method-selector">
                    <label>HTTP Method</label>
                    <select id="request-method" class="method-select">
                        ${this.methods.map(method => 
                            `<option value="${method}">${method}</option>`
                        ).join('')}
                    </select>
                </div>

                <!-- URL Input -->
                <div class="url-input-container">
                    <label>URL</label>
                    <input type="text" id="request-url" class="url-input" placeholder="https://example.com/api/endpoint">
                </div>

                <!-- Headers Section -->
                <div class="headers-section">
                    <div class="section-header">
                        <h3>Headers</h3>
                        <button id="add-header-btn" class="btn btn-small">+ Add Header</button>
                    </div>
                    <div id="headers-container" class="headers-list"></div>
                </div>

                <!-- Body Section -->
                <div class="body-section">
                    <div class="section-header">
                        <h3>Body</h3>
                        <div class="body-type-selector">
                            <button class="btn btn-small active" data-body-type="raw">Raw</button>
                            <button class="btn btn-small" data-body-type="json">JSON</button>
                            <button class="btn btn-small" data-body-type="formdata">Form-data</button>
                        </div>
                    </div>
                    
                    <div id="body-editor-container" class="body-editor">
                        <!-- Raw text editor -->
                        <textarea id="request-body" class="body-textarea" placeholder="Enter request body..."></textarea>
                        
                        <!-- JSON formatter (hidden by default) -->
                        <pre id="json-formatter" class="json-formatter hidden"></pre>
                        
                        <!-- Form data fields (hidden by default) -->
                        <div id="form-data-container" class="form-data-editor hidden">
                            <input type="text" id="form-key" placeholder="Key">
                            <input type="text" id="form-value" placeholder="Value">
                            <button id="add-form-field-btn" class="btn btn-small">Add Field</button>
                            <div id="form-fields-list" class="form-fields-list"></div>
                        </div>
                    </div>
                </div>

                <!-- Request Actions -->
                <div class="request-actions">
                    <button id="send-request-btn" class="btn btn-primary">Send</button>
                    <button id="save-request-btn" class="btn btn-secondary">Save</button>
                    <button id="duplicate-request-btn" class="btn btn-secondary">Duplicate</button>
                </div>
            </div>
        `;

        // Initialize event listeners
        this.bindEvents();
    }

    bindEvents() {
        // Method selector change
        const methodSelect = document.getElementById('request-method');
        if (methodSelect) {
            methodSelect.addEventListener('change', () => this.onMethodChange());
        }

        // URL input
        const urlInput = document.getElementById('request-url');
        if (urlInput) {
            urlInput.addEventListener('input', () => this.onUrlChange());
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendRequest();
                }
            });
        }

        // Body type selector
        const bodyTypeSelector = document.querySelector('.body-type-selector');
        if (bodyTypeSelector) {
            bodyTypeSelector.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn')) {
                    this.setBodyType(e.target.dataset.bodyType);
                }
            });
        }

        // Add header button
        const addHeaderBtn = document.getElementById('add-header-btn');
        if (addHeaderBtn) {
            addHeaderBtn.addEventListener('click', () => this.addHeader());
        }

        // Send request button
        const sendBtn = document.getElementById('send-request-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendRequest());
        }

        // Save request button
        const saveBtn = document.getElementById('save-request-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveRequest());
        }

        // Duplicate request button
        const duplicateBtn = document.getElementById('duplicate-request-btn');
        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', () => this.duplicateRequest());
        }
    }

    onMethodChange() {
        const method = document.getElementById('request-method').value;
        console.log(`Method changed to: ${method}`);
        // Update URL input placeholder based on method
        const urlInput = document.getElementById('request-url');
        if (urlInput) {
            urlInput.placeholder = `https://example.com/api/${method.toLowerCase()}/endpoint`;
        }
    }

    onUrlChange() {
        console.log('URL changed:', document.getElementById('request-url').value);
    }

    setBodyType(type) {
        // Update body type buttons
        const buttons = document.querySelectorAll('.body-type-selector .btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        // Show/hide appropriate body editor
        const rawEditor = document.getElementById('request-body');
        const jsonFormatter = document.getElementById('json-formatter');
        const formDataContainer = document.getElementById('form-data-container');

        if (type === 'raw') {
            rawEditor.classList.remove('hidden');
            jsonFormatter.classList.add('hidden');
            formDataContainer.classList.add('hidden');
        } else if (type === 'json') {
            rawEditor.classList.add('hidden');
            jsonFormatter.classList.remove('hidden');
            formDataContainer.classList.add('hidden');
        } else if (type === 'formdata') {
            rawEditor.classList.add('hidden');
            jsonFormatter.classList.add('hidden');
            formDataContainer.classList.remove('hidden');
        }
    }

    addHeader() {
        const headersContainer = document.getElementById('headers-container');
        if (!headersContainer) return;

        const headerId = `header-${Date.now()}`;
        const headerHTML = `
            <div class="header-item" id="${headerId}">
                <input type="text" class="header-key" placeholder="Key (e.g., Authorization)">
                <input type="text" class="header-value" placeholder="Value">
                <button class="btn btn-small btn-remove-header" data-id="${headerId}">×</button>
            </div>
        `;
        
        headersContainer.insertAdjacentHTML('beforeend', headerHTML);
    }

    sendRequest() {
        const method = document.getElementById('request-method').value;
        const url = document.getElementById('request-url').value;
        const body = document.getElementById('request-body').value;
        
        // Collect headers
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
            body: this.getBodyContent()
        };

        console.log('Request prepared:', JSON.stringify(requestObj, null, 2));
        
        // TODO: Implement actual API call here
        // fetch(url, { method, headers, body })...
    }

    getBodyContent() {
        const rawBody = document.getElementById('request-body').value;
        const jsonFormatter = document.getElementById('json-formatter');
        const formDataContainer = document.getElementById('form-data-container');

        if (!formDataContainer.classList.contains('hidden')) {
            // Return form data as FormData object
            return this.getFormData();
        } else if (!jsonFormatter.classList.contains('hidden')) {
            // Return JSON string
            return jsonFormatter.textContent;
        } else {
            // Return raw text
            return rawBody;
        }
    }

    getFormData() {
        const formFields = document.querySelectorAll('.form-field-item');
        const formData = new FormData();
        
        formFields.forEach(field => {
            const key = field.querySelector('input[type="text"]').value;
            const value = field.querySelector('input[type="text"]').value;
            if (key && value) {
                formData.append(key, value);
            }
        });
        
        return formData;
    }

    saveRequest() {
        console.log('Saving request...');
        // TODO: Save to localStorage or database
    }

    duplicateRequest() {
        console.log('Duplicating request...');
        // TODO: Clone current request and create new entry
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RequestBuilder;
}