// main.js

// ----- Global definitions -----
var tabs = [];
var activeTabId = null;
var tabCounter = 0;

// ----- Favorites utilities -----
function getStoredSettings() {
  var s = localStorage.getItem("Aurora.settings");
  return s ? JSON.parse(s) : {
    defaultProxy: "1",
    loadMode: "data",
    rewriteResources: true,
    overrideDynamic: true
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
  if (isInternal) {
    containerElem.innerHTML = "<div class='internal-content' id='internal_" + tabId + "'></div>";
  } else {
    containerElem.innerHTML = "<div class='external-content'></div>";
  }
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
  // Always show the current URL in the URL bar
  document.getElementById("urlBar").value = url;
  tab.currentUrl = url;
  document.getElementById("tabNav_" + tabId).innerHTML =
    (url.length > 20 ? url.substring(0, 20) + "..." : url) +
    ' <span class="close-tab" onclick="event.stopPropagation(); closeTab(\'' + tabId + '\')">×</span>';

  if (url.toLowerCase().startsWith("aurora://")) {
    tab.isInternal = true;
    loadInternalPageForTab(tabId, url.substring("aurora://".length));
  } else {
    tab.isInternal = false;
    // If no protocol and it looks like a domain, default to https://
    if (!/^https?:\/\//i.test(url) && url.indexOf('.') !== -1) {
      url = "https://" + url;
    } else if (!/^https?:\/\//i.test(url) && url.indexOf('.') === -1) {
      url = "https://duckduckgo.com/?q=" + encodeURIComponent(url);
    }
    document.getElementById("urlBar").value = url;
    loadExternalContentData(url);
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
  if (cmd.toLowerCase() === "start") {
    loadAuroraScript("aurora-start.js");
  } else {
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
  var settings = getStoredSettings();
  var tabId = window.activeTabId;
  var tab = tabs.find(function(t) { return t.id === tabId; });
  if (!tab) return;
  var tabContent = document.getElementById(tabId);
  if (!tabContent) return;

  // Try each proxy in sequence until one works
  let error;
  for (const proxyId of ["1", "2", "3"]) {
    try {
      const proxyBase = proxyMapping[proxyId];
      const proxiedUrl = proxyBase + encodeURIComponent(url);
      const response = await fetch(proxiedUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': window.location.origin
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const html = await response.text();
      
      // Process the HTML content
      let processedHtml = html.replace(/<base[^>]*>/g, '')
                             .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                             .replace(/<link[^>]*>/g, '');
      
      // Rewrite all URLs to go through our proxy
      processedHtml = processedHtml.replace(/(href|src|action)=(["'])(.*?)\2/g, function(match, attr, quote, value) {
        if (!value || value.startsWith('javascript:') || value.startsWith('#') || value.startsWith('data:')) {
          return match;
        }
        try {
          let fullUrl;
          if (value.startsWith('http')) {
            fullUrl = value;
          } else if (value.startsWith('//')) {
            fullUrl = 'https:' + value;
          } else {
            fullUrl = new URL(value, url).href;
          }
          return attr + '=' + quote + proxyBase + encodeURIComponent(fullUrl) + quote;
        } catch(e) {
          return match;
        }
      });

      // Add base tag and title
      processedHtml = '<base href="' + url + '">' + processedHtml;
      if (!/<title>/i.test(processedHtml)) {
        processedHtml = '<title>Aurora Gateway</title>' + processedHtml;
      }

      // Create wrapper element
      const wrapper = document.createElement('div');
      wrapper.className = 'aurora-content-wrapper';
      wrapper.style.cssText = 'width:100%;height:100%;overflow:auto;';
      wrapper.innerHTML = processedHtml;

      // Clear existing content and insert new content
      tabContent.innerHTML = '';
      tabContent.appendChild(wrapper);

      // Handle link clicks
      wrapper.addEventListener('click', function(e) {
        const anchor = e.target.closest('a');
        if (anchor && anchor.href) {
          e.preventDefault();
          let newUrl = anchor.href;
          if (!/^https?:\/\//i.test(newUrl)) {
            try {
              newUrl = new URL(newUrl, url).href;
            } catch(err) {
              return;
            }
          }
          // Remove proxy prefix if present
          for (const proxy of Object.values(proxyMapping)) {
            if (newUrl.startsWith(proxy)) {
              newUrl = decodeURIComponent(newUrl.substring(proxy.length));
              break;
            }
          }
          loadTabUrl(tabId, newUrl);
        }
      });

      // Handle form submissions
      wrapper.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          let action = form.action || url;
          // Remove proxy prefix if present
          for (const proxy of Object.values(proxyMapping)) {
            if (action.startsWith(proxy)) {
              action = decodeURIComponent(action.substring(proxy.length));
              break;
            }
          }
          const formData = new FormData(form);
          const params = new URLSearchParams(formData).toString();
          const method = (form.method || 'get').toLowerCase();
          
          if (method === 'get') {
            action += (action.includes('?') ? '&' : '?') + params;
            loadTabUrl(tabId, action);
          }
        });
      });

      // If we got here, the proxy worked
      if (proxyId !== settings.defaultProxy) {
        settings.defaultProxy = proxyId;
        saveStoredSettings(settings);
      }
      return;

    } catch (e) {
      error = e;
      console.warn(`Proxy ${proxyId} failed:`, e);
      continue;
    }
  }

  // If we get here, all proxies failed
  console.error('Error loading content:', error);
  tabContent.innerHTML = '<div style="color:red;padding:16px;">Error loading site: Could not load content through any available proxy. Please try again later.</div>';
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
  var settings = getStoredSettings();
  document.getElementById("defaultProxy").value = settings.defaultProxy;
  document.getElementById("loadModeSelect").value = settings.loadMode;
  document.getElementById("rewriteResourcesCheck").checked = settings.rewriteResources;
  document.getElementById("overrideDynamicCheck").checked = settings.overrideDynamic;
  document.getElementById("settingsModal").style.display = "flex";
}
function closeSettings() {
  document.getElementById("settingsModal").style.display = "none";
}
function saveSettingsAndClose() {
  var settings = {
    defaultProxy: document.getElementById("defaultProxy").value,
    loadMode: document.getElementById("loadModeSelect").value,
    rewriteResources: document.getElementById("rewriteResourcesCheck").checked,
    overrideDynamic: document.getElementById("overrideDynamicCheck").checked
  };
  saveStoredSettings(settings);
  closeSettings();
}

// ----- Navigation Buttons (Back/Forward) -----
function goBack() {
  alert("Back functionality not implemented yet.");
}
function goForward() {
  alert("Forward functionality not implemented yet.");
}

// ----- Proxy Mapping and Helpers (Advanced) -----
const proxyMapping = {
  "1": "https://api.allorigins.win/raw?url=",
  "2": "https://corsproxy.io/?url=",
  "3": "https://cors-anywhere.herokuapp.com/",
  "4": "https://api.cors.lol/?url="
 };

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

// ----- Expose functions globally -----
window.newTab = newTab;
window.switchTab = switchTab;
window.loadTabUrl = loadTabUrl;
window.loadActiveTab = loadActiveTab;
window.closeTab = closeTab;
window.toggleFavorites = toggleFavorites;
window.addCurrentToFavorites = addCurrentToFavorites;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettingsAndClose = saveSettingsAndClose;
window.goBack = goBack;
window.goForward = goForward;
window.loadInternalPageForTab = loadInternalPageForTab;
window.loadAuroraScript = loadAuroraScript;

// On window load, create a new internal tab with "Aurora://start" so that the start page loads.
window.addEventListener("load", async function() {
  // Hide settings modal and favorites panel on load
  var settingsModal = document.getElementById("settingsModal");
  if (settingsModal) settingsModal.style.display = "none";
  var favoritesPanel = document.getElementById("favoritesPanel");
  if (favoritesPanel) favoritesPanel.style.display = "none";

  // Check for ?proxy=...&url=... in the query string
  const params = new URLSearchParams(window.location.search);
  const proxy = params.get("proxy");
  const url = params.get("url");
  if (proxy && url) {
    // Fetch the proxied site and replace the whole document
    const proxyBase = proxyMapping[proxy] || proxyMapping["1"];
    try {
      const decodedUrl = decodeURIComponent(url);
      // Show the decoded URL in the URL bar
      if (document.getElementById("urlBar")) {
        document.getElementById("urlBar").value = decodedUrl;
      }
      const response = await fetch(proxyBase + encodeURIComponent(decodedUrl));
      const html = await response.text();
      document.open();
      document.write(html);
      document.close();
    } catch (e) {
      document.body.innerHTML = '<div style="color:red;padding:16px;">Error loading site: ' + e + '</div>';
    }
  } else {
    newTab("Aurora://start", true);
  }
});
