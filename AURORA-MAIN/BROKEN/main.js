// main.js

// ----- Global definitions -----
var tabs = [];
var activeTabId = null;
var tabCounter = 0;

// ----- Settings and storage utilities -----
function getStoredSettings() {
  var s = localStorage.getItem("Aurora.settings");
  return s ? JSON.parse(s) : {
    defaultProxy: "1",
    loadMode: "data",
    rewriteResources: true,
    overrideDynamic: true,
    theme: "light",
    searchEngine: "duckduckgo",
    enableExtensions: true,
    customCSS: "",
    customJS: "",
    showFavicons: true,
    tabWidth: "normal"
  };
}
function saveStoredSettings(s) {
  localStorage.setItem("Aurora.settings", JSON.stringify(s));
}
function getFavorites() {
  var fav = localStorage.getItem("Aurora.favorites");
  return fav ? JSON.parse(fav) : [];
}
function saveFavorites(favArray) {
  localStorage.setItem("Aurora.favorites", JSON.stringify(favArray));
}

// ----- Tab Management & Navigation -----
function newTab(url = "", isInternal = false) {
  tabCounter++;
  var tabId = "tab" + tabCounter;
  var tab = { id: tabId, isInternal: isInternal, currentUrl: url };
  tabs.push(tab);
  
  var tabElem = document.createElement("div");
  tabElem.className = "tab";
  tabElem.id = "tabNav_" + tabId;
  tabElem.innerHTML =
    (url ? (url.length > 20 ? url.substring(0, 20) + "..." : url) : "New Tab") +
    ' <span class="close-tab" onclick="event.stopPropagation(); closeTab(\'' + tabId + '\')">×</span>';
  tabElem.onclick = function() { switchTab(tabId); };
  var addTabBtn = document.getElementById("addTabBtn");
  document.getElementById("tabBar").insertBefore(tabElem, addTabBtn);
  
  var containerElem = document.createElement("div");
  containerElem.className = "tabContent";
  containerElem.id = tabId;
  containerElem.style.display = "none";
  containerElem.innerHTML = "<div class='" + (isInternal ? "internal-content" : "external-content") + 
    "' id='internal_" + tabId + "'></div>";
  document.getElementById("content").appendChild(containerElem);
  document.getElementById("content").appendChild(containerElem);
  
  switchTab(tabId);
  if (url) loadTabUrl(tabId, url);
}
function switchTab(tabId) {
  var contents = document.querySelectorAll(".tabContent");
  for (var i = 0; i < contents.length; i++) {
    contents[i].style.display = "none";
  }
  var tabsElems = document.querySelectorAll(".tab");
  for (var i = 0; i < tabsElems.length; i++) {
    tabsElems[i].classList.remove("activeTab");
  }
  document.getElementById(tabId).style.display = "block";
  document.getElementById("tabNav_" + tabId).classList.add("activeTab");
  activeTabId = tabId;
  window.activeTabId = tabId; // Expose globally for internal pages.
  var tab = tabs.find(function(t) { return t.id === tabId; });
  document.getElementById("urlBar").value = tab ? tab.currentUrl : "";
}
function loadTabUrl(tabId, url) {
  var tab = tabs.find(function(t) { return t.id === tabId; });
  if (!tab) return;
  
  document.getElementById("urlBar").value = url;
  tab.currentUrl = url;
  
  // Update tab title
  const displayUrl = url.startsWith('aurora://') ? 'Aurora ' + url.substring(9) : url;
  document.getElementById("tabNav_" + tabId).innerHTML =
    (displayUrl.length > 20 ? displayUrl.substring(0, 20) + "..." : displayUrl) +
    ' <span class="close-tab" onclick="event.stopPropagation(); closeTab(\'' + tabId + '\')">×</span>';

  if (url.toLowerCase().startsWith("aurora://")) {
    tab.isInternal = true;
    if (url === "aurora://start") {
        loadAuroraScript('aurora-start.js');
    }
    loadInternalPageForTab(tabId, url.substring("aurora://".length));
  } else {
    tab.isInternal = false;
    const validUrl = validateAndConstructUrl(url);
    if (!validUrl) {
      console.error('Invalid URL:', url);
      return;
    }
    document.getElementById("urlBar").value = validUrl;
    loadExternalContentData(validUrl);
  }
}
function loadActiveTab(url) {
  if (!window.activeTabId) return;
  if (url) {
    loadTabUrl(window.activeTabId, url);
  } else {
    var urlBarVal = document.getElementById("urlBar").value.trim();
    loadTabUrl(window.activeTabId, urlBarVal);
  }
}
function closeTab(tabId) {
  tabId = tabId || window.activeTabId;
  if (!tabId) return;
  var tabElem = document.getElementById(tabId);
  var tabNav = document.getElementById("tabNav_" + tabId);
  if (tabElem) tabElem.remove();
  if (tabNav) tabNav.remove();
  tabs = tabs.filter(function(t) { return t.id !== tabId; });
  if (tabs.length > 0) {
    switchTab(tabs[0].id);
  } else {
    window.activeTabId = null;
    document.getElementById("urlBar").value = "";
  }
}

