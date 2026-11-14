// Initialize Framework7 in iOS Dark Mode
const app = new Framework7({
  el: '#app',
  theme: 'ios',
  darkMode: true,
});

document.addEventListener('DOMContentLoaded', () => {
  const methodEl = document.getElementById('method');
  const methodWrap = document.querySelector('.method-badge-wrap');
  const urlEl = document.getElementById('url');
  const sendBtn = document.getElementById('sendBtn');

  const authTypeEl = document.getElementById('authType');
  const tokenGroup = document.getElementById('tokenGroup');
  const authValueEl = document.getElementById('authValue');
  const basicGroup = document.getElementById('basicGroup');
  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');

  const headerContainer = document.getElementById('headerContainer');
  const addHeaderBtn = document.getElementById('addHeaderBtn');
  const bodyEl = document.getElementById('body');
  const metaEl = document.getElementById('meta');
  const responseEl = document.getElementById('response');

  // Update HTTP method badge color
  methodEl.addEventListener('change', () => {
    methodWrap.setAttribute('data-method', methodEl.value);
  });

  // Toggle Authentication input fields
  authTypeEl.addEventListener('change', () => {
    const type = authTypeEl.value;
    tokenGroup.classList.add('display-none');
    basicGroup.classList.add('display-none');

    if (type === 'bearer' || type === 'apikey') {
      tokenGroup.classList.remove('display-none');
    } else if (type === 'basic') {
      basicGroup.classList.remove('display-none');
    }
  });

  // Add new iOS-styled Header row
  addHeaderBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const li = document.createElement('li');
    li.className = 'header-row item-content';
    li.innerHTML = `
      <div class="item-inner">
        <div class="header-name-wrap">
          <select class="header-name">
            <option value="Content-Type">Content-Type</option>
            <option value="Accept">Accept</option>
            <option value="Authorization">Authorization</option>
            <option value="X-API-Key">X-API-Key</option>
            <option value="Cache-Control">Cache-Control</option>
          </select>
        </div>
        <input type="text" class="header-value" placeholder="Header value">
        <button type="button" class="remove-header button button-tonal color-red">✕</button>
      </div>
    `;
    headerContainer.appendChild(li);
  });

  // Remove Header row via event delegation
  headerContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-header');
    if (removeBtn) {
      const row = removeBtn.closest('.header-row');
      if (row) row.remove();
    }
  });

  // Send API Request
  sendBtn.addEventListener('click', async () => {
    const url = urlEl.value.trim();
    const method = methodEl.value;

    if (!url) {
      app.dialog.alert('Please enter a valid endpoint URL.', 'Missing URL');
      return;
    }

    // Collect headers
    const headers = {};
    document.querySelectorAll('.header-row').forEach((row) => {
      const name = row.querySelector('.header-name').value;
      const value = row.querySelector('.header-value').value.trim();
      if (name && value) {
        headers[name] = value;
      }
    });

    // Apply authentication
    const authType = authTypeEl.value;
    if (authType === 'bearer' && authValueEl.value.trim()) {
      headers['Authorization'] = `Bearer ${authValueEl.value.trim()}`;
    } else if (authType === 'apikey' && authValueEl.value.trim()) {
      headers['X-API-Key'] = authValueEl.value.trim();
    } else if (authType === 'basic') {
      const user = usernameEl.value;
      const pass = passwordEl.value;
      headers['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
    }

    const options = { method, headers };

    if (method !== 'GET' && method !== 'HEAD') {
      options.body = bodyEl.value;
    }

    // Loading state
    sendBtn.classList.add('disabled');
    sendBtn.textContent = '...';
    metaEl.innerHTML = '';
    responseEl.textContent = 'Sending request...';

    const startTime = performance.now();

    try {
      const res = await fetch(url, options);
      const duration = Math.round(performance.now() - startTime);
      const statusClass = res.ok ? 'status-ok' : 'status-err';

      metaEl.innerHTML = `
        <span class="${statusClass}">HTTP ${res.status} ${res.statusText}</span>
        <span>${duration} ms</span>
      `;

      const rawText = await res.text();
      try {
        const parsed = JSON.parse(rawText);
        responseEl.textContent = JSON.stringify(parsed, null, 2);
      } catch {
        responseEl.textContent = rawText || '(Empty response body)';
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      metaEl.innerHTML = `
        <span class="status-err">Network / CORS Error</span>
        <span>${duration} ms</span>
      `;
      responseEl.textContent = err.message;
    } finally {
      sendBtn.classList.remove('disabled');
      sendBtn.textContent = 'Send';
    }
  });
});
