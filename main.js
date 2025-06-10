// main.js

// ----- Proxy Mapping -----
const proxyMapping = {
  "1": "https://corsproxy.io/?url=",
  "2": "https://cors-anywhere.herokuapp.com/",
  "3": "https://thingproxy.freeboard.io/fetch/",
  "4": "https://api.allorigins.hexocode.repl.co/get?disableCache=true&url="
};

// ----- Global Variables for Tabs -----
let tabs = [];
let activeTabId = null;
let tabCounter = 0;

// ----- Settings & Favorites Utilities -----
function getStoredSettings() {
  const s = localStorage.getItem("Aurora.settings");
  return s ? JSON.parse(s) : { defaultProxy: "1", loadMode: "div", rewriteResources: true, overrideDynamic: true };
}
function saveStoredSettings(s) {
  localStorage.setItem("Aurora.settings", JSON.stringify(s));
}
function getFavorites() {
  const fav = localStorage.getItem("Aurora.favorites");
  return fav ? JSON.parse(fav) : [];
}
function saveFavorites(favArray) {
  localStorage.setItem("Aurora.favorites", JSON.stringify(favArray));
}

// ----- Tab Management -----
// Creates a new tab and adds it to the tab bar and content area.
function newTab(url = "", isInternal = false) {
  tabCounter++;
  const tabId = "tab" + tabCounter;
  let tab = { id: tabId, isInternal: isInternal, currentUrl: url };
  tabs.push(tab);
  
  // Create tab navigation element.
  const tabElem = document.createElement("div");
  tabElem.className = "tab";
  tabElem.id = "tabNav_" + tabId;
  tabElem.innerText = url ? (url.length > 20 ? url.substring(0, 20) + "..." : url) : "New Tab";
  tabElem.onclick = () => switchTab(tabId);
  document.getElementById("tabBar").appendChild(tabElem);
  
  // Create tab content container.
  const contentElem = document.createElement("div");
  contentElem.className = "tabContent";
  contentElem.id = tabId;
  contentElem.style.display = "none";
  if (!isInternal) {
    // External content will be loaded here in our custom div.
    contentElem.innerHTML = "<div class='external-content'></div>";
  } else {
    contentElem.innerHTML = "<div class='internal-content'></div>";
  }
  document.getElementById("content").appendChild(contentElem);
  
  switchTab(tabId);
  if (url) loadTabUrl(tabId, url);
}
function switchTab(tabId) {
  document.querySelectorAll(".tabContent").forEach(elem => { elem.style.display = "none"; });
  document.querySelectorAll(".tab").forEach(elem => { elem.classList.remove("activeTab"); });
  document.getElementById(tabId).style.display = "block";
  document.getElementById("tabNav_" + tabId).classList.add("activeTab");
  activeTabId = tabId;
  const tab = tabs.find(t => t.id === tabId);
  document.getElementById("urlBar").value = tab ? tab.currentUrl : "";
}
function loadTabUrl(tabId, url) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  tab.currentUrl = url;
  document.getElementById("tabNav_" + tabId).innerText = url.length > 20 ? url.substring(0,20) + "..." : url;
  
  if (url.toLowerCase().startsWith("aurora://")) {
    tab.isInternal = true;
    loadInternalPageForTab(tabId, url.substring("aurora://".length));
  } else {
    tab.isInternal = false;
    // Heuristic: if no protocol and no dot, assume search.
    if (!/^https?:\/\//i.test(url) && url.indexOf('.') === -1) {
      url = "https://duckduckgo.com/?q=" + encodeURIComponent(url);
    } else if (!/^https?:\/\//i.test(url)) {
      url = "http://" + url;
    }
    // Load external content using our fetch method.
    loadExternalContent(url, document.querySelector("#" + tabId + " .external-content"));
  }
  document.getElementById("urlBar").value = url;
}
function loadActiveTab() {
  if (!activeTabId) return;
  const url = document.getElementById("urlBar").value.trim();
  loadTabUrl(activeTabId, url);
}

