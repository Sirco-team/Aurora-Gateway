// aurora-start.js
// Aurora Start Page
(function() {
    // Wait for container to be ready
    function waitForContainer(callback, attempts = 0) {
        if (attempts > 10) {
            console.error('Failed to find container after 10 attempts');
            return;
        }

        const activeId = window.activeTabId;
        if (!activeId) {
            setTimeout(() => waitForContainer(callback, attempts + 1), 100);
            return;
        }

        const container = document.getElementById('internal_' + activeId);
        if (!container) {
            setTimeout(() => waitForContainer(callback, attempts + 1), 100);
            return;
        }

        callback(container);
    }

    // Initialize start page
    waitForContainer((container) => {
        // Load settings
        const settings = JSON.parse(localStorage.getItem('Aurora.settings') || '{}');
        const proxySettings = JSON.parse(localStorage.getItem('proxySettings') || '{"type":"uv"}');

        // Get stored proxy settings
        const proxyType = localStorage.getItem('proxySettings') || 'uv';
        
        container.innerHTML = `
          <style>
            .new-tab-page { 
              position: relative; 
              width: 100%;
              max-width: 920px;
              min-height: 520px; 
              background: rgba(255,255,255,0.95); 
              border-radius: 24px;
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              margin: 32px auto;
              padding: 32px;
            }
            .top-bar {
              width: 100%;
              display: flex;
              justify-content: flex-end;
              margin-bottom: 24px;
            }
            .settings-btn {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 12px 20px;
              background: #3a86ff;
              color: white;
              border: none;
              border-radius: 20px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s;
            }
            .settings-btn:hover {
              background: #2563eb;
              transform: translateY(-2px);
            }
            .settings-icon {
              width: 20px;
              height: 20px;
            }
            .center-content { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              width: 100%;
              margin-top: 40px;
            }
            .logo { 
              width: auto;
              height: 160px;
              object-fit: contain;
              margin-bottom: 48px;
            }
            .search-container { 
              width: 100%; 
              max-width: 640px; 
              margin-bottom: 48px;
              position: relative;
            }
            .search-bar { 
              width: 100%; 
              padding: 16px 24px; 
              font-size: 1.2rem; 
              border: 2px solid #e2e8f0; 
              border-radius: 16px; 
              outline: none;
              transition: all 0.2s;
            }
            .search-bar:focus {
              border-color: #3a86ff;
              box-shadow: 0 0 0 3px rgba(58, 134, 255, 0.2);
            }
            .shortcuts-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
              gap: 24px;
              width: 100%;
              max-width: 720px;
              margin-top: 32px;
            }
            .shortcut-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
              padding: 16px;
              border-radius: 16px;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.05);
              cursor: pointer;
              transition: all 0.2s;
            }
            .shortcut-item:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .shortcut-icon {
              width: 48px;
              height: 48px;
              border-radius: 12px;
            }
            .shortcut-name {
              font-size: 0.9rem;
              color: #4a5568;
              text-align: center;
            }
            .start-page {
              text-align: center;
              padding: 32px;
            }
            .proxy-selection {
              display: flex;
              justify-content: center;
              gap: 16px;
              margin: 32px 0;
            }
            .proxy-card {
              background: #f7fafc;
              border-radius: 16px;
              padding: 24px;
              cursor: pointer;
              transition: all 0.2s;
              flex: 1;
              max-width: 220px;
              margin: 0 8px;
            }
            .proxy-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .proxy-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 0.8rem;
              margin-top: 8px;
            }
            .proxy-badge.normal {
              background: #c6f6d5;
              color: #2f855a;
            }
            .proxy-badge.sw {
              background: #bee3f8;
              color: #3182ce;
            }
            .proxy-badge.experimental {
              background: #fed7e2;
              color: #e53e3e;
            }
            .quick-links {
              margin-top: 32px;
              text-align: left;
            }
            .quick-links h3 {
              margin-bottom: 16px;
              font-size: 1.2rem;
              color: #2d3748;
            }
            .link-grid {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .link-grid a {
              padding: 12px 16px;
              border-radius: 12px;
              background: #edf2f7;
              color: #2d3748;
              text-decoration: none;
              transition: all 0.2s;
            }
            .link-grid a:hover {
              background: #e2e8f0;
              transform: translateY(-2px);
            }
          </style>
          <div class="new-tab-page">
            <div class="top-bar">
              <button class="settings-btn" onclick="openSettings()">
                <img src="gear.svg" alt="Settings" class="settings-icon">
                Settings
              </button>
            </div>
            <div class="center-content">
              <img src="aurora_logo.png" alt="Aurora" class="logo">
              <div class="search-container">
                <input type="text" id="newTabSearchInput" class="search-bar" 
                  placeholder="Search or enter address">
              </div>
              <div class="shortcuts-grid" id="shortcutsGrid">
                <!-- Shortcuts will be dynamically populated -->
              </div>
            </div>
            <div class="start-page">
              <h1>Welcome to Aurora Gateway</h1>
              <div class="proxy-selection">
                <div class="proxy-card" onclick="switchProxy('uv')">
                  <h2>Ultraviolet</h2>
                  <p>Recommended for most sites</p>
                  <span class="proxy-badge normal">Stable</span>
                </div>
                <div class="proxy-card" onclick="switchProxy('wisp')">
                  <h2>Wisp</h2>
                  <p>Best for WebSocket sites</p>
                  <span class="proxy-badge sw">WebSocket</span>
                </div>
                <div class="proxy-card" onclick="switchProxy('aurora')">
                  <h2>Aurora</h2>
                  <p>Custom proxy server</p>
                  <span class="proxy-badge experimental">Beta</span>
                </div>
              </div>
              <div class="quick-links">
                <h3>Quick Links</h3>
                <div class="link-grid">
                  <a href="javascript:void(0)" onclick="loadTabUrl(window.activeTabId, 'https://google.com')">Google</a>
                  <a href="javascript:void(0)" onclick="loadTabUrl(window.activeTabId, 'https://youtube.com')">YouTube</a>
                  <a href="javascript:void(0)" onclick="loadTabUrl(window.activeTabId, 'https://discord.com')">Discord</a>
                  <a href="javascript:void(0)" onclick="loadTabUrl(window.activeTabId, 'https://reddit.com')">Reddit</a>
                </div>
              </div>
            </div>
          </div>
        `;

        // Fixed URL handling and proxy implementation
        window.executeNewTabSearch = function() {
          const input = document.getElementById("newTabSearchInput");
          if (!input) return;
          
          let query = input.value.trim();
          if (!query) return;

          try {
            // Determine if input is URL or search query
            if (!/^https?:\/\//i.test(query) && query.indexOf('.') === -1) {
              query = 'https://duckduckgo.com/?q=' + encodeURIComponent(query);
            } else if (!/^https?:\/\//i.test(query)) {
              query = 'https://' + query;
            }

            // Validate URL
            new URL(query);

            // Apply UV proxy
            query = '/service/' + Ultraviolet.codec.xor.encode(query);

            if (typeof loadActiveTab === "function") {
              loadActiveTab(query);
            }
          } catch (err) {
            console.error('URL Error:', err);
            // Fallback to search
            query = 'https://duckduckgo.com/?q=' + encodeURIComponent(input.value);
            query = '/service/' + Ultraviolet.codec.xor.encode(query);
            if (typeof loadActiveTab === "function") {
              loadActiveTab(query);
            }
          }
        };

        // Initialize search with proper events
        const searchInput = document.getElementById("newTabSearchInput");
        if (searchInput) {
          searchInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
              e.preventDefault();
              executeNewTabSearch();
            }
          });
          searchInput.focus();
        }

        // Load and display shortcuts
        loadShortcuts();
    });
})();