// ----- Internal Page Loader -----
function loadInternalPageForTab(tabId, cmd) {
  const container = document.getElementById("internal_" + tabId);
  if (!container) return;
  
  switch(cmd.toLowerCase()) {
    case "start":
      loadAuroraScript("aurora-start.js");
      container.innerHTML = '<div id="startPage"></div>';
      break;
    case "settings":
      openSettings();
      container.innerHTML = '<div class="aurora-page"><h2>Settings</h2><p>Settings panel opened.</p></div>';
      break;
    case "extensions":
      toggleExtensions();
      container.innerHTML = '<div class="aurora-page"><h2>Extensions</h2><p>Extensions panel opened.</p></div>';
      break;
    case "favorites":
      buildFavoritesPage();
      break;
    default:
      container.innerHTML = `<div class="aurora-page"><h2>Unknown Aurora Command</h2><p>${cmd}</p></div>`;
  }
}

// Helper to dynamically load an external script (e.g. aurora-start.js)
function loadAuroraScript(scriptName) {
  const oldScript = document.getElementById("auroraScript");
  if (oldScript) oldScript.remove();
  const script = document.createElement("script");
  script.id = "auroraScript";
  script.src = "/" + scriptName;
  document.body.appendChild(script);
  script.onload = () => {
    console.log(scriptName + " loaded");
  };
}

// ----- External Content Loader (Data Mode and Div Mode) -----
async function loadExternalContentData(url) {
  const settings = JSON.parse(localStorage.getItem('proxySettings') || '{"type":"uv"}');
  const proxyType = PROXY_TYPES[settings.type];
  
  if (!proxyType) {
    throw new Error('Invalid proxy type');
  }

  try {
      const result = await proxyType.handler(url);
      if (result instanceof WispWebSocket) {
          // Handle Wisp WebSocket connection
          const ws = result;
          return new Promise((resolve, reject) => {
              let data = '';
              ws.addEventListener('message', (event) => {
                  if (typeof event.data === 'string') {
                      data += event.data;
                  } else {
                      data += new TextDecoder().decode(event.data);
                  }
              });
              ws.addEventListener('close', () => resolve(data));
              ws.addEventListener('error', reject);
          });
      } else {
          // Handle UV or custom proxy
          return fetch(result).then(r => r.text());
      }
  } catch (error) {
      console.error('Proxy error:', error);
      throw error;
  }
}

// Test bare servers and find the fastest working one
async function findBestBareServer() {
    const servers = self.__uv$config.bare;
    const testUrl = 'https://www.google.com/favicon.ico';
    let bestServer = null;
    let fastestTime = Infinity;

    await Promise.all(servers.map(async (server) => {
        const start = performance.now();
        try {
            const response = await fetch(server, {
                method: 'HEAD',
                headers: { 'x-requested-with': 'Aurora Gateway' }
            });
            if (response.ok) {
                const time = performance.now() - start;
                if (time < fastestTime) {
                    fastestTime = time;
                    bestServer = server;
                }
            }
        } catch (err) {
            console.warn('Bare server failed:', server);
        }
    }));

    return bestServer || servers[0];
}

// ----- Favorites Functions -----
function toggleFavorites() {
  var panel = document.getElementById("favoritesPanel");
  if (!panel) return;
  if (panel.style.display === "block") {
    panel.style.display = "none";
  } else {
    panel.style.display = "block";
    renderFavorites();
  }
}
function renderFavorites() {
  var favList = getFavorites();
  var listEl = document.getElementById("favoritesList");
  listEl.innerHTML = "";
  favList.forEach(function(item) {
    var li = document.createElement("li");
    li.textContent = item;
    li.onclick = function() {
      document.getElementById("urlBar").value = item;
      toggleFavorites();
      loadActiveTab();
    };
    listEl.appendChild(li);
  });
}
function addCurrentToFavorites() {
  var url = document.getElementById("urlBar").value;
  if (!url) return;
  var favList = getFavorites();
  if (!favList.includes(url)) {
    favList.push(url);
    saveFavorites(favList);
    alert("Added to favorites!");
  } else {
    alert("Already in favorites.");
  }
}
function buildFavoritesPage() {
  var favList = getFavorites();
  var html = `<div class="aurora-page"><h2>Favorites</h2><ul>`;
  favList.forEach(function(fav) {
    html += `<li onclick='document.getElementById("urlBar").value="${fav}"; loadActiveTab();'>${fav}</li>`;
  });
  html += `</ul></div>`;
  var container = document.getElementById("internal_" + window.activeTabId);
  if (container) container.innerHTML = html;
}