// ----- External Content Loader -----
// Fetches external HTML via the proxy, processes it, and injects it into the container.
async function loadExternalContent(url, container) {
  if (!container) return; // Ensure container exists.
  
  const settings = getStoredSettings();
  const proxyVal = settings.defaultProxy || "1";
  const proxyBase = proxyMapping[proxyVal] || proxyMapping["1"];
  const targetUrl = url;
  try {
    const response = await fetch(proxyBase + encodeURIComponent(targetUrl));
    if (!response.ok) throw new Error("HTTP error " + response.status);
    let html = await response.text();
    // Process HTML: add base tag, rewrite resources, inject interceptor.
    html = forceBaseTag(html, targetUrl);
    if (settings.rewriteResources) {
      html = rewriteResourceUrls(html, targetUrl, proxyBase);
    }
    if (settings.overrideDynamic) {
      html = injectInterceptor(html, targetUrl, proxyBase, proxyVal);
    }
    // Extract body content.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const content = doc.body.innerHTML;
    container.innerHTML = content;
    // Execute inline scripts.
    executeScripts(container);
    document.title = "Aurora Gateway";
  } catch (error) {
    container.innerHTML = "Error loading site: " + error;
  }
}
// Helper: re-executes inline scripts in the container.
function executeScripts(element) {
  const scripts = element.querySelectorAll("script");
  scripts.forEach(oldScript => {
    const newScript = document.createElement("script");
    for (let i = 0; i < oldScript.attributes.length; i++) {
      newScript.setAttribute(oldScript.attributes[i].name, oldScript.attributes[i].value);
    }
    newScript.text = oldScript.text;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

// ----- Helper Functions for External Content Processing -----
function forceBaseTag(html, baseHref) {
  html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/i, "");
  return html.replace(/<head>/i, `<head><base href="${baseHref}">`);
}
function rewriteResourceUrls(html, baseHref, proxyBase) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = doc.querySelectorAll("[src], [href], [action]");
    elements.forEach(el => {
      if (el.tagName.toLowerCase() === "a") return;
      ["src", "href", "action"].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && !val.startsWith("data:") && !/^mailto:/.test(val) && !/^javascript:/.test(val)) {
          if (!/^https?:\/\//i.test(val) && !/^\/\//.test(val)) {
            try {
              const resolved = new URL(val, baseHref).href;
              el.setAttribute(attr, proxyBase + resolved);
            } catch(e){}
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
  return `<script>
(function(){
  const __ORIGINAL_URL = "${originalUrl}";
  const __PROXY_BASE = "${proxyBase}";
  const __PROXY_ID = "${proxyId}";
  try {
    const origReplaceState = history.replaceState;
    history.replaceState = function(...args){ try{ return origReplaceState.apply(history, args); } catch(e){ console.warn(e); } };
  } catch(e){}
  function handleNavigation(url) {
    if(url.startsWith("https://corsproxy.io/") || url.startsWith("https://cors-anywhere.herokuapp.com/") || url.startsWith("https://thingproxy.freeboard.io/fetch/")){
      try {
        const u = new URL(url);
        const orig = u.searchParams.get("url");
        if(orig){ url = orig; }
      } catch(e){}
    }
    if(!/^https?:\/\//i.test(url)){
      try{ url = new URL(url, __ORIGINAL_URL).href; } catch(e){}
    }
    const newUrl = window.location.origin + "/?proxy=" + __PROXY_ID + "&url=" + encodeURIComponent(url);
    window.location.href = newUrl;
  }
  window.location.assign = function(url){ handleNavigation(url); };
  window.location.replace = function(url){ handleNavigation(url); };
  window.open = function(url, name, specs){ handleNavigation(url); return null; };
  document.addEventListener("click", function(e){
    const anchor = e.target.closest("a");
    if(anchor && anchor.getAttribute("href")){
      e.preventDefault();
      handleNavigation(anchor.href);
    }
  }, true);
  const originalFetch = window.fetch;
  window.fetch = function(input, init){
    let url = typeof input === "string" ? input : (input instanceof Request ? input.url : "");
    if(!/^https?:\/\//i.test(url)){
      try{ url = new URL(url, __ORIGINAL_URL).href; } catch(e){}
    }
    return originalFetch(__PROXY_BASE + url, init);
  };
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password){
    if(!/^https?:\/\//i.test(url)){
      try{ url = new URL(url, __ORIGINAL_URL).href; } catch(e){}
    }
    return origOpen.call(this, method, __PROXY_BASE + url, async, user, password);
  };
})();
<\/script>`;
}
function injectInterceptor(html, originalUrl, proxyBase, proxyId) {
  const interceptorScript = getInterceptorScript(originalUrl, proxyBase, proxyId);
  if(/<\/body>/i.test(html))
    return html.replace(/<\/body>/i, interceptorScript + "</body>");
  else
    return html + interceptorScript;
}

// ----- Internal Page Routing for Tabs -----
function loadInternalPageForTab(tabId, cmd) {
  const container = document.getElementById("internal_" + tabId);
  if (!container) return;
  if (cmd.toLowerCase() === "start") {
    // Instead of embedding the markup in main.js, load aurora-start.js as a separate file.
    loadAuroraScript("aurora-start.js");
  } else {
    container.innerHTML = `<div class="aurora-page"><h2>Unknown Aurora Command</h2><p>${cmd}</p></div>`;
  }
}

// A helper to dynamically load an external script (for internal pages)
function loadAuroraScript(scriptName) {
  // Check if a previous aurora-script exists and remove it.
  const oldScript = document.getElementById("auroraScript");
  if (oldScript) oldScript.remove();
  const script = document.createElement("script");
  script.id = "auroraScript";
  script.src = "/" + scriptName;
  script.onload = () => { console.log(scriptName + " loaded"); };
  document.body.appendChild(script);
}

// ----- Favorites Functions -----
function toggleFavorites() {
  const favPanel = document.getElementById("favoritesPanel");
  favPanel.style.display = (!favPanel.style.display || favPanel.style.display === "none") ? "block" : "none";
  if (favPanel.style.display === "block") renderFavorites();
}
function renderFavorites() {
  const favList = getFavorites();
  const listEl = document.getElementById("favoritesList");
  listEl.innerHTML = "";
  favList.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    li.onclick = () => { document.getElementById("urlBar").value = item; toggleFavorites(); loadActiveTab(); };
    listEl.appendChild(li);
  });
}
function addCurrentToFavorites() {
  const url = document.getElementById("urlBar").value;
  if (!url) return;
  let favList = getFavorites();
  if (!favList.includes(url)) {
    favList.push(url);
    saveFavorites(favList);
    alert("Added to favorites!");
  } else {
    alert("Already in favorites.");
  }
}
function buildFavoritesPage() {
  const favList = getFavorites();
  let html = `<div class="aurora-page"><h2>Favorites</h2><ul>`;
  favList.forEach(fav => { 
    html += `<li onclick='document.getElementById("urlBar").value="${fav}";loadActiveTab();'>${fav}</li>`; 
  });
  html += `</ul></div>`;
  const container = document.getElementById("internal_" + activeTabId);
  if (container) container.innerHTML = html;
}

// ----- Settings Modal Functions -----
function openSettings() {
  const settings = getStoredSettings();
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
  const settings = {
    defaultProxy: document.getElementById("defaultProxy").value,
    loadMode: document.getElementById("loadModeSelect").value,
    rewriteResources: document.getElementById("rewriteResourcesCheck").checked,
    overrideDynamic: document.getElementById("overrideDynamicCheck").checked
  };
  saveStoredSettings(settings);
  closeSettings();
}

// ----- Navigation Functions (Back/Forward) -----
function goBack() {
  alert("Back functionality not implemented yet.");
}
function goForward() {
  alert("Forward functionality not implemented yet.");
}

// ----- On Load: Create Initial Tab with Aurora://start -----
window.addEventListener("load", () => {
  document.getElementById("urlBar").value = "Aurora://start";
  newTab("Aurora://start", true);
});
