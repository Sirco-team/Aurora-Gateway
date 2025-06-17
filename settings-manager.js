// Aurora Gateway Settings Manager
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            proxyType: 'uv',
            theme: 'light',
            searchEngine: 'duckduckgo',
            enableExtensions: true,
            showFavicons: true,
            tabWidth: 'normal'
        };
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Proxy type selection
        document.querySelectorAll('input[name="proxyType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('wispSettings').style.display = 
                    e.target.value === 'wisp' ? 'block' : 'none';
                document.getElementById('customSettings').style.display = 
                    e.target.value === 'custom' ? 'block' : 'none';
            });
        });
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        this.loadSettings();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    loadSettings() {
        const settings = this.getSettings();
        
        // Load appearance settings
        if (settings.theme) this.setTheme(settings.theme);
        if (settings.showFavicons !== undefined) {
            document.getElementById('showFavicons').checked = settings.showFavicons;
        }
        if (settings.tabWidth) {
            document.getElementById('tabWidth').value = settings.tabWidth;
        }
        
        // Load proxy settings
        if (settings.proxyType) {
            const proxyInput = document.querySelector(`input[name="proxyType"][value="${settings.proxyType}"]`);
            if (proxyInput) {
                proxyInput.checked = true;
                proxyInput.dispatchEvent(new Event('change'));
            }
        }
        
        // Load other settings
        if (settings.searchEngine) {
            document.getElementById('searchEngine').value = settings.searchEngine;
        }
        if (settings.enableExtensions !== undefined) {
            document.getElementById('enableExtensions').checked = settings.enableExtensions;
        }
        
        // Apply custom code if present
        if (settings.customCSS || settings.customJS) {
            this.applyCustomCode(settings);
        }
    }

    saveSettings() {
        try {
            const settings = {
                proxyType: document.querySelector('input[name="proxyType"]:checked')?.value || 'uv',
                theme: document.querySelector('.theme-option.active')?.getAttribute('data-theme') || 'light',
                searchEngine: document.getElementById('searchEngine')?.value || 'duckduckgo',
                enableExtensions: document.getElementById('enableExtensions')?.checked || false,
                showFavicons: document.getElementById('showFavicons')?.checked || false,
                tabWidth: document.getElementById('tabWidth')?.value || 'normal',
                customCSS: document.getElementById('customCSS')?.value || '',
                customJS: document.getElementById('customJS')?.value || ''
            };

            localStorage.setItem('Aurora.settings', JSON.stringify(settings));
            this.applySettings(settings);
            this.closeSettings();
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings: ' + err.message);
        }
    }

    getSettings() {
        return JSON.parse(localStorage.getItem('Aurora.settings') || '{}');
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === theme);
        });
    }

    applySettings(settings) {
        if (settings.theme) this.setTheme(settings.theme);
        if (settings.customCSS || settings.customJS) this.applyCustomCode(settings);
        
        // Apply tab width
        if (settings.tabWidth) {
            document.documentElement.style.setProperty('--tab-width', 
                settings.tabWidth === 'wide' ? '200px' : 
                settings.tabWidth === 'narrow' ? '100px' : '150px'
            );
        }
        
        // Apply favicon visibility
        if (settings.showFavicons !== undefined) {
            document.documentElement.style.setProperty('--show-favicons', 
                settings.showFavicons ? 'block' : 'none'
            );
        }
    }

    applyCustomCode(settings) {
        // Apply custom CSS
        let customStyle = document.getElementById('aurora-custom-css');
        if (!customStyle) {
            customStyle = document.createElement('style');
            customStyle.id = 'aurora-custom-css';
            document.head.appendChild(customStyle);
        }
        customStyle.textContent = settings.customCSS || '';

        // Apply custom JavaScript
        const oldScript = document.getElementById('aurora-custom-js');
        if (oldScript) oldScript.remove();
        
        if (settings.customJS) {
            const script = document.createElement('script');
            script.id = 'aurora-custom-js';
            script.textContent = settings.customJS;
            document.body.appendChild(script);
        }
    }
}

// Initialize settings manager
window.settingsManager = new SettingsManager();
document.addEventListener('DOMContentLoaded', () => window.settingsManager.init());