// ----- Settings Modal Functions -----
function openSettings() {
    const modal = document.getElementById('settingsModal');
    const content = document.getElementById('settingsModalContent');
    if (!modal || !content) return;

    // Load current settings
    loadProxySettings();
    loadAppearanceSettings();
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function saveSettingsAndClose() {
    try {
        const settings = {
            proxyType: document.querySelector('input[name="proxyType"]:checked')?.value || 'uv',
            wispServer: document.getElementById("wispServer")?.value || '',
            customServer: document.getElementById("customServer")?.value || '',
            loadMode: document.getElementById("loadModeSelect")?.value || 'data',
            rewriteResources: document.getElementById("rewriteResourcesCheck")?.checked || false,
            overrideDynamic: document.getElementById("overrideDynamicCheck")?.checked || false,
            theme: document.querySelector('.theme-option.active')?.getAttribute('data-theme') || 'light',
            searchEngine: document.getElementById("searchEngine")?.value || 'duckduckgo',
            enableExtensions: document.getElementById("enableExtensions")?.checked || false,
            showFavicons: document.getElementById("showFavicons")?.checked || false,
            tabWidth: document.getElementById("tabWidth")?.value || 'normal',
            customCSS: document.getElementById("customCSS")?.value || '',
            customJS: document.getElementById("customJS")?.value || '',
            bypassCORS: document.getElementById("bypassCORS")?.checked || false,
            useCache: document.getElementById("useCache")?.checked || false,
            rewriteLinks: document.getElementById("rewriteLinks")?.checked || false,
            timeout: parseInt(document.getElementById("timeout")?.value || '10000'),
            customProxies: getCustomProxies()
        };

        saveStoredSettings(settings);
        applyTheme(settings.theme);
        applyCustomCode(settings);
        closeSettings();
    } catch (err) {
        console.error('Error saving settings:', err);
        alert('Failed to save settings: ' + err.message);
    }
}

// Theme handling
function applyTheme(theme) {
  try {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  } catch (err) {
    console.error('Error applying theme:', err);
  }
}

function setTheme(theme) {
  try {
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === theme);
    });
    applyTheme(theme);
  } catch (err) {
    console.error('Error setting theme:', err);
  }
}

// Load saved theme on startup
document.addEventListener('DOMContentLoaded', () => {
  try {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    loadSettings();
  } catch (err) {
    console.error('Error loading theme:', err);
  }
});

