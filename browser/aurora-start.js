// Aurora Gateway Start Page Handler
function buildStartPage() {
    const container = document.getElementById('startPage');
    if (!container) return;

    // Apply any saved theme
    const theme = localStorage.getItem('Aurora.settings') ? 
        JSON.parse(localStorage.getItem('Aurora.settings')).theme : 'light';
    document.documentElement.setAttribute('data-theme', theme);

    container.innerHTML = `
        <style>
            .start-page {
                padding: 40px 20px;
                text-align: center;
                font-family: system-ui, -apple-system, sans-serif;
            }
            .start-logo {
                font-size: 42px;
                margin-bottom: 30px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .search-container {
                max-width: 600px;
                margin: 0 auto 40px;
            }
            .search-box {
                width: 100%;
                padding: 12px 24px;
                font-size: 16px;
                border: 2px solid var(--border-color);
                border-radius: 24px;
                outline: none;
                background: var(--input-bg);
                color: var(--text-color);
                transition: all 0.3s ease;
            }
            .search-box:focus {
                border-color: #6366f1;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
            }
            .quick-links {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 20px;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            .quick-link {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 15px;
                background: var(--input-bg);
                border-radius: 12px;
                color: var(--text-color);
                text-decoration: none;
                transition: all 0.3s ease;
                border: 1px solid var(--border-color);
            }
            .quick-link:hover {
                transform: translateY(-2px);
                background: var(--active-color);
                border-color: #6366f1;
            }
            .quick-link img {
                width: 24px;
                height: 24px;
                margin-right: 10px;
            }
        </style>
        <div class="start-page">
            <h1 class="start-logo">Aurora Gateway</h1>
            <div class="search-container">
                <input type="text" class="search-box" placeholder="Search the web or enter URL"
                    onkeydown="if(event.key==='Enter') window.browser.loadActiveTab(this.value)">
            </div>
            <div class="quick-links">
                <a href="#" class="quick-link" onclick="window.browser.loadTabUrl(window.browser.activeTabId, 'https://google.com'); return false;">
                    <img src="https://www.google.com/favicon.ico" alt="Google">
                    Google
                </a>
                <a href="#" class="quick-link" onclick="window.browser.loadTabUrl(window.browser.activeTabId, 'https://youtube.com'); return false;">
                    <img src="https://www.youtube.com/favicon.ico" alt="YouTube">
                    YouTube
                </a>
                <a href="#" class="quick-link" onclick="window.browser.loadTabUrl(window.browser.activeTabId, 'https://discord.com'); return false;">
                    <img src="https://discord.com/favicon.ico" alt="Discord">
                    Discord
                </a>
                <a href="#" class="quick-link" onclick="window.browser.loadTabUrl(window.browser.activeTabId, 'https://reddit.com'); return false;">
                    <img src="https://www.reddit.com/favicon.ico" alt="Reddit">
                    Reddit
                </a>
            </div>
        </div>
    `;
}

// Auto-initialize if we're on a start page
if (document.getElementById('startPage')) {
    buildStartPage();
}

// Aurora Browser startup
document.addEventListener('DOMContentLoaded', () => {
    // Initialize URL bar handler
    const urlBar = document.getElementById('urlBar');
    if (urlBar) {
        urlBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.browser?.loadActiveTab();
            }
        });
    }

    // Initialize extensions panel
    const extensionsBtn = document.getElementById('extensionsBtn');
    if (extensionsBtn) {
        extensionsBtn.onclick = () => {
            const panel = document.getElementById('extensionsPanel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        };
    }
});