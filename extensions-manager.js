// Aurora Gateway Extensions Manager
class ExtensionsManager {
    constructor() {
        this.store = {
            available: [
                {
                    id: 'dark-mode',
                    name: 'Dark Mode',
                    description: 'Adds dark mode support to websites',
                    icon: '🌙',
                    version: '1.0.0',
                    url: 'extensions/dark-mode.js'
                },
                {
                    id: 'ad-block',
                    name: 'Ad Blocker',
                    description: 'Blocks common advertisements',
                    icon: '🛡️',
                    version: '1.0.0',
                    url: 'extensions/ad-block.js'
                }
            ]
        };
    }

    init() {
        this.loadInstalledExtensions();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('extensionsPanel')?.addEventListener('click', (e) => {
            if (e.target.matches('.close-btn')) {
                this.togglePanel();
            }
        });
    }

    togglePanel() {
        const panel = document.getElementById('extensionsPanel');
        if (!panel) return;
        
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this.renderExtensions();
        }
    }

    async installExtension(id) {
        try {
            const ext = this.store.available.find(e => e.id === id);
            if (!ext) throw new Error('Extension not found');

            const installed = this.getInstalledExtensions();
            if (!installed.find(e => e.id === id)) {
                installed.push(ext);
                this.saveInstalledExtensions(installed);
            }

            await this.activateExtension(ext);
            this.renderExtensions();
        } catch (err) {
            console.error('Failed to install extension:', err);
            alert('Installation failed: ' + err.message);
        }
    }

    uninstallExtension(id) {
        const installed = this.getInstalledExtensions();
        const filtered = installed.filter(e => e.id !== id);
        this.saveInstalledExtensions(filtered);
        this.deactivateExtension(id);
        this.renderExtensions();
    }

    getInstalledExtensions() {
        return JSON.parse(localStorage.getItem('Aurora.extensions') || '[]');
    }

    saveInstalledExtensions(extensions) {
        localStorage.setItem('Aurora.extensions', JSON.stringify(extensions));
    }

    async activateExtension(ext) {
        const script = document.createElement('script');
        script.id = 'aurora-ext-' + ext.id;
        script.src = ext.url;
        document.body.appendChild(script);
        return new Promise((resolve) => {
            script.onload = resolve;
        });
    }

    deactivateExtension(id) {
        document.getElementById('aurora-ext-' + id)?.remove();
    }

    renderExtensions() {
        const container = document.getElementById('extensionsPanel');
        if (!container) return;

        const settings = JSON.parse(localStorage.getItem('Aurora.settings') || '{}');
        if (!settings.enableExtensions) {
            container.innerHTML = `
                <h3>Extensions Disabled</h3>
                <p>Enable extensions in settings to use this feature.</p>
                <button class="close-btn">Close</button>
            `;
            return;
        }

        const installed = this.getInstalledExtensions();
        
        container.innerHTML = `
            <h3>Extensions</h3>
            <div class="installed-extensions">
                <h4>Installed Extensions</h4>
                ${this.renderExtensionList(installed, true)}
            </div>
            <div class="available-extensions">
                <h4>Available Extensions</h4>
                ${this.renderExtensionList(
                    this.store.available.filter(a => !installed.find(i => i.id === a.id)),
                    false
                )}
            </div>
            <button class="close-btn">Close</button>
        `;

        // Add event listeners
        container.querySelectorAll('.install-btn').forEach(btn => {
            btn.onclick = () => this.installExtension(btn.dataset.id);
        });
        container.querySelectorAll('.uninstall-btn').forEach(btn => {
            btn.onclick = () => this.uninstallExtension(btn.dataset.id);
        });
    }

    renderExtensionList(extensions, installed = false) {
        return extensions.map(ext => `
            <div class="extension-item">
                <span class="extension-icon">${ext.icon}</span>
                <div class="extension-info">
                    <div class="extension-name">${ext.name}</div>
                    <div class="extension-version">v${ext.version}</div>
                    <div class="extension-description">${ext.description}</div>
                </div>
                <button class="${installed ? 'uninstall-btn' : 'install-btn'}" data-id="${ext.id}">
                    ${installed ? 'Remove' : 'Install'}
                </button>
            </div>
        `).join('');
    }
}

// Initialize extensions manager
window.extensionsManager = new ExtensionsManager();
document.addEventListener('DOMContentLoaded', () => window.extensionsManager.init());