// Settings loader
function loadSettings() {
    try {
        const settings = getStoredSettings();
        
        // Load appearance settings
        if (settings.theme) setTheme(settings.theme);
        if (settings.showFavicons !== undefined) {
            document.documentElement.style.setProperty('--show-favicons', settings.showFavicons ? 'block' : 'none');
        }
        if (settings.tabWidth) {
            document.documentElement.style.setProperty('--tab-width', settings.tabWidth === 'wide' ? '200px' : 
                settings.tabWidth === 'narrow' ? '100px' : '150px');
        }
        
        // Load proxy settings
        if (settings.proxyType) {
            const proxyInput = document.querySelector(`input[name="proxyType"][value="${settings.proxyType}"]`);
            if (proxyInput) proxyInput.checked = true;
        }
        
        // Load search settings
        if (settings.searchEngine && document.getElementById('searchEngine')) {
            document.getElementById('searchEngine').value = settings.searchEngine;
        }
        
        // Load extension settings
        if (settings.enableExtensions !== undefined && document.getElementById('enableExtensions')) {
            document.getElementById('enableExtensions').checked = settings.enableExtensions;
        }
        
        // Apply custom code
        if (settings.customCSS || settings.customJS) {
            applyCustomCode(settings);
        }
        
        // Refresh proxy configuration if needed
        if (typeof initProxy === 'function') {
            initProxy();
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

// ----- Enhanced navigation functions -----
function goBack() {
  if (!window.activeTabId) return;
  var tab = tabs.find(t => t.id === window.activeTabId);
  if (tab && tab.history && tab.historyIndex > 0) {
    tab.historyIndex--;
    loadTabUrl(window.activeTabId, tab.history[tab.historyIndex]);
  }
}

function goForward() {
  if (!window.activeTabId) return;
  var tab = tabs.find(t => t.id === window.activeTabId);
  if (tab && tab.history && tab.historyIndex < tab.history.length - 1) {
    tab.historyIndex++;
    loadTabUrl(window.activeTabId, tab.history[tab.historyIndex]);
  }
}

function refreshPage() {
  if (!window.activeTabId) return;
  var tab = tabs.find(t => t.id === window.activeTabId);
  if (tab) {
    loadTabUrl(window.activeTabId, tab.currentUrl);
  }
}

function addToHistory(tabId, url) {
  var tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  
  if (!tab.history) {
    tab.history = [url];
    tab.historyIndex = 0;
  } else {
    tab.history = tab.history.slice(0, tab.historyIndex + 1);
    tab.history.push(url);
    tab.historyIndex = tab.history.length - 1;
  }
}

// ----- Custom code injection -----
function applyCustomCode(settings) {
  let customStyleEl = document.getElementById('aurora-custom-css');
  if (!customStyleEl) {
    customStyleEl = document.createElement('style');
    customStyleEl.id = 'aurora-custom-css';
    document.head.appendChild(customStyleEl);
  }
  customStyleEl.textContent = settings.customCSS;

  let customScriptEl = document.getElementById('aurora-custom-js');
  if (customScriptEl) customScriptEl.remove();
  if (settings.customJS) {
    customScriptEl = document.createElement('script');
    customScriptEl.id = 'aurora-custom-js';
    customScriptEl.textContent = settings.customJS;
    document.body.appendChild(customScriptEl);
  }
}

// ----- Search engine support -----
function getSearchUrl(query) {
  const settings = getStoredSettings();
  const engines = {
    'duckduckgo': 'https://duckduckgo.com/?q=',
    'google': 'https://www.google.com/search?q=',
    'bing': 'https://www.bing.com/search?q='
  };
  return (engines[settings.searchEngine] || engines.duckduckgo) + encodeURIComponent(query);
}

// ----- Favicon support -----
function getFavicon(url) {
  try {
    const urlObj = new URL(url);
    return 'https://www.google.com/s2/favicons?domain=' + urlObj.hostname;
  } catch(e) {
    return '';
  }
}

// ----- Proxy Mapping and Helpers (Advanced) -----
const proxyMapping = {
  "1": "https://api.allorigins.win/raw?url=",
  "2": "https://corsproxy.io/?url=",
  "3": "https://cors-anywhere.herokuapp.com/",
  "4": "https://api.cors.lol/?url="
 };

const PROXY_SERVERS = {
    default: [
        { url: 'https://api.cors.lol/?url=', name: 'CORS.lol', type: 'general' },
        { url: 'https://api.codetabs.com/v1/proxy?quest=', name: 'CodeTabs', type: 'general' },
        { url: 'https://api.codetabs.com/v1/tmp/?quest=', name: 'CodeTabs Temp', type: 'general' },
        { url: 'https://api.allorigins.win/raw?url=', name: 'AllOrigins', type: 'general' },
        { url: 'https://corsproxy.io/?', name: 'CorsProxy.io', type: 'general' },
        { url: 'https://proxy.cors.sh/', name: 'CORS.SH', type: 'api-key' },
        { url: 'https://thingproxy.freeboard.io/fetch/', name: 'ThingProxy', type: 'limited' },
        { url: 'https://api.whateverorigin.org/get?url=', name: 'WhateverOrigin', type: 'jsonp' },
        { url: 'https://gobetween.oklabs.org/', name: 'GoBetween', type: 'general' },
        { url: 'https://test.cors.workers.dev/', name: 'Cloudflare CORS', type: 'general' }
    ],
    backup: [
        { url: 'https://api.allorigins.win/raw?url=', name: 'AllOrigins Backup', type: 'general' },
        { url: 'https://cors-anywhere.herokuapp.com/', name: 'CORS Anywhere', type: 'limited' }
    ]
};

async function getWorkingProxies() {
    const testUrl = 'https://example.com';
    const workingProxies = [];
    
    for (const proxy of [...PROXY_SERVERS.default, ...PROXY_SERVERS.backup]) {
        try {
            const response = await fetch(proxy.url + encodeURIComponent(testUrl), {
                timeout: 5000,
                headers: { 'x-requested-with': 'Aurora Gateway' }
            });
            if (response.ok) {
                workingProxies.push(proxy);
            }
        } catch (error) {
            console.warn(`Proxy ${proxy.name} failed health check:`, error);
        }
    }
    
    return workingProxies;
}

// Replace existing proxy selection logic
async function selectBestProxy(url) {
    const settings = JSON.parse(localStorage.getItem('Aurora.proxySettings') || '{}');
    
    if (settings.customProxyUrl) {
        return settings.customProxyUrl;
    }
    
    const workingProxies = await getWorkingProxies();
    
    // Filter proxies based on URL type and requirements
    let appropriateProxies = workingProxies;
    if (url.includes('api.') || url.includes('/api/')) {
        appropriateProxies = workingProxies.filter(p => p.type !== 'limited');
    }
    
    return appropriateProxies[0]?.url || PROXY_SERVERS.default[0].url;
}

// Update fetchWithProxy function
async function fetchWithProxy(url, options = {}) {
    const proxyUrl = await selectBestProxy(url);
    try {
        const response = await fetch(proxyUrl + encodeURIComponent(url), {
            ...options,
            headers: {
                ...options.headers,
                'x-requested-with': 'Aurora Gateway'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
    } catch (error) {
        console.error(`Error with proxy ${proxyUrl}:`, error);
        throw error;
    }
}

function forceBaseTag(html, baseHref) {
  html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>(\s*)/i, "");
  return html.replace(/<head>/i, `<head><base href="${baseHref}">`);
}

function rewriteResourceUrls(html, baseUrl, proxyBase) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = doc.querySelectorAll("[src], [href], [action]");
    elements.forEach(el => {
      if (el.tagName.toLowerCase() === "a") return;
      ["src", "href", "action"].forEach(attr => {
        const val = el.getAttribute(attr);
        if (
          val &&
          !val.startsWith("data:") &&
          !/^mailto:/.test(val) &&
          !/^javascript:/.test(val)
        ) {
          // Only rewrite if the URL is not already proxied (avoid double-proxying for any known proxy)
          if (val.startsWith(proxyBase) ||
              val.startsWith("https://corsproxy.io/") ||
              val.startsWith("https://cors-anywhere.herokuapp.com/")) return;
          // Protocol-relative URL (//domain.com/...)
          if (/^\/\//.test(val)) {
            try {
              const resolved = window.location.protocol + val;
              const newVal = proxyBase + encodeURIComponent(resolved);
              el.setAttribute(attr, newVal);
            } catch(e) { }
          }
          // Relative URL (not starting with http, https, or //)
          else if (!/^https?:\/\//i.test(val)) {
            try {
              const resolved = new URL(val, baseUrl).href;
              const newVal = proxyBase + encodeURIComponent(resolved);
              el.setAttribute(attr, newVal);
            } catch(e) { }
          }
          // Absolute URL (http/https)
          else if (/^https?:\/\//i.test(val)) {
            // Only proxy if the host matches the baseUrl's host and the path is not "/"
            try {
              const baseHost = new URL(baseUrl).host;
              const valUrl = new URL(val);
              if (baseHost === valUrl.host && valUrl.pathname !== "/") {
                const newVal = proxyBase + encodeURIComponent(val);
                el.setAttribute(attr, newVal);
              }
            } catch(e) { }
          }
        }
      });
    });
    const baseTag = doc.querySelector("base");
    if (baseTag) baseTag.remove();
    return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
  } catch(e) {
    return html;
  }
}

function getInterceptorScript(originalUrl, proxyBase, proxyId) {
  return `<script>(function() {
    const __ORIGINAL_URL = "${originalUrl}";
    const __PROXY_BASE = "${proxyBase}";
    const __PROXY_ID = "${proxyId}";
    
    function shouldHandleNavigation(url) {
      try {
        if (!url) return false;
        // Don't handle hash changes
        if (url.startsWith('#')) return false;
        // Don't handle javascript: urls
        if (url.startsWith('javascript:')) return false;
        // Don't handle DuckDuckGo internal navigation
        if (url.includes('duckduckgo.com') && !url.includes('redirect')) return false;
        // Don't handle same-origin dynamic navigation
        const currentPath = window.location.pathname + window.location.search;
        if (url === currentPath) return false;
        // Don't handle relative URLs for search engines
        if (url.startsWith('/') && window.location.href.includes('duckduckgo.com')) return false;
        return true;
      } catch(e) {
        return false;
      }
    }

    function handleNavigation(url) {
      if (!shouldHandleNavigation(url)) return;
      
      if (url.startsWith("https://corsproxy.io/") || url.startsWith("https://cors-anywhere.herokuapp.com/")) {
        try {
          const u = new URL(url);
          const orig = u.searchParams.get("url");
          if (orig) { url = orig; }
        } catch(e) { }
      }
      
      if (!/^https?:\\/\\//i.test(url)) {
        try { url = new URL(url, __ORIGINAL_URL).href; }
        catch(e) { return; }
      }
      
      window.location.href = window.location.origin + window.location.pathname + 
        "?proxy=" + __PROXY_ID + "&url=" + encodeURIComponent(url);
    }

    // Intercept location changes
    window.location.assign = function(url) { 
      if (shouldHandleNavigation(url)) handleNavigation(url);
      else {
        // Allow normal navigation for search results
        if (window.location.href.includes('duckduckgo.com')) {
          window.location.href = url;
          return;
        }
        handleNavigation(url);
      }
    };
    window.location.replace = function(url) {
      if (shouldHandleNavigation(url)) handleNavigation(url);
      else {
        // Allow normal navigation for search results
        if (window.location.href.includes('duckduckgo.com')) {
          window.location.href = url;
          return;
        }
        handleNavigation(url);
      }
    };
    
    // Intercept window.open
    window.open = function(url, name, specs) {
      if (shouldHandleNavigation(url)) {
        handleNavigation(url);
        return null;
      }
      return window.open.apply(this, arguments);
    };

    // Intercept clicks
    document.addEventListener("click", function(e) {
      const anchor = e.target.closest("a");
      if (anchor && anchor.getAttribute("href")) {
        const href = anchor.getAttribute("href");
        if (shouldHandleNavigation(href)) {
          e.preventDefault();
          handleNavigation(href);
        }
        return;
      }
    }, true);

    // Intercept XHR
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      if (!/^https?:\\/\\//i.test(url)) {
        try { url = new URL(url, __ORIGINAL_URL).href; } catch(e) { }
      }
      return origOpen.call(this, method, __PROXY_BASE + url, async, user, password);
    };

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      let url;
      if (typeof input === "string") { url = input; }
      else if (input instanceof Request) { url = input.url; }
      if (!/^https?:\\/\\//i.test(url)) {
        try { url = new URL(url, __ORIGINAL_URL).href; } catch(e) { }
      }
      return originalFetch(__PROXY_BASE + url, init);
    };

    // Process dynamic elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { processElement(node); }
        });
      });
    });
    
    function processElement(el) {
      if (el.nodeType !== 1) return;
      // Don't process elements if we're on a search page
      if (window.location.href.includes('duckduckgo.com') && !window.location.href.includes('redirect')) {
        return;
      }
      ["src", "href", "action"].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && !/^https?:\/\//i.test(val) && !/^\\/\\//i.test(val)) {
          try {
            const resolved = new URL(val, __ORIGINAL_URL).href;
            el.setAttribute(attr, __PROXY_BASE + resolved);
          } catch(e) { }
        }
      });
      el.querySelectorAll("[src], [href], [action]").forEach(child => { 
        processElement(child);
      });
    }
    
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  })();<\/script>`;
}

function injectInterceptor(html, originalUrl, proxyBase, proxyId) {
  const interceptorScript = getInterceptorScript(originalUrl, proxyBase, proxyId);
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, interceptorScript + "</body>");
  } else {
    return html + interceptorScript;
  }
}

// ----- Cross-Origin Resource Handling -----
function handleCrossOriginResource(url, type = 'fetch') {
  var settings = getStoredSettings();
  var proxyVal = settings.defaultProxy || "1";
  var proxyBase = proxyMapping[proxyVal] || proxyMapping["1"];
  
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Don't proxy already proxied URLs
  if (url.startsWith(proxyBase)) {
    return url;
  }

  // Handle relative URLs
  if (!/^https?:\/\//i.test(url)) {
    try {
      url = new URL(url, window.location.href).href;
    } catch(e) {
      return url;
    }
  }

  return proxyBase + encodeURIComponent(url);
}

// ----- Extension Management
function toggleExtensions() {
    const panel = document.getElementById('extensionsPanel');
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        renderExtensions();
    }
}

