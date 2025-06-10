// core.js

// Global definitions
var tabs = [];
var activeTabId = null;
var tabCounter = 0;

// Favorites utilities
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
  tabElem.innerText = url ? (url.length > 20 ? url.substring(0, 20) + "..." : url) : "New Tab";
  tabElem.onclick = function() { switchTab(tabId); };
  document.getElementById("tabBar").appendChild(tabElem);
  
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
  tab.currentUrl = url;
  document.getElementById("tabNav_" + tabId).innerText =
    url.length > 20 ? url.substring(0, 20) + "..." : url;
  
  if (url.toLowerCase().startsWith("aurora://")) {
    tab.isInternal = true;
    loadInternalPageForTab(tabId, url.substring("aurora://".length));
  } else {
    tab.isInternal = false;
    if (!/^https?:\/\//i.test(url) && url.indexOf('.') === -1)
      url = "https://duckduckgo.com/?q=" + encodeURIComponent(url);
    else if (!/^https?:\/\//i.test(url))
      url = "http://" + url;
    loadExternalContentData(url);
  }
  document.getElementById("urlBar").value = url;
}
function loadActiveTab() {
  if (!window.activeTabId) return;
  var url = document.getElementById("urlBar").value.trim();
  loadTabUrl(window.activeTabId, url);
}
function closeTab() {
  if (!window.activeTabId) return;
  var tabElem = document.getElementById(window.activeTabId);
  var tabNav = document.getElementById("tabNav_" + window.activeTabId);
  if (tabElem) tabElem.remove();
  if (tabNav) tabNav.remove();
  tabs = tabs.filter(function(t) { return t.id !== window.activeTabId; });
  if (tabs.length > 0) {
    switchTab(tabs[0].id);
  } else {
    window.activeTabId = null;
    document.getElementById("urlBar").value = "";
  }
}
  
// ----- External Content Loader (Data Mode using document.write) -----
async function loadExternalContentData(url) {
  var settings = getStoredSettings();
  var proxyVal = settings.defaultProxy || "1";
  var proxyBase = proxyMapping[proxyVal] || proxyMapping["1"];
  try {
    var response = await fetch(proxyBase + encodeURIComponent(url));
    if (!response.ok) throw new Error("HTTP error " + response.status);
    var html = await response.text();
    html = forceBaseTag(html, url);
    html = rewriteResourceUrls(html, url, proxyBase);
    html = injectInterceptor(html, url, proxyBase, proxyVal);
    if (/<title>/i.test(html)) {
      html = html.replace(/<title>.*<\/title>/i, "<title>Aurora Gateway</title>");
    } else if (/<head>/i.test(html)) {
      html = html.replace(/<head>/i, "<head><title>Aurora Gateway</title>");
    } else {
      html = "<title>Aurora Gateway</title>" + html;
    }
    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    alert("Error loading site: " + error);
  }
}

// ----- Favorites Functions -----
function toggleFavorites() {
  var panel = document.getElementById("favoritesPanel");
  panel.style.display =
    (!panel.style.display || panel.style.display === "none") ? "block" : "none";
  if (panel.style.display === "block") renderFavorites();
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

window.newTab = newTab;
window.switchTab = switchTab;
window.loadTabUrl = loadTabUrl;
window.loadActiveTab = loadActiveTab;
window.closeTab = closeTab;