// Load shortcuts
function loadShortcuts() {
  const shortcuts = JSON.parse(localStorage.getItem('shortcuts') || '[]');
  const grid = document.getElementById('shortcutsGrid');
  if (!grid) return;

  shortcuts.forEach(shortcut => {
    const item = document.createElement('div');
    item.className = 'shortcut-item';
    item.onclick = () => window.executeNewTabSearch(shortcut.url);
    item.innerHTML = `
      <img src="${shortcut.icon || 'default-icon.png'}" class="shortcut-icon" alt="${shortcut.name}">
      <span class="shortcut-name">${shortcut.name}</span>
    `;
    grid.appendChild(item);
  });
}

// Settings handler
window.openSettings = function() {
  if (typeof window.openSettingsModal === 'function') {
    window.openSettingsModal();
  }
};

// Aurora Gateway Start Page
function buildStartPage() {
    const container = document.getElementById('startPage');
    if (!container) return;

    container.innerHTML = `
        <div class="start-page">
            <h1>Welcome to Aurora Gateway</h1>
            <div class="proxy-selection">
                <div class="proxy-card" onclick="switchProxy('uv')">
                    <h2>Ultraviolet</h2>
                    <p>Recommended for most sites</p>
                    <span class="proxy-badge normal">Stable</span>
                </div>
                <div class="proxy-card" onclick="switchProxy('wisp')">
                    <h2>Wisp</h2>
                    <p>Best for WebSocket sites</p>
                    <span class="proxy-badge sw">WebSocket</span>
                </div>
                <div class="proxy-card" onclick="switchProxy('aurora')">
                    <h2>Aurora</h2>
                    <p>Custom proxy server</p>
                    <span class="proxy-badge experimental">Beta</span>
                </div>
            </div>
            <div class="quick-links">
                <h3>Quick Links</h3>
                <div class="link-grid">
                    <a href="javascript:void(0)" onclick="loadTabUrl(window.activeTabId, 'https://google.com')">Google</a>
                    <a href="javascript:void(0)" onclick="loadTabUrl(window.activeTabId, 'https://youtube.com')">YouTube</a>
                    <a href="javascript:void(0)" onclick="loadTabUrl(window.activeTabId, 'https://discord.com')">Discord</a>
                    <a href="javascript:void(0)" onclick="loadTabUrl(window.activeTabId, 'https://reddit.com')">Reddit</a>
                </div>
            </div>
        </div>
    `;
}

// Initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildStartPage);
} else {
    buildStartPage();
}