function renderExtensions() {
    const settings = getStoredSettings();
    if (!settings.enableExtensions) {
        document.getElementById('extensionsPanel').innerHTML = `
            <h3>Extensions Disabled</h3>
            <p>Enable extensions in settings to use this feature.</p>
            <button onclick="toggleExtensions()">Close</button>
        `;
        return;
    }

    const installed = getInstalledExtensions();
    const installedDiv = document.getElementById('installedExtensions');
    const availableDiv = document.getElementById('availableExtensions');
    
    // Clear existing content
    installedDiv.innerHTML = '<h4>Installed Extensions</h4>';
    availableDiv.innerHTML = '<h4>Available Extensions</h4>';

    // Render installed extensions
    installed.forEach(ext => {
        const div = document.createElement('div');
        div.className = 'extension-item';
        div.innerHTML = `
            <span class="extension-icon">${ext.icon}</span>
            <div class="extension-info">
                <div class="extension-name">${ext.name}</div>
                <div class="extension-version">v${ext.version}</div>
                <div class="extension-description">${ext.description}</div>
            </div>
            <button onclick="uninstallExtension('${ext.id}')">Remove</button>
        `;
        installedDiv.appendChild(div);
    });

    // Render available extensions
    extensionStore.available.forEach(ext => {
        if (!installed.find(i => i.id === ext.id)) {
            const div = document.createElement('div');
            div.className = 'extension-item';
            div.innerHTML = `
                <span class="extension-icon">${ext.icon}</span>
                <div class="extension-info">
                    <div class="extension-name">${ext.name}</div>
                    <div class="extension-description">${ext.description}</div>
                </div>
                <button onclick="installExtension('${ext.id}')">Install</button>
            `;
            availableDiv.appendChild(div);
        }
    });
}

