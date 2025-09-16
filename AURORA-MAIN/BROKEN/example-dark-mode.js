// Example Dark Mode Extension
/* METADATA
{
    "id": "simple-dark-mode-1234",
    "name": "Simple Dark Mode",
    "description": "A simple dark mode for websites",
    "version": "1.0.0",
    "icon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgMmM1LjUxNCAwIDEwIDQuNDg2IDEwIDEwcy00LjQ4NiAxMC0xMCAxMFMyIDIuNTE0IDIgMTJzNC40ODYtMTAgMTAtMTB6Ii8+PC9zdmc+"
}
METADATA */
/* CODE */
(function() {
    // Store extension state in localStorage
    const stateKey = 'Aurora_extension_simple-dark-mode-1234';
    
    // Extension has full access to modify browser
    const extension = {
        init: function() {
            // Add our styles
            const style = document.createElement('style');
            style.textContent = `
                body.dark-mode {
                    background: #1a1a1a !important;
                    color: #ffffff !important;
                }
                body.dark-mode a {
                    color: #4da6ff !important;
                }
                body.dark-mode img {
                    filter: brightness(0.8) contrast(1.2);
                }
            `;
            document.head.appendChild(style);
            
            // Add toggle button to browser UI
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.onclick = this.toggle.bind(this);
            btn.innerHTML = '🌙';
            document.querySelector('.toolbar-right').insertBefore(btn, document.querySelector('.toolbar-right').firstChild);
            
            // Load saved state
            if (localStorage.getItem(stateKey) === 'enabled') {
                this.enable();
            }
        },
        
        enable: function() {
            document.body.classList.add('dark-mode');
            localStorage.setItem(stateKey, 'enabled');
        },
        
        disable: function() {
            document.body.classList.remove('dark-mode');
            localStorage.setItem(stateKey, 'disabled');
        },
        
        toggle: function() {
            if (document.body.classList.contains('dark-mode')) {
                this.disable();
            } else {
                this.enable();
            }
        }
    };
    
    // Initialize extension
    extension.init();
})();