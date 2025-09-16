// Aurora Browser Core
class AuroraBrowser {
    constructor(options = {}) {
        this.tabs = new Map();
        this.activeTabId = null;
        this.options = options;
        
        // Copy all methods from options
        Object.keys(options).forEach(key => {
            if (typeof options[key] === 'function') {
                this[key] = options[key].bind(this);
            }
        });
    }

    newTab(url = 'aurora://start') {
        const tabId = 'tab-' + Date.now();
        const tabBar = document.getElementById('tabBar');
        const content = document.getElementById('content');

        // Create tab button
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = tabId;
        tab.innerHTML = `
            <span class="tab-title">New Tab</span>
            <span class="close-tab" data-tab-id="${tabId}">&times;</span>
        `;

        // Create tab content
        const tabContent = document.createElement('div');
        tabContent.id = tabId;
        tabContent.className = 'tab-container';

        // Add click handlers
        tab.querySelector('.close-tab').onclick = (e) => {
            e.stopPropagation();
            this.closeTab(tabId);
        };
        tab.onclick = () => this.switchTab(tabId);

        // Insert elements
        tabBar.insertBefore(tab, document.getElementById('addTabBtn'));
        content.appendChild(tabContent);

        // Store tab data
        this.tabs.set(tabId, {
            element: tab,
            container: tabContent,
            url: url || this.options.defaultUrl || 'about:blank'
        });

        this.switchTab(tabId);
        if (url) this.loadTab(tabId, url);
        return tabId;
    }

    async switchTab(tabId) {
        if (!this.tabs.has(tabId)) return;

        // Update active states
        this.tabs.forEach((tab, id) => {
            tab.element.classList.toggle('active', id === tabId);
            tab.container.classList.toggle('active', id === tabId);
        });

        this.activeTabId = tabId;
        const tab = this.tabs.get(tabId);
        if (tab.url) {
            document.getElementById('urlBar').value = tab.url;
        }
    }

    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.element.remove();
        tab.container.remove();
        this.tabs.delete(tabId);

        // Switch to another tab if we closed the active one
        if (this.activeTabId === tabId) {
            const nextTab = Array.from(this.tabs.keys())[0];
            if (nextTab) {
                this.switchTab(nextTab);
            } else {
                this.newTab();
            }
        }
    }

    async loadTab(tabId, url) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.url = url;
        if (this.options.proxyHandler) {
            await this.options.proxyHandler(tabId, url);
        }
    }

    loadActiveTab() {
        if (!this.activeTabId) return;
        const url = document.getElementById('urlBar').value;
        this.loadTab(this.activeTabId, url);
    }

    removeTab(tabId) {
        this.closeTab(tabId);
    }

    loadInternalPage(tabId, page) {
        const container = document.getElementById(tabId);
        if (!container) return;

        fetch(`../browser/pages/${page}.html`)
            .then(response => response.text())
            .then(html => {
                container.innerHTML = html;
            })
            .catch(err => {
                container.innerHTML = `<div class="error">Failed to load page: ${err.message}</div>`;
            });
    }

    toggleFullscreen() {
        const activeTab = document.getElementById(this.activeTabId);
        if (!activeTab) return;
        
        const iframe = activeTab.querySelector('iframe');
        if (!iframe) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            iframe.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        }
    }

    goBack() {
        const frame = document.querySelector(`#${this.activeTabId} iframe`);
        if (frame && frame.contentWindow) {
            frame.contentWindow.history.back();
        }
    }

    goForward() {
        const frame = document.querySelector(`#${this.activeTabId} iframe`);
        if (frame && frame.contentWindow) {
            frame.contentWindow.history.forward();
        }
    }

    refreshPage() {
        const frame = document.querySelector(`#${this.activeTabId} iframe`);
        if (frame && frame.contentWindow) {
            frame.contentWindow.location.reload();
        }
    }

    openSettings() {
        const panel = document.getElementById('extensionsPanel');
        if (panel) {
            panel.style.display = 'block';
        }
    }

    closeSettings() {
        const panel = document.getElementById('extensionsPanel');
        if (panel) {
            panel.style.display = 'none';
        }
   }

    formatUrl(url) {
        if (!url) return '';
        if (url.startsWith('aurora://')) return url;
        if (url.match(/^[a-zA-Z]+:\/\//)) return url;
        if (url.includes(' ')) {
            return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }
        return `https://${url}`;
    }

    async handleUrlInput(input) {
        const url = this.formatUrl(input);
        if (this.activeTabId) {
            await this.loadTab(this.activeTabId, url);
        }
    }
}