// Extension registry - list of available extension URLs
const extensionRegistry = [
    'https://raw.githubusercontent.com/aurora-extensions/dark-mode/main/dark-mode.js',
    'https://raw.githubusercontent.com/aurora-extensions/ad-block/main/ad-block.js',
    'https://raw.githubusercontent.com/aurora-extensions/translator/main/translator.js'
];

// Load extension store from registry
async function loadExtensionStore() {
    const extensions = [];
    for (const url of extensionRegistry) {
        try {
            const response = await fetch(url);
            const extensionCode = await response.text();
            // Extract metadata from extension code
            const metadata = JSON.parse(extensionCode.split('/*METADATA*/')[1].split('/*CODE*/')[0]);
            extensions.push({
                id: metadata.id,
                name: metadata.name,
                description: metadata.description,
                icon: metadata.icon,
                version: metadata.version,
                url: url
            });
        } catch (e) {
            console.error('Failed to load extension:', url, e);
        }
    }
    return { available: extensions };
}

function getInstalledExtensions() {
    return JSON.parse(localStorage.getItem('Aurora.extensions') || '[]');
}

function saveInstalledExtensions(extensions) {
    localStorage.setItem('Aurora.extensions', JSON.stringify(extensions));
}

async function installExtension(id) {
    const ext = extensionStore.available.find(e => e.id === id);
    if (!ext) return;

    try {
        // Fetch the extension code
        const response = await fetch(ext.url);
        const code = await response.text();
        
        // Store extension code
        localStorage.setItem('Aurora_extension_' + id, code);
        
        // Add to installed list
        const installed = getInstalledExtensions();
        if (!installed.find(e => e.id === id)) {
            installed.push(ext);
            saveInstalledExtensions(installed);
        }
        
        // Activate the extension
        activateExtension(ext);
        renderExtensions();
    } catch (e) {
        console.error('Failed to install extension:', e);
    }
}

function uninstallExtension(id) {
  const installed = getInstalledExtensions();
  const filtered = installed.filter(e => e.id !== id);
  saveInstalledExtensions(filtered);
  renderExtensions();
  deactivateExtension(id);
}

function activateExtension(ext) {
    const code = localStorage.getItem('Aurora_extension_' + ext.id);
    if (!code) return;
    
    try {
        // Extract and run the extension code
        const extensionCode = code.split('/*CODE*/')[1];
        const script = document.createElement('script');
        script.id = 'aurora-ext-' + ext.id;
        script.textContent = extensionCode;
        document.body.appendChild(script);
    } catch (e) {
        console.error('Failed to activate extension:', ext.id, e);
    }
}

function deactivateExtension(id) {
  switch(id) {
    case 'dark-reader':
      document.body.classList.remove('dark-mode');
      break;
    case 'ad-blocker':
      disableAdBlocker();
      break;
    case 'translator':
      removeTranslator();
      break;
    case 'screenshot':
      disableScreenshotTool();
      break;
  }
}

// ----- Custom Proxy Management -----
function getCustomProxies() {
  return JSON.parse(localStorage.getItem('Aurora.customProxies') || '[]');
}
function saveCustomProxies(list) {
  localStorage.setItem('Aurora.customProxies', JSON.stringify(list));
}
function renderCustomProxies() {
  const proxies = getCustomProxies();
  const container = document.getElementById('customProxies');
  if (!container) return;
  container.innerHTML = '';
  proxies.forEach((proxy, idx) => {
    const div = document.createElement('div');
    div.className = 'custom-proxy-item';
    div.innerHTML = `<b>${proxy.name}</b> <span style='font-size:12px;'>[${proxy.type}]</span> <code>${proxy.url}</code> <button onclick='removeCustomProxy(${idx})'>Remove</button>`;
    container.appendChild(div);
  });
}
function addCustomProxy() {
  const url = document.getElementById('proxyUrl').value.trim();
  const name = document.getElementById('proxyName').value.trim();
  const type = document.getElementById('proxyType').value;
  if (!url || !name) {
    alert('Please enter both a name and a URL.');
    return;
  }
  const proxies = getCustomProxies();
  proxies.push({ url, name, type });
  saveCustomProxies(proxies);
  renderCustomProxies();
  document.getElementById('proxyUrl').value = '';
  document.getElementById('proxyName').value = '';
}
function removeCustomProxy(idx) {
  const proxies = getCustomProxies();
  proxies.splice(idx, 1);
  saveCustomProxies(proxies);
  renderCustomProxies();
}

// Call renderCustomProxies when settings modal opens
const _oldOpenSettings = window.openSettings;
window.openSettings = function() {
  if (_oldOpenSettings) _oldOpenSettings();
  renderCustomProxies();
};

// ----- Extension Importer (fixed try/catch/curly braces) -----
async function installCustomExtension() {
  const url = document.getElementById('customExtensionUrl').value.trim();
  if (!url) {
    alert('Please enter a valid URL to an extension file');
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch extension');
    }
    const code = await response.text();
    // Support multiple metadata formats
    let metaBlock = '';
    const formats = [
      { start: '/*METADATA*/', end: '/*CODE*/' },
      { start: '/* METADATA', end: 'METADATA */' },
      { start: '/*METADATA', end: 'METADATA*/' },
      { start: '// METADATA', end: '// CODE' }
    ];
    for (const format of formats) {
      if (code.includes(format.start)) {
        const parts = code.split(format.start)[1];
        if (parts) {
          const endParts = parts.split(format.end)[0];
          if (endParts) {
            metaBlock = endParts.trim();
            break;
          }
        }
      }
    }
    if (!metaBlock) {
      throw new Error('Invalid extension format. Extension must include metadata section.');
    }
    let metadata;
    try {
      metadata = JSON.parse(metaBlock);
    } catch (e) {
      throw new Error('Extension metadata must be valid JSON.');
    }
    if (!metadata || !metadata.id || !metadata.name) {
      throw new Error('Invalid extension metadata');
    }
    localStorage.setItem('Aurora_extension_' + metadata.id, code);
    const installed = getInstalledExtensions();
    if (!installed.find(e => e.id === metadata.id)) {
      installed.push({
        id: metadata.id,
        name: metadata.name,
        description: metadata.description || '',
        version: metadata.version || '1.0.0',
        icon: metadata.icon || '🧩',
        url: url
      });
      saveInstalledExtensions(installed);
    }
    activateExtension({id: metadata.id});
    renderExtensions();
    document.getElementById('customExtensionUrl').value = '';
    alert('Extension installed successfully!');
  } catch (e) {
    alert('Error installing extension: ' + e.message);
    console.error('Extension installation error:', e);
  }
}

// Proxy confirmation and settings
function showProxyChangeConfirmation(newProxyType) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'proxy-dialog';
        dialog.innerHTML = `
            <div class="proxy-dialog-content">
                <h3>Change Proxy Server?</h3>
                <p>Are you sure you want to switch to ${newProxyType} proxy?</p>
                <p class="proxy-warning">This will refresh your current tabs</p>
                <div class="proxy-dialog-buttons">
                    <button class="proxy-confirm">Yes, Change Proxy</button>
                    <button class="proxy-cancel">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('.proxy-confirm').onclick = () => {
            document.body.removeChild(dialog);
            resolve(true);
        };

        dialog.querySelector('.proxy-cancel').onclick = () => {
            document.body.removeChild(dialog);
            resolve(false);
        };
    });
}

// Update the proxy settings save function
async function saveProxySettings() {
    const newType = document.querySelector('input[name="proxyType"]:checked').value;
    const oldSettings = JSON.parse(localStorage.getItem('Aurora.proxySettings') || '{}');
    
    if (oldSettings.proxyType && oldSettings.proxyType !== newType) {
        const confirmed = await showProxyChangeConfirmation(newType);
        if (!confirmed) {
            // Revert radio button selection
            document.querySelector(`input[name="proxyType"][value="${oldSettings.proxyType}"]`).checked = true;
            return;
        }
    }

    const settings = {
        proxyType: newType,
        customProxyUrl: document.getElementById('customProxyUrl').value,
        alwaysUseProxy: document.getElementById('alwaysUseProxy').checked,
        bypassCorsProxy: document.getElementById('bypassCorsProxy').checked
    };
    
    localStorage.setItem('Aurora.proxySettings', JSON.stringify(settings));
    updateProxyConfig(settings);
    
    if (oldSettings.proxyType && oldSettings.proxyType !== settings.proxyType) {
        location.reload(); // Refresh to apply new proxy
    }
}

// Handle proxy type selection
document.querySelectorAll('input[name="proxyType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.getElementById('wispSettings').style.display = 
            e.target.value === 'wisp' ? 'block' : 'none';
        document.getElementById('customSettings').style.display = 
            e.target.value === 'custom' ? 'block' : 'none';
    });
});

// Load saved proxy settings
function loadProxySettings() {
    const settings = JSON.parse(localStorage.getItem('proxySettings') || '{"type":"uv"}');
    
    // Set proxy type
    const proxyTypeInput = document.querySelector(`input[name="proxyType"][value="${settings.type}"]`);
    if (proxyTypeInput) {
        proxyTypeInput.checked = true;
        // Trigger change event to show/hide relevant settings
        proxyTypeInput.dispatchEvent(new Event('change'));
    }

    // Set server URLs
    if (settings.wispServer) {
        document.getElementById('wispServer').value = settings.wispServer;
    }
    if (settings.customServer) {
        document.getElementById('customServer').value = settings.customServer;
    }

    // Set advanced options
    if (document.getElementById('bypassCORS')) {
        document.getElementById('bypassCORS').checked = settings.bypassCORS || false;
    }
    if (document.getElementById('useCache')) {
        document.getElementById('useCache').checked = settings.useCache || false;
    }
    if (document.getElementById('rewriteLinks')) {
        document.getElementById('rewriteLinks').checked = settings.rewriteLinks || false;
    }
    if (document.getElementById('timeout')) {
        document.getElementById('timeout').value = settings.timeout || 10000;
    }
}

// Initialize extension store
const extensionStore = {
    available: [
        {
            id: 'dark-mode',
            name: 'Dark Mode',
            description: 'Adds dark mode support to websites',
            icon: '🌙',
            version: '1.0.0'
        },
        {
            id: 'ad-block',
            name: 'Ad Blocker',
            description: 'Blocks common advertisements',
            icon: '🛡️',
            version: '1.0.0'
        }
    ]
};

function loadAppearanceSettings() {
    const settings = getStoredSettings();
    
    // Set theme option
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === (settings.theme || 'light'));
    });

    // Set tab width
    if (document.getElementById('tabWidth')) {
        document.getElementById('tabWidth').value = settings.tabWidth || 'normal';
    }

    // Set favicons option
    if (document.getElementById('showFavicons')) {
        document.getElementById('showFavicons').checked = settings.showFavicons !== false;
    }

    // Apply current theme
    applyTheme(settings.theme || 'light');
}

// Validate and construct URLs
function validateAndConstructUrl(url) {
    try {
        if (!url) return null;
        if (url === 'about:blank') return url;
        if (url.startsWith('blob:')) return url;
        if (url.startsWith('data:')) return url;
        
        // Handle Aurora internal URLs
        if (url.startsWith('aurora://')) return url;
        
        // Add protocol if missing
        if (!/^https?:\/\//i.test(url)) {
            if (url.indexOf('.') !== -1) {
                url = 'https://' + url;
            } else {
                const settings = getStoredSettings();
                return getSearchUrl(url);
            }
        }
        
        return new URL(url).href;
    } catch (err) {
        console.warn('URL validation error:', err);
        return null;
    }
}

// Create initial tab on startup
document.addEventListener('DOMContentLoaded', () => {
    // Create new tab with start page
    newTab('aurora://start');